const express = require("express");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const { Chess } = require("chess.js");
const auth = require("../middleware/auth");
const AnalysisNote = require("../models/AnalysisNote");
const GameAnalysis = require("../models/GameAnalysis");

const router = express.Router();

const noteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

function safeString(value, max = 2000) {
  return String(value || "").trim().slice(0, max);
}

function validateFen(fen) {
  const value = safeString(fen, 120);
  if (!value) return "";
  try {
    return new Chess(value).fen();
  } catch {
    return null;
  }
}

function validatePgn(pgn) {
  const value = safeString(pgn, 12000);
  if (!value) return "";
  try {
    const game = new Chess();
    game.loadPgn(value);
    return value;
  } catch {
    return null;
  }
}

router.get("/notes/:gameId", auth, async (req, res) => {
  try {
    const gameId = safeString(req.params.gameId, 120) || "manual";
    const note = await AnalysisNote.findOne({ user: req.user.userId, gameId })
      .select("gameId fen pgn note updatedAt createdAt");
    res.json({ note: note || null });
  } catch {
    res.status(500).json({ message: "Unable to load analysis notes. Please try again." });
  }
});

router.post("/notes", auth, noteLimiter, async (req, res) => {
  try {
    const gameId = safeString(req.body.gameId, 120) || "manual";
    const noteText = safeString(req.body.note, 2000);
    const fen = validateFen(req.body.fen);
    const pgn = validatePgn(req.body.pgn);

    if (fen === null) return res.status(400).json({ message: "Invalid FEN position." });
    if (pgn === null) return res.status(400).json({ message: "Invalid PGN text." });
    if (noteText.length > 2000) return res.status(400).json({ message: "Analysis note is too long." });

    const note = await AnalysisNote.findOneAndUpdate(
      { user: req.user.userId, gameId },
      { user: req.user.userId, gameId, fen, pgn, note: noteText, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).select("gameId fen pgn note updatedAt createdAt");

    res.json({ note, message: "Analysis notes saved." });
  } catch {
    res.status(500).json({ message: "Unable to save analysis notes. Please try again." });
  }
});

router.get("/reports/:gameId", auth, async (req, res) => {
  try {
    const gameId = safeString(req.params.gameId, 120);
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.json({ report: null, placeholder: true, message: "Premium analysis reports are planned for saved games." });
    }
    const report = await GameAnalysis.findOne({ user: req.user.userId, game: gameId }).lean();
    res.json({
      report,
      placeholder: !report,
      message: report ? "Analysis report loaded." : "Premium analysis reports are planned. Heavy server-side engine analysis is not enabled yet.",
    });
  } catch {
    res.status(500).json({ message: "Unable to load analysis report." });
  }
});

module.exports = router;
