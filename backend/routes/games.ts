import express, { type Request, type Response } from "express";
import Game = require("../models/Game");
import User = require("../models/User");
import auth = require("../middleware/auth");

type AuthenticatedRequest = Request & {
  user?: {
    userId: string;
    username?: string;
    type?: string;
  };
};

type GameMoveInput = {
  from?: unknown;
  to?: unknown;
  piece?: unknown;
  promotion?: unknown;
  timestamp?: unknown;
};

type RecordGameBody = {
  moves?: GameMoveInput[];
  aiOpponent?: unknown;
  aiDifficulty?: unknown;
  playerColor?: string;
  result?: string;
  winnerColor?: string;
  duration?: unknown;
};

type LeaderboardMode = "all" | "rating" | "wins" | "gamesPlayed";

const router = express.Router();
const VALID_RESULTS = new Set(["white", "black", "draw"]);
const VALID_COLORS = new Set(["w", "b"]);
const MAX_PAGE_SIZE = 50;

function parsePositiveInt(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requestUserId(req: AuthenticatedRequest) {
  return String(req.user?.userId || "");
}

function normalizeMove(move: GameMoveInput) {
  return {
    from: String(move.from || ""),
    to: String(move.to || ""),
    piece: String(move.piece || ""),
    promotion: move.promotion ? String(move.promotion) : undefined,
    timestamp: move.timestamp ? new Date(String(move.timestamp)) : new Date(),
  };
}

// Get user's completed game history
router.get("/history", auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10, MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;
    const currentUserId = requestUserId(req);
    const targetUserId = req.query.userId || currentUserId;

    if (String(targetUserId) !== String(currentUserId)) {
      const targetUser = await User.findById(targetUserId).select(
        "privacy friends",
      );
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const isFriend = targetUser.friends.some(
        (friendId: unknown) => String(friendId) === String(currentUserId),
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
router.post("/record", auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      moves,
      aiOpponent = false,
      aiDifficulty = 0,
      playerColor = "w",
      result,
      winnerColor,
      duration,
    } = req.body as RecordGameBody;

    if (!Array.isArray(moves)) {
      return res.status(400).json({ message: "Moves are required" });
    }
    if (moves.length > 500) {
      return res.status(400).json({ message: "Too many moves" });
    }
    if (!VALID_RESULTS.has(String(result))) {
      return res.status(400).json({ message: "Invalid game result" });
    }
    if (!VALID_COLORS.has(playerColor)) {
      return res.status(400).json({ message: "Invalid player color" });
    }

    const gameData: Record<string, unknown> = {
      moves: moves.map(normalizeMove),
      aiOpponent: Boolean(aiOpponent),
      aiDifficulty: Number(aiDifficulty) || 0,
      playerColor,
      result,
      duration: duration == null ? null : Number(duration),
      endTime: new Date(),
    };

    if (playerColor === "w") {
      gameData.whitePlayer = requestUserId(req);
    } else {
      gameData.blackPlayer = requestUserId(req);
    }

    if (winnerColor === playerColor) {
      gameData.winner = requestUserId(req);
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

// Get public leaderboard
router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 50, MAX_PAGE_SIZE);
    const allowedModes = new Set<LeaderboardMode>(["all", "rating", "wins", "gamesPlayed"]);
    const requestedMode = String(req.query.mode || "").trim() as LeaderboardMode;
    const mode = allowedModes.has(requestedMode) ? requestedMode : "all";
    const search = String(req.query.search || "").trim().slice(0, 40);

    const query: Record<string, unknown> = { deletedAt: null, isBanned: { $ne: true } };
    if (search) {
      query.username = { $regex: escapeRegExp(search), $options: "i" };
    }

    const sortByMode: Record<LeaderboardMode, Record<string, 1 | -1>> = {
      all: { rating: -1, gamesWon: -1, gamesPlayed: -1, username: 1 },
      rating: { rating: -1, gamesWon: -1, gamesPlayed: -1, username: 1 },
      wins: { gamesWon: -1, rating: -1, gamesPlayed: -1, username: 1 },
      gamesPlayed: { gamesPlayed: -1, rating: -1, gamesWon: -1, username: 1 },
    };

    const users = await User.find(query)
      .sort(sortByMode[mode])
      .limit(limit)
      .select("username gamesPlayed gamesWon gamesLost gamesDrawn rating isSupporter isPremium adsDisabled settings badges")
      .lean();

    const leaderboard = users.map((player: any, index: number) => ({
      rank: index + 1,
      username: player.username,
      rating: Number.isFinite(player.rating) ? player.rating : null,
      wins: player.gamesWon || 0,
      losses: player.gamesLost || 0,
      draws: player.gamesDrawn || 0,
      gamesPlayed: player.gamesPlayed || 0,
      isSupporter: Boolean(player.isSupporter || player.isPremium),
      adsDisabled: Boolean(player.adsDisabled),
      selectedBadge: player.settings?.appearance?.selectedBadge || player.badges?.selected || (player.isSupporter || player.isPremium ? "supporter" : "new-player"),
    }));

    res.set("Cache-Control", "public, max-age=30");
    res.json({ leaderboard, meta: { limit, mode, search } });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Unable to load leaderboard" });
  }
});

// Get specific game details
router.get("/:gameId", auth, async (req: AuthenticatedRequest, res: Response) => {
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
      game.whitePlayer._id.toString() !== requestUserId(req) &&
      (!game.blackPlayer || game.blackPlayer._id.toString() !== requestUserId(req))
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ game });
  } catch (error) {
    console.error("Game details error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export = router;
