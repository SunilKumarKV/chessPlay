const express = require("express");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const Tournament = require("../models/Tournament");
const User = require("../models/User");
const AdminAuditLog = require("../models/AdminAuditLog");
const { getJwtSecret, getRequestAccessToken, sanitizeText } = require("../utils/security");

const router = express.Router();

const tournamentActionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many tournament actions. Please try again later." },
});

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

async function optionalAuth(req, _res, next) {
  try {
    const token = getRequestAccessToken(req);
    if (!token) return next();
    const decoded = jwt.verify(token, getJwtSecret("access"));
    if (decoded?.userId) req.user = decoded;
  } catch {
    // Public tournament browsing should keep working even if an old session exists.
  }
  next();
}

function isParticipant(tournament, userId) {
  if (!userId) return false;
  return (tournament.players || []).some((entry) => String(entry.user?._id || entry.user) === String(userId) && entry.status !== "withdrawn");
}

function participantCount(tournament) {
  return (tournament.players || []).filter((entry) => entry.status !== "withdrawn").length;
}

function publicParticipant(entry) {
  const user = entry.user || {};
  return {
    username: user.username || "ChessPlayer",
    rating: user.rating || user.rapidRating || user.blitzRating || 1200,
    supporterBadge: Boolean(user.isSupporter || user.isPremium),
    joinedAt: entry.joinedAt,
    status: entry.status,
  };
}

function publicTournament(tournament, viewerId = null) {
  const activePlayers = (tournament.players || []).filter((entry) => entry.status !== "withdrawn");
  return {
    _id: tournament._id,
    title: tournament.title,
    description: tournament.description,
    format: tournament.format,
    status: tournament.status,
    startsAt: tournament.startsAt,
    endsAt: tournament.endsAt,
    maxPlayers: tournament.maxPlayers,
    playerCount: activePlayers.length,
    players: activePlayers.map(publicParticipant),
    rules: tournament.rules,
    isJoined: Boolean(viewerId && isParticipant(tournament, viewerId)),
    roadmap: [
      "Phase 1: Registration",
      "Phase 2: Pairings",
      "Phase 3: Live tournament rooms",
      "Phase 4: Results and rankings",
    ],
  };
}

async function writeAudit(req, action, resourceId, metadata = {}) {
  try {
    await AdminAuditLog.create({
      actor: req.user?.userId || null,
      action,
      resourceType: "Tournament",
      resourceId,
      metadata,
      ip: req.ip,
      userAgent: req.get("user-agent") || "",
    });
  } catch {
    // Audit failure should not break user-facing tournament registration.
  }
}

router.get("/", optionalAuth, async (req, res) => {
  const allowedStatuses = ["upcoming", "open", "active", "completed", "cancelled"];
  const status = allowedStatuses.includes(req.query.status) ? req.query.status : null;
  const query = { isPublished: true };
  if (status) query.status = status;
  else query.status = { $in: allowedStatuses };

  const tournaments = await Tournament.find(query)
    .sort({ startsAt: 1 })
    .limit(50)
    .populate("players.user", "username rating rapidRating blitzRating isSupporter isPremium")
    .lean();

  res.json({ tournaments: tournaments.map((tournament) => publicTournament(tournament, req.user?.userId || null)) });
});

router.get("/:id", optionalAuth, async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid tournament ID." });
  const tournament = await Tournament.findOne({ _id: req.params.id, isPublished: true })
    .populate("players.user", "username rating rapidRating blitzRating isSupporter isPremium")
    .lean();
  if (!tournament) return res.status(404).json({ message: "Tournament not found." });
  res.json({ tournament: publicTournament(tournament, req.user?.userId || null) });
});

router.post("/:id/join", auth, tournamentActionLimiter, async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid tournament ID." });
  const tournament = await Tournament.findOne({ _id: req.params.id, isPublished: true });
  if (!tournament) return res.status(404).json({ message: "Tournament not found." });
  if (tournament.status !== "open") return res.status(409).json({ message: "This tournament is not open for registration." });
  if (isParticipant(tournament, req.user.userId)) return res.status(409).json({ message: "You already joined this tournament." });
  if (participantCount(tournament) >= tournament.maxPlayers) return res.status(409).json({ message: "This tournament is full." });

  tournament.players.push({ user: req.user.userId, status: "joined" });
  await tournament.save();
  await writeAudit(req, "tournament_joined", tournament._id, { status: tournament.status });

  const populated = await Tournament.findById(tournament._id)
    .populate("players.user", "username rating rapidRating blitzRating isSupporter isPremium")
    .lean();

  res.json({ message: "Joined tournament successfully.", tournament: publicTournament(populated, req.user.userId) });
});

router.post("/:id/leave", auth, tournamentActionLimiter, async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid tournament ID." });
  const tournament = await Tournament.findOne({ _id: req.params.id, isPublished: true });
  if (!tournament) return res.status(404).json({ message: "Tournament not found." });
  if (!["upcoming", "open"].includes(tournament.status)) return res.status(409).json({ message: "You can leave only before the tournament starts." });

  const player = tournament.players.find((entry) => String(entry.user) === String(req.user.userId) && entry.status !== "withdrawn");
  if (!player) return res.status(404).json({ message: "You are not registered for this tournament." });
  player.status = "withdrawn";
  await tournament.save();
  await writeAudit(req, "tournament_left", tournament._id, { status: tournament.status });

  const populated = await Tournament.findById(tournament._id)
    .populate("players.user", "username rating rapidRating blitzRating isSupporter isPremium")
    .lean();

  res.json({ message: "Left tournament successfully.", tournament: publicTournament(populated, req.user.userId) });
});

router.post("/", auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select("isAdmin");
  if (!user?.isAdmin) return res.status(403).json({ message: "Admin access required." });

  const title = sanitizeText(req.body.title, 100);
  if (!title) return res.status(400).json({ message: "Tournament title is required." });

  const format = ["rapid", "blitz", "bullet", "classical", "casual"].includes(req.body.format) ? req.body.format : "rapid";
  const status = ["draft", "upcoming", "open"].includes(req.body.status) ? req.body.status : "draft";
  const maxPlayers = Math.min(512, Math.max(2, Number(req.body.maxPlayers || 32)));
  const startsAt = new Date(req.body.startsAt || Date.now() + 24 * 60 * 60 * 1000);
  if (Number.isNaN(startsAt.getTime())) return res.status(400).json({ message: "Valid start date is required." });

  const tournament = await Tournament.create({
    title,
    description: sanitizeText(req.body.description, 1000),
    format,
    status,
    startsAt,
    endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
    maxPlayers,
    rules: sanitizeText(req.body.rules, 2000),
    isPublished: Boolean(req.body.isPublished),
    createdBy: req.user.userId,
  });
  await writeAudit(req, "tournament_created", tournament._id, { status, format });
  res.status(201).json({ tournament: publicTournament(tournament.toObject(), req.user.userId) });
});

module.exports = router;
