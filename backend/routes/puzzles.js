const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Chess } = require("chess.js");
const Puzzle = require("../models/Puzzle");
const PuzzleAttempt = require("../models/PuzzleAttempt");
const PuzzleDailyUsage = require("../models/PuzzleDailyUsage");
const User = require("../models/User");
const { getJwtSecret, getRequestAccessToken } = require("../utils/security");

const router = express.Router();
const VALID_DIFFICULTIES = new Set(["beginner", "intermediate", "advanced", "master"]);
const PREMIUM_DIFFICULTIES = new Set(["advanced", "master"]);
const PLAN_LIMITS = {
  guest: 2,
  free: 5,
  premium_basic: 25,
  premium_pro: 100,
  premium_lifetime: 200,
};

const attemptLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

function normalizeUci(value) {
  return String(value || "").trim().toLowerCase().slice(0, 5);
}

function isValidUci(move) {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move);
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function difficultyFromRating(rating) {
  const value = Number(rating) || 0;
  if (value <= 1100) return "beginner";
  if (value <= 1700) return "intermediate";
  if (value <= 2400) return "advanced";
  return "master";
}

function userPlan(user) {
  if (!user) return "guest";
  if (user.plan === "pro" || user.supporterPlan === "pro") return "premium_pro";
  if (user.plan === "premium" || user.supporterPlan === "premium") return "premium_pro";
  if (user.plan === "lifetime" || user.supporterPlan === "lifetime" || user.plan === "supporter_yearly" || user.supporterPlan === "supporter_yearly") return "premium_lifetime";
  if (user.isPremium || user.isSupporter || user.plan === "supporter_monthly" || user.supporterPlan === "supporter_monthly") {
    return "premium_basic";
  }
  return "free";
}

function ownerFromRequest(req) {
  if (req.puzzleUser) {
    return {
      ownerType: "user",
      ownerKey: `user:${req.puzzleUser._id}`,
      userId: req.puzzleUser._id,
      guestKey: "",
      plan: userPlan(req.puzzleUser),
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
    plan: "guest",
  };
}

function limitPayload(owner, usage) {
  const limit = PLAN_LIMITS[owner.plan] ?? PLAN_LIMITS.guest;
  const used = usage?.used || 0;
  return {
    plan: owner.plan,
    dateKey: dateKey(),
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    isPremium: owner.plan.startsWith("premium_"),
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
    req.puzzleUser = await User.findById(userId).select(
      "plan supporterPlan isPremium isSupporter puzzlesSolved puzzleRating highestPuzzleRating",
    );
  } catch {
    req.puzzleUser = null;
  }
  next();
}

router.use(optionalAuth);

async function getTodayUsage(owner) {
  const limit = PLAN_LIMITS[owner.plan] ?? PLAN_LIMITS.guest;
  return PuzzleDailyUsage.findOneAndUpdate(
    { ownerKey: owner.ownerKey, dateKey: dateKey() },
    {
      $setOnInsert: {
        ownerType: owner.ownerType,
        user: owner.userId,
        guestKey: owner.guestKey,
        dateKey: dateKey(),
        used: 0,
        puzzleIds: [],
      },
      $set: { plan: owner.plan, limit },
    },
    { new: true, upsert: true },
  );
}

function applyUci(game, move) {
  const uci = normalizeUci(move);
  if (!isValidUci(uci)) return null;
  try {
    return game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
  } catch {
    return null;
  }
}

function presentedPosition(puzzle) {
  const game = new Chess(puzzle.fen);
  const initialMove = normalizeUci(puzzle.moves?.[0]);
  let nextMoveIndex = 0;
  if (initialMove && applyUci(game, initialMove)) {
    nextMoveIndex = 1;
  }
  return { fen: game.fen(), nextMoveIndex, initialMove };
}

function buildGameAtIndex(puzzle, moveIndex) {
  const game = new Chess(puzzle.fen);
  for (let index = 0; index < moveIndex; index += 1) {
    if (!applyUci(game, puzzle.moves[index])) {
      throw new Error("Puzzle line is not legal.");
    }
  }
  return game;
}

function primaryTheme(puzzle) {
  const themes = Array.isArray(puzzle.themes) ? puzzle.themes : [];
  return themes.find((theme) => !["short", "long", "veryLong", "middlegame", "endgame", "opening"].includes(theme)) || themes[0] || "tactic";
}

function explanationFor(puzzle) {
  const theme = primaryTheme(puzzle);
  const themeText = {
    advantage: "Improve the position with a forcing move before your opponent can recover.",
    attraction: "Pull a defender or king onto a vulnerable square, then use the new alignment.",
    discoveredAttack: "Move one piece with tempo to reveal an attack from another piece.",
    fork: "Use one move to attack two targets, making one of them impossible to save.",
    mate: "Force the king into a position where every legal escape is covered.",
    mateIn2: "Look for the forcing first move, then verify the opponent has no useful escape.",
    pin: "Exploit a piece that cannot move without exposing something more valuable.",
    sacrifice: "Give material only when the forced continuation wins more or ends the game.",
    skewer: "Attack the more valuable piece first so it must move and expose the piece behind it.",
    endgame: "Reduce the position to king activity, passed pawns, and exact move order.",
    opening: "Notice the tactical consequence of development, king safety, or an early pawn break.",
  };
  const difficultyOrder = ["beginner", "intermediate", "advanced", "master"];
  const nextDifficulty = difficultyOrder[Math.min(difficultyOrder.indexOf(puzzle.difficulty) + 1, difficultyOrder.length - 1)] || "beginner";
  return {
    themeName: theme,
    difficulty: puzzle.difficulty,
    rating: puzzle.rating,
    whatYouLearned: themeText[theme] || "Search candidate moves by checks, captures, threats, and loose pieces.",
    explanation: themeText[theme] || "This tactic is solved by following the most forcing line and checking each reply.",
    nextRecommendedDifficulty: nextDifficulty,
  };
}

function dateOffsetKey(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function puzzleBadgesFor(xp, streak, solved) {
  return [
    solved >= 1 && "puzzle-learner",
    streak >= 3 && "puzzle-streak-3",
    streak >= 7 && "puzzle-streak-7",
    xp >= 500 && "tactics-500xp",
  ].filter(Boolean);
}

function publicPuzzle(puzzle) {
  const position = presentedPosition(puzzle);
  const playerMoveCount = Math.max(Math.ceil((puzzle.moves.length - position.nextMoveIndex) / 2), 1);
  return {
    id: puzzle._id,
    puzzleId: puzzle.puzzleId,
    fen: position.fen,
    initialMove: position.initialMove,
    moveIndex: position.nextMoveIndex,
    solutionLength: puzzle.moves.length,
    playerMoveCount,
    rating: puzzle.rating,
    ratingDeviation: puzzle.ratingDeviation,
    popularity: puzzle.popularity,
    nbPlays: puzzle.nbPlays,
    themes: puzzle.themes,
    theme: primaryTheme(puzzle),
    gameUrl: puzzle.gameUrl,
    openingTags: puzzle.openingTags,
    difficulty: puzzle.difficulty,
    source: puzzle.source,
    isPremium: puzzle.isPremium,
    learning: explanationFor(puzzle),
    attribution: "Puzzle data source: Lichess open database (CC0).",
  };
}

async function findSolvedPuzzleIds(owner) {
  const attempts = await PuzzleAttempt.find({ ownerKey: owner.ownerKey, status: "solved" }).select("puzzleId").limit(1000);
  return attempts.map((attempt) => attempt.puzzleId);
}

async function samplePuzzle(match) {
  const result = await Puzzle.aggregate([{ $match: match }, { $sample: { size: 1 } }]);
  if (!result.length) return null;
  return Puzzle.findById(result[0]._id);
}

async function selectPuzzle(owner, difficulty, theme = "") {
  const baseMatch = {
    isActive: true,
    difficulty,
    "moves.1": { $exists: true },
  };
  if (theme) baseMatch.themes = theme;
  if (!owner.plan.startsWith("premium_")) baseMatch.isPremium = false;

  const solvedPuzzleIds = await findSolvedPuzzleIds(owner);
  const unsolvedMatch = solvedPuzzleIds.length ? { ...baseMatch, puzzleId: { $nin: solvedPuzzleIds } } : baseMatch;
  return (
    await samplePuzzle(unsolvedMatch) ||
    await samplePuzzle(baseMatch) ||
    await samplePuzzle({ isActive: true, isPremium: owner.plan.startsWith("premium_") ? { $in: [true, false] } : false })
  );
}

async function reusableActivePuzzle(owner, difficulty, theme = "") {
  const recent = new Date(Date.now() - 10 * 60 * 1000);
  const attempt = await PuzzleAttempt.findOne({
    ownerKey: owner.ownerKey,
    difficulty,
    status: { $in: ["started", "in_progress"] },
    updatedAt: { $gte: recent },
  }).sort({ updatedAt: -1 });
  if (!attempt) return null;

  const match = { puzzleId: attempt.puzzleId, isActive: true, difficulty };
  if (theme) match.themes = theme;
  if (!owner.plan.startsWith("premium_")) match.isPremium = false;
  return Puzzle.findOne(match);
}

async function consumeDailyPuzzle(owner, puzzle) {
  const limit = PLAN_LIMITS[owner.plan] ?? PLAN_LIMITS.guest;
  const usage = await getTodayUsage(owner);
  if (usage.used >= limit) {
    return { blocked: true, usage };
  }

  usage.used += 1;
  usage.plan = owner.plan;
  usage.limit = limit;
  usage.user = owner.userId;
  if (!usage.puzzleIds.includes(puzzle.puzzleId)) usage.puzzleIds.push(puzzle.puzzleId);
  await usage.save();

  await PuzzleAttempt.findOneAndUpdate(
    { ownerKey: owner.ownerKey, puzzleId: puzzle.puzzleId },
    {
      $setOnInsert: {
        puzzle: puzzle._id,
        puzzleId: puzzle.puzzleId,
        ownerType: owner.ownerType,
        user: owner.userId,
        difficulty: puzzle.difficulty,
        startedAt: new Date(),
      },
      $set: { status: "started", currentIndex: 1 },
    },
    { upsert: true, new: true },
  );

  return { blocked: false, usage };
}

function limitReachedResponse(res, owner, usage) {
  return res.status(429).json({
    limitReached: true,
    message: "Daily puzzle limit reached. Upgrade to unlock more tactical training today.",
    upgradeMessage: "Upgrade to increase your daily puzzle limit and unlock premium difficulties.",
    limits: limitPayload(owner, usage),
  });
}

router.get("/limits/me", async (req, res) => {
  try {
    const owner = ownerFromRequest(req);
    const usage = await getTodayUsage(owner);
    res.json({ limits: limitPayload(owner, usage) });
  } catch {
    res.status(500).json({ message: "Unable to load puzzle limits." });
  }
});

router.get("/stats/me", async (req, res) => {
  try {
    const owner = ownerFromRequest(req);
    const [solved, failed, started, usage] = await Promise.all([
      PuzzleAttempt.countDocuments({ ownerKey: owner.ownerKey, status: "solved" }),
      PuzzleAttempt.countDocuments({ ownerKey: owner.ownerKey, status: "failed" }),
      PuzzleAttempt.countDocuments({ ownerKey: owner.ownerKey }),
      getTodayUsage(owner),
    ]);
    res.json({
      stats: {
        solved,
        failed,
        started,
        accuracy: started ? Math.round((solved / started) * 100) : 0,
        rating: req.puzzleUser?.puzzleRating || 1200,
        highestRating: req.puzzleUser?.highestPuzzleRating || 1200,
      },
      limits: limitPayload(owner, usage),
    });
  } catch {
    res.status(500).json({ message: "Unable to load puzzle stats." });
  }
});

router.get("/history/me", async (req, res) => {
  try {
    const owner = ownerFromRequest(req);
    const attempts = await PuzzleAttempt.find({ ownerKey: owner.ownerKey })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select("puzzleId difficulty status hintsUsed mistakeCount movesSubmitted timeSpentMs completedAt updatedAt");
    res.json({ history: attempts });
  } catch {
    res.status(500).json({ message: "Unable to load puzzle history." });
  }
});

router.get("/daily", async (req, res) => {
  return handleNextPuzzle(req, res, req.query.difficulty || "beginner");
});

router.get("/next", async (req, res) => {
  return handleNextPuzzle(req, res, req.query.difficulty || "beginner");
});

async function handleNextPuzzle(req, res, requestedDifficulty) {
  try {
    const difficulty = VALID_DIFFICULTIES.has(requestedDifficulty) ? requestedDifficulty : "beginner";
    const owner = ownerFromRequest(req);
    const usage = await getTodayUsage(owner);

    if (PREMIUM_DIFFICULTIES.has(difficulty) && !owner.plan.startsWith("premium_")) {
      return res.status(402).json({
        premiumRequired: true,
        message: "Advanced and master puzzles are premium training sets.",
        upgradeMessage: "Upgrade to unlock advanced and master tactical puzzles.",
        limits: limitPayload(owner, usage),
      });
    }

    const theme = owner.plan.startsWith("premium_") ? String(req.query.theme || "").trim() : "";
    if (req.query.fresh !== "1") {
      const activePuzzle = await reusableActivePuzzle(owner, difficulty, theme);
      if (activePuzzle) {
        return res.json({
          puzzle: publicPuzzle(activePuzzle),
          limits: limitPayload(owner, usage),
        });
      }
    }

    if (usage.used >= (PLAN_LIMITS[owner.plan] ?? PLAN_LIMITS.guest)) {
      return limitReachedResponse(res, owner, usage);
    }

    const puzzle = await selectPuzzle(owner, difficulty, theme);
    if (!puzzle) {
      return res.json({
        puzzle: null,
        message: "No active puzzles are available yet. Import the Lichess CC0 puzzle CSV or seed the sample dataset.",
        limits: limitPayload(owner, usage),
      });
    }

    const consumed = await consumeDailyPuzzle(owner, puzzle);
    if (consumed.blocked) return limitReachedResponse(res, owner, consumed.usage);

    res.json({
      puzzle: publicPuzzle(puzzle),
      limits: limitPayload(owner, consumed.usage),
    });
  } catch (error) {
    console.error("Puzzle next failed:", error.message);
    res.status(500).json({ message: "Unable to load the next puzzle." });
  }
}

router.post("/:id/hint", attemptLimiter, async (req, res) => {
  try {
    const owner = ownerFromRequest(req);
    const puzzle = await findPuzzle(req.params.id);
    if (!puzzle) return res.status(404).json({ message: "Puzzle not found." });

    const attempt = await PuzzleAttempt.findOneAndUpdate(
      { ownerKey: owner.ownerKey, puzzleId: puzzle.puzzleId },
      {
        $setOnInsert: {
          puzzle: puzzle._id,
          puzzleId: puzzle.puzzleId,
          ownerType: owner.ownerType,
          user: owner.userId,
          difficulty: puzzle.difficulty,
          currentIndex: 1,
          startedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    const hintLimit = owner.plan.startsWith("premium_") ? 3 : 1;
    if (attempt.hintsUsed >= hintLimit) {
      return res.status(429).json({
        message: "No hints left for this puzzle.",
        hintsUsed: attempt.hintsUsed,
        hintsLimit: hintLimit,
      });
    }

    const moveIndex = Math.max(Number.parseInt(req.body?.moveIndex, 10) || attempt.currentIndex || 1, 1);
    const expected = normalizeUci(puzzle.moves[moveIndex]);
    if (!expected) return res.status(400).json({ message: "No hint is available for this move." });

    const nextHintsUsed = attempt.hintsUsed + 1;
    attempt.hintsUsed = nextHintsUsed;
    await attempt.save();

    const levels = [
      { level: 1, type: "piece", text: `Move the piece on ${expected.slice(0, 2).toUpperCase()}.` },
      { level: 2, type: "target", text: `The target square is ${expected.slice(2, 4).toUpperCase()}.` },
      { level: 3, type: "move", text: `The full move is ${expected.toUpperCase()}.` },
    ];
    const hint = levels[Math.min(nextHintsUsed - 1, levels.length - 1)];
    res.json({
      hint: { ...hint, from: expected.slice(0, 2), to: expected.slice(2, 4), move: hint.type === "move" ? expected : "" },
      hintsUsed: nextHintsUsed,
      hintsLimit: hintLimit,
    });
  } catch {
    res.status(500).json({ message: "Unable to load a hint." });
  }
});

router.post("/:id/submit", attemptLimiter, async (req, res) => {
  try {
    const move = normalizeUci(req.body?.move);
    const moveIndex = Number.parseInt(req.body?.moveIndex, 10);
    if (!isValidUci(move) || !Number.isInteger(moveIndex) || moveIndex < 0) {
      return res.status(400).json({ message: "Submit a valid chess move and move index." });
    }

    const owner = ownerFromRequest(req);
    const puzzle = await findPuzzle(req.params.id);
    if (!puzzle) return res.status(404).json({ message: "Puzzle not found." });

    const expected = normalizeUci(puzzle.moves[moveIndex]);
    if (!expected) return res.status(400).json({ message: "This puzzle line is complete." });

    const game = buildGameAtIndex(puzzle, moveIndex);
    const legalMove = applyUci(game, move);
    if (!legalMove) return res.status(400).json({ correct: false, message: "Illegal move. Try another candidate move." });

    const isMateInOneException = moveIndex === 1 && puzzle.moves.length <= 2 && game.isCheckmate();
    const correct = move === expected || isMateInOneException;
    const attempt = await PuzzleAttempt.findOneAndUpdate(
      { ownerKey: owner.ownerKey, puzzleId: puzzle.puzzleId },
      {
        $setOnInsert: {
          puzzle: puzzle._id,
          puzzleId: puzzle.puzzleId,
          ownerType: owner.ownerType,
          user: owner.userId,
          difficulty: puzzle.difficulty,
          startedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    puzzle.attempts += 1;

    if (!correct) {
      attempt.status = "failed";
      attempt.mistakeCount += 1;
      attempt.lastMove = move;
      attempt.movesSubmitted.push(move);
      await Promise.all([attempt.save(), puzzle.save()]);
      return res.json({
        correct: false,
        completed: false,
        message: "Try again. Look for the forcing move in the tactic line.",
        fen: buildGameAtIndex(puzzle, moveIndex).fen(),
        moveIndex,
      });
    }

    attempt.status = "in_progress";
    attempt.lastMove = move;
    attempt.movesSubmitted.push(move);
    let nextMoveIndex = moveIndex + 1;
    let opponentMove = "";
    if (puzzle.moves[nextMoveIndex]) {
      opponentMove = normalizeUci(puzzle.moves[nextMoveIndex]);
      applyUci(game, opponentMove);
      nextMoveIndex += 1;
    }

    const completed = nextMoveIndex >= puzzle.moves.length;
    if (completed) {
      attempt.status = "solved";
      attempt.completedAt = new Date();
      attempt.timeSpentMs = Math.max(0, attempt.completedAt.getTime() - new Date(attempt.startedAt || attempt.createdAt || Date.now()).getTime());
      puzzle.solves += 1;
      if (owner.userId) {
        const user = await User.findById(owner.userId).select("puzzlesSolved puzzleXp puzzleStreak puzzleLastSolvedDate badges").catch(() => null);
        if (user) {
          const today = dateOffsetKey(0);
          const yesterday = dateOffsetKey(1);
          const nextStreak = user.puzzleLastSolvedDate === today ? user.puzzleStreak : user.puzzleLastSolvedDate === yesterday ? user.puzzleStreak + 1 : 1;
          const xpGain = Math.max(10, Math.round((puzzle.rating || 1000) / 100));
          const solvedCount = (user.puzzlesSolved || 0) + 1;
          const nextXp = (user.puzzleXp || 0) + xpGain;
          user.puzzlesSolved = solvedCount;
          user.puzzleRating = puzzle.rating || 1200;
          user.highestPuzzleRating = Math.max(user.highestPuzzleRating || 1200, puzzle.rating || 1200);
          user.puzzleXp = nextXp;
          user.puzzleStreak = nextStreak;
          user.puzzleLastSolvedDate = today;
          user.badges = Array.from(new Set([...(user.badges || []), ...puzzleBadgesFor(nextXp, nextStreak, solvedCount)]));
          await user.save().catch(() => {});
        }
      }
    }

    attempt.currentIndex = nextMoveIndex;
    await Promise.all([attempt.save(), puzzle.save()]);

    res.json({
      correct: true,
      completed,
      message: completed ? "Puzzle completed." : "Correct. Continue the tactic line.",
      fen: game.fen(),
      moveIndex: nextMoveIndex,
      move,
      opponentMove,
      progress: {
        completedMoves: attempt.movesSubmitted.length,
        totalPlayerMoves: Math.max(Math.ceil((puzzle.moves.length - 1) / 2), 1),
      },
      learning: completed ? explanationFor(puzzle) : null,
    });
  } catch {
    res.status(500).json({ message: "Unable to validate puzzle move." });
  }
});

async function findPuzzle(id) {
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ _id: id }, { puzzleId: id }], isActive: true }
    : { puzzleId: id, isActive: true };
  return Puzzle.findOne(query);
}

router.get("/", async (req, res) => {
  try {
    const difficulty = VALID_DIFFICULTIES.has(req.query.difficulty) ? req.query.difficulty : null;
    const filter = { isActive: true };
    if (difficulty) filter.difficulty = difficulty;
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
    const puzzles = await Puzzle.find(filter).sort({ rating: 1 }).limit(limit);
    res.json({ puzzles: puzzles.map(publicPuzzle) });
  } catch {
    res.status(500).json({ message: "Unable to load puzzles." });
  }
});

module.exports = router;
module.exports.difficultyFromRating = difficultyFromRating;
