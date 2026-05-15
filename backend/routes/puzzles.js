const express = require("express");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const Puzzle = require("../models/Puzzle");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();
const VALID_DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);
const VALID_THEMES = new Set(["checkmate", "forks", "pins", "skewers", "endgames", "opening-traps", "mixed"]);

const attemptLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

function normalizeUci(value) {
  return String(value || "").trim().toLowerCase().slice(0, 5);
}

function publicPuzzle(puzzle) {
  return {
    id: puzzle._id,
    title: puzzle.title,
    fen: puzzle.fen,
    difficulty: puzzle.difficulty,
    theme: puzzle.theme,
    instruction: puzzle.instruction || "Find the best move.",
    moves: puzzle.moves || [],
    solutionLength: Array.isArray(puzzle.solution) ? puzzle.solution.length : 0,
    attempts: puzzle.attempts || 0,
    solves: puzzle.solves || 0,
    createdAt: puzzle.createdAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const filter = { isPublished: true };
    if (VALID_DIFFICULTIES.has(req.query.difficulty)) filter.difficulty = req.query.difficulty;
    if (VALID_THEMES.has(req.query.theme)) filter.theme = req.query.theme;

    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 50);
    const puzzles = await Puzzle.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("title fen moves solution difficulty theme instruction attempts solves createdAt");

    res.json({ puzzles: puzzles.map(publicPuzzle) });
  } catch (error) {
    res.status(500).json({ message: "Unable to load puzzles. Please try again." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid puzzle id." });
    }
    const puzzle = await Puzzle.findOne({ _id: req.params.id, isPublished: true })
      .select("title fen moves solution difficulty theme instruction attempts solves createdAt");
    if (!puzzle) return res.status(404).json({ message: "Puzzle not found." });
    res.json({ puzzle: publicPuzzle(puzzle) });
  } catch (error) {
    res.status(500).json({ message: "Unable to load puzzle. Please try again." });
  }
});

router.post("/:id/attempt", auth, attemptLimiter, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid puzzle id." });
    }

    const move = normalizeUci(req.body.move);
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
      return res.status(400).json({ message: "Submit a valid chess move." });
    }

    const puzzle = await Puzzle.findOne({ _id: req.params.id, isPublished: true });
    if (!puzzle) return res.status(404).json({ message: "Puzzle not found." });

    const expected = normalizeUci((puzzle.solution || [])[0] || (puzzle.moves || [])[0]);
    const correct = move === expected;
    puzzle.attempts = (puzzle.attempts || 0) + 1;
    if (correct) puzzle.solves = (puzzle.solves || 0) + 1;
    await puzzle.save();

    if (correct) {
      await User.findByIdAndUpdate(req.user.userId, {
        $inc: { puzzlesSolved: 1 },
        $max: { highestPuzzleRating: 1200 },
      }).catch(() => {});
    }

    res.json({
      correct,
      message: correct ? "Correct move. Puzzle completed." : "Try again. Look for the tactic in the position.",
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to save puzzle attempt. Please try again." });
  }
});

module.exports = router;
