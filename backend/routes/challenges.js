const crypto = require("crypto");
const express = require("express");
const jwt = require("jsonwebtoken");
const { Chess } = require("chess.js");
const DailyChallenge = require("../models/DailyChallenge");
const DailyChallengeAttempt = require("../models/DailyChallengeAttempt");
const Puzzle = require("../models/Puzzle");
const User = require("../models/User");
const { validateBody } = require("../middleware/validate");
const { getJwtSecret, getRequestAccessToken } = require("../utils/security");
const logger = require("../utils/safeLogger");

const router = express.Router();

function normalizeUci(value) {
  return String(value || "").trim().toLowerCase().slice(0, 5);
}

function isValidUci(move) {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move);
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function ownerFromRequest(req) {
  if (req.challengeUser) {
    return {
      ownerType: "user",
      ownerKey: `user:${req.challengeUser._id}`,
      userId: req.challengeUser._id,
      guestKey: "",
    };
  }

  const fingerprint = [
    req.ip,
    req.headers["x-forwarded-for"] || "",
    req.headers["user-agent"] || "",
  ].join("|");
  const guestKey = crypto.createHash("sha256").update(fingerprint).digest("hex");
  return {
    ownerType: "guest",
    ownerKey: `guest:${guestKey}`,
    userId: null,
    guestKey,
  };
}

async function optionalAuth(req, _res, next) {
  const token = getRequestAccessToken(req);
  if (!token) return next();
  try {
    const secret = getJwtSecret("access");
    if (!secret) return next();
    const decoded = jwt.verify(token, secret);
    const userId = decoded?.userId || decoded?.id;
    if (!userId) return next();
    req.challengeUser = await User.findById(userId).select("plan supporterPlan isPremium isSupporter");
  } catch {
    req.challengeUser = null;
  }
  next();
}

async function loadTodayChallenge() {
  let challenge = await DailyChallenge.findOne({ dateKey: dateKey() });
  if (challenge) return challenge;

  let defaultChallenge = {
    dateKey: dateKey(),
    fen: "r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3",
    solution: ["d2d4"],
    difficulty: "beginner",
    title: "Daily Challenge",
    description: "Start the day with a tactical chess challenge.",
  };

  try {
    const puzzle = await Puzzle.findOne({ difficulty: "beginner" }).sort({ createdAt: 1 }).lean();
    if (puzzle && Array.isArray(puzzle.moves) && puzzle.moves.length > 0 && puzzle.fen) {
      defaultChallenge = {
        dateKey: dateKey(),
        fen: puzzle.fen,
        solution: puzzle.moves.map((move) => normalizeUci(move)).filter(Boolean),
        difficulty: puzzle.difficulty || "beginner",
        title: "Daily Challenge",
        description: "Solve today’s chess challenge.",
      };
    }
  } catch (error) {
    logger.error("Daily challenge fallback puzzle load failed:", error.message);
  }

  challenge = await DailyChallenge.create(defaultChallenge);
  return challenge;
}

function buildGameFromChallenge(challenge, moves = []) {
  const game = new Chess(challenge.fen);
  for (const move of moves || []) {
    const uci = normalizeUci(move);
    if (!uci) throw new Error("Invalid challenge attempt move.");
    const promotion = uci.length === 5 ? uci[4] : undefined;
    const applied = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion });
    if (!applied) throw new Error("Attempt history contains illegal move.");
  }
  return game;
}

function publicChallenge(challenge) {
  if (!challenge) return null;
  return {
    id: challenge._id,
    dateKey: challenge.dateKey,
    fen: challenge.fen,
    solutionLength: Array.isArray(challenge.solution) ? challenge.solution.length : 0,
    difficulty: challenge.difficulty,
    title: challenge.title,
    description: challenge.description,
  };
}

function publicAttempt(attempt) {
  if (!attempt) return null;
  return {
    id: attempt._id,
    challengeId: attempt.challengeId,
    ownerType: attempt.ownerType,
    status: attempt.status,
    currentIndex: attempt.currentIndex,
    moves: attempt.moves || [],
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
  };
}

const validateChallengeMove = validateBody({
  from: { required: true, max: 2, pattern: /^[a-h][1-8]$/i },
  to: { required: true, max: 2, pattern: /^[a-h][1-8]$/i },
  promotion: { max: 1, pattern: /^[qrbn]$/i },
});

router.use(optionalAuth);

router.get("/today", async (req, res) => {
  try {
    const owner = ownerFromRequest(req);
    const challenge = await loadTodayChallenge();
    const attempt = await DailyChallengeAttempt.findOne({ ownerKey: owner.ownerKey, challengeId: challenge._id }).lean();
    res.json({ challenge: publicChallenge(challenge), attempt: publicAttempt(attempt) });
  } catch (error) {
    logger.error("Failed to load today challenge:", error.message);
    res.status(500).json({ message: "Unable to load today’s challenge." });
  }
});

router.post("/today/attempt", async (req, res) => {
  try {
    const owner = ownerFromRequest(req);
    const challenge = await loadTodayChallenge();
    const attempt = await DailyChallengeAttempt.findOneAndUpdate(
      { ownerKey: owner.ownerKey, challengeId: challenge._id },
      {
        $setOnInsert: {
          ownerType: owner.ownerType,
          ownerKey: owner.ownerKey,
          user: owner.userId,
          guestKey: owner.guestKey,
          challengeId: challenge._id,
          status: "in_progress",
          currentIndex: 0,
          moves: [],
          startedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );
    res.json({ challenge: publicChallenge(challenge), attempt: publicAttempt(attempt) });
  } catch (error) {
    logger.error("Failed to create challenge attempt:", error.message);
    res.status(500).json({ message: "Unable to start today’s challenge." });
  }
});

router.post("/today/move", validateChallengeMove, async (req, res) => {
  try {
    const owner = ownerFromRequest(req);
    const challenge = await loadTodayChallenge();
    const move = normalizeUci(`${req.body.from}${req.body.to}${req.body.promotion || ""}`);
    if (!isValidUci(move)) {
      return res.status(400).json({ message: "Submit a valid move." });
    }

    let attempt = await DailyChallengeAttempt.findOne({ ownerKey: owner.ownerKey, challengeId: challenge._id });
    if (!attempt) {
      attempt = await DailyChallengeAttempt.create({
        ownerType: owner.ownerType,
        ownerKey: owner.ownerKey,
        user: owner.userId,
        guestKey: owner.guestKey,
        challengeId: challenge._id,
        status: "in_progress",
        currentIndex: 0,
        moves: [],
        startedAt: new Date(),
      });
    }

    if (attempt.status === "solved") {
      return res.json({
        valid: false,
        message: "You already solved today’s challenge.",
        challenge: publicChallenge(challenge),
        attempt: publicAttempt(attempt),
      });
    }

    const expected = normalizeUci(challenge.solution?.[attempt.currentIndex]);
    if (!expected) {
      return res.status(500).json({ message: "Today’s challenge is not configured correctly." });
    }

    const game = buildGameFromChallenge(challenge, attempt.moves);
    const promotion = move.length === 5 ? move[4] : undefined;
    const applied = game.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion });
    if (!applied) {
      return res.status(400).json({ message: "Illegal move." });
    }

    const appliedUci = normalizeUci(`${applied.from}${applied.to}${applied.promotion || ""}`);
    if (appliedUci !== expected) {
      return res.status(200).json({
        valid: false,
        message: "Incorrect move. Try again.",
        challenge: publicChallenge(challenge),
        attempt: publicAttempt(attempt),
      });
    }

    attempt.moves = Array.isArray(attempt.moves) ? [...attempt.moves, appliedUci] : [appliedUci];
    attempt.currentIndex = (attempt.currentIndex || 0) + 1;
    if (attempt.currentIndex >= (challenge.solution || []).length) {
      attempt.status = "solved";
      attempt.completedAt = new Date();
    }

    await attempt.save();

    res.json({
      valid: true,
      message: attempt.status === "solved" ? "Challenge solved!" : "Correct move.",
      challenge: publicChallenge(challenge),
      attempt: publicAttempt(attempt),
    });
  } catch (error) {
    logger.error("Failed to validate challenge move:", error.message);
    res.status(500).json({ message: "Unable to validate the challenge move." });
  }
});

module.exports = router;
