const express = require("express");
const Game = require("../models/Game");
const auth = require("../middleware/auth");

const router = express.Router();

// Get user's game history
router.get("/history", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const games = await Game.find({
      $or: [{ whitePlayer: req.user.userId }, { blackPlayer: req.user.userId }],
    })
      .populate("whitePlayer", "username")
      .populate("blackPlayer", "username")
      .populate("winner", "username")
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Game.countDocuments({
      $or: [{ whitePlayer: req.user.userId }, { blackPlayer: req.user.userId }],
    });

    res.json({
      games,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Game history error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get specific game details
router.get("/:gameId", auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId)
      .populate("whitePlayer", "username")
      .populate("blackPlayer", "username")
      .populate("winner", "username");

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    // Check if user is a participant
    if (
      game.whitePlayer._id.toString() !== req.user.userId &&
      (!game.blackPlayer || game.blackPlayer._id.toString() !== req.user.userId)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ game });
  } catch (error) {
    console.error("Game details error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
