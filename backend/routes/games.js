const express = require("express");
const Game = require("../models/Game");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();
const VALID_RESULTS = new Set(["white", "black", "draw"]);
const VALID_COLORS = new Set(["w", "b"]);

// Get user's completed game history
router.get("/history", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const targetUserId = req.query.userId || req.user.userId;

    if (String(targetUserId) !== String(req.user.userId)) {
      const targetUser = await User.findById(targetUserId).select(
        "privacy friends",
      );
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const isFriend = targetUser.friends.some(
        (friendId) => String(friendId) === String(req.user.userId),
      );
      if (targetUser.privacy?.gameHistory === false && !isFriend) {
        return res.status(403).json({ message: "This player's game history is private" });
      }
    }

    const query = {
      result: { $ne: "ongoing" },
      $or: [{ whitePlayer: targetUserId }, { blackPlayer: targetUserId }],
    };

    const games = await Game.find(query)
      .populate("whitePlayer", "username")
      .populate("blackPlayer", "username")
      .populate("winner", "username")
      .sort({ endTime: -1, startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Game.countDocuments(query);

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

// Record a completed game
router.post("/record", auth, async (req, res) => {
  try {
    const {
      moves,
      aiOpponent = false,
      aiDifficulty = 0,
      playerColor = "w",
      result,
      winnerColor,
      duration,
    } = req.body;

    if (!Array.isArray(moves)) {
      return res.status(400).json({ message: "Moves are required" });
    }
    if (moves.length > 500) {
      return res.status(400).json({ message: "Too many moves" });
    }
    if (!VALID_RESULTS.has(result)) {
      return res.status(400).json({ message: "Invalid game result" });
    }
    if (!VALID_COLORS.has(playerColor)) {
      return res.status(400).json({ message: "Invalid player color" });
    }

    const gameData = {
      moves: moves.map((move) => ({
        from: String(move.from || ""),
        to: String(move.to || ""),
        piece: String(move.piece || ""),
        promotion: move.promotion ? String(move.promotion) : undefined,
        timestamp: move.timestamp ? new Date(move.timestamp) : new Date(),
      })),
      aiOpponent: Boolean(aiOpponent),
      aiDifficulty: Number(aiDifficulty) || 0,
      playerColor,
      result,
      duration: duration == null ? null : Number(duration),
      endTime: new Date(),
    };

    if (playerColor === "w") {
      gameData.whitePlayer = req.user.userId;
    } else {
      gameData.blackPlayer = req.user.userId;
    }

    if (winnerColor === playerColor) {
      gameData.winner = req.user.userId;
    }

    if (result === "draw") {
      gameData.winner = null;
    }

    const game = new Game(gameData);
    await game.save();

    res.status(201).json({ game });
  } catch (error) {
    console.error("Record game error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get leaderboard
router.get("/leaderboard", auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const leaderboard = await User.find()
      .sort({ gamesWon: -1, rating: -1, gamesPlayed: -1, username: 1 })
      .limit(limit)
      .select("username gamesPlayed gamesWon rating");

    const currentUser = await User.findById(req.user.userId).select(
      "username gamesPlayed gamesWon rating",
    );

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const rank =
      (await User.countDocuments({
        $or: [
          { gamesWon: { $gt: currentUser.gamesWon } },
          {
            gamesWon: currentUser.gamesWon,
            rating: { $gt: currentUser.rating },
          },
        ],
      })) + 1;

    res.json({
      leaderboard,
      currentUser: {
        username: currentUser.username,
        gamesPlayed: currentUser.gamesPlayed,
        gamesWon: currentUser.gamesWon,
        rating: currentUser.rating,
        rank,
      },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
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
