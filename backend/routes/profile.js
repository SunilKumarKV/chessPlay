const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Game = require("../models/Game");
const auth = require("../middleware/auth");

const router = express.Router();

const USER_SELECT = "username email avatar bio country title rating gamesPlayed gamesWon gamesLost gamesDrawn createdAt isSupporter isPremium isAdmin adsDisabled plan planStatus supporterPlan supporterSince settings privacy friends badges";
const PUBLIC_SELECT = "username avatar bio country title rating gamesPlayed gamesWon gamesLost gamesDrawn createdAt isSupporter isPremium isAdmin adsDisabled plan planStatus supporterPlan supporterSince settings privacy badges";

function cleanText(value, maxLength = 160) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizePlan(user) {
  if (user.isSupporter || user.isPremium || user.planStatus === "active" && user.plan !== "free") return "Supporter";
  if (user.planStatus === "pending") return "Pending verification";
  if (user.planStatus === "cancelled" || user.planStatus === "expired") return "Rejected";
  return "Free";
}

function relationshipSafeUser(user, ownProfile = false) {
  const settings = user.settings || {};
  const privacy = settings.privacy || {};
  const gamesPlayed = Number(user.gamesPlayed || 0);
  const wins = Number(user.gamesWon || 0);
  const losses = Number(user.gamesLost || 0);
  const draws = Number(user.gamesDrawn || 0);

  return {
    id: String(user._id),
    username: user.username,
    displayName: user.displayName || user.username,
    email: ownProfile ? user.email : undefined,
    avatar: user.avatar || null,
    bio: user.bio || "",
    country: user.country || "",
    title: user.title || null,
    rating: Number(user.rating || 1200),
    gamesPlayed,
    gamesWon: wins,
    gamesLost: losses,
    gamesDrawn: draws,
    wins,
    losses,
    draws,
    joinedAt: user.createdAt,
    createdAt: user.createdAt,
    isSupporter: Boolean(user.isSupporter || user.isPremium),
    isPremium: Boolean(user.isPremium),
    isAdmin: Boolean(user.isAdmin),
    adsDisabled: Boolean(user.adsDisabled || user.entitlements?.noAds),
    plan: normalizePlan(user),
    planStatus: user.planStatus || "active",
    supporterPlan: user.supporterPlan || "none",
    supporterSince: user.supporterSince || null,
    selectedBadge: settings.appearance?.selectedBadge || user.badges?.selected || (user.isSupporter || user.isPremium ? "supporter" : "new-player"),
    earnedBadges: ownProfile ? (user.badges?.earned || ["new-player", "active-player", "community-member"]) : undefined,
    settings: ownProfile ? settings : undefined,
    privacy: {
      profileVisibility: privacy.profileVisibility || (user.privacy?.profileVisibility === false ? "private" : "public"),
      gameHistoryVisibility: privacy.gameHistoryVisibility || (user.privacy?.gameHistory === false ? "private" : "public"),
      friendRequests: privacy.friendRequests || (user.privacy?.friendRequests === false ? "none" : "everyone"),
    },
  };
}

function isProfilePrivate(user) {
  const setting = user.settings?.privacy?.profileVisibility;
  if (setting) return setting === "private";
  return user.privacy?.profileVisibility === false;
}

function canViewGameHistory(user, viewerId) {
  const setting = user.settings?.privacy?.gameHistoryVisibility;
  if (String(user._id) === String(viewerId || "")) return true;
  if (setting) return setting === "public";
  return user.privacy?.gameHistory !== false;
}

function formatGame(game, viewerId) {
  const id = String(viewerId || "");
  const whiteId = String(game.whitePlayer?._id || game.whitePlayer || "");
  const blackId = String(game.blackPlayer?._id || game.blackPlayer || "");
  const isWhite = whiteId === id;
  const opponent = isWhite ? game.blackPlayer : game.whitePlayer;
  let result = "Ongoing";
  if (game.result === "draw") result = "Draw";
  else if (game.winner && String(game.winner) === id) result = "Win";
  else if (game.result && game.result !== "ongoing") result = "Loss";

  return {
    id: String(game._id),
    opponent: game.aiOpponent ? `Stockfish Lv${game.aiDifficulty || 10}` : opponent?.username || "ChessPlay player",
    result,
    moves: Array.isArray(game.moves) ? game.moves.length : 0,
    startedAt: game.startTime,
    endedAt: game.endTime,
    aiOpponent: Boolean(game.aiOpponent),
  };
}

async function recentGamesFor(user, viewerId) {
  if (!canViewGameHistory(user, viewerId)) return { games: [], hidden: true };
  const games = await Game.find({
    $or: [{ whitePlayer: user._id }, { blackPlayer: user._id }],
  })
    .populate("whitePlayer", "username avatar isSupporter")
    .populate("blackPlayer", "username avatar isSupporter")
    .sort({ startTime: -1 })
    .limit(10);
  return { games: games.map((game) => formatGame(game, user._id)), hidden: false };
}

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(USER_SELECT);
    if (!user) return res.status(404).json({ message: "Profile not found" });
    const recent = await recentGamesFor(user, req.user.userId);
    res.json({ profile: relationshipSafeUser(user, true), recentGames: recent.games, gameHistoryHidden: recent.hidden });
  } catch (error) {
    res.status(500).json({ message: "Unable to load profile" });
  }
});

router.get("/:username", async (req, res) => {
  try {
    const username = cleanText(req.params.username, 32);
    if (!/^[a-zA-Z0-9_ -]{3,32}$/.test(username)) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const user = await User.findOne({ username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).select(PUBLIC_SELECT);
    if (!user) return res.status(404).json({ message: "Profile not found" });

    if (isProfilePrivate(user)) {
      return res.status(403).json({ message: "This profile is private" });
    }

    const recent = await recentGamesFor(user, null);
    res.json({ profile: relationshipSafeUser(user, false), recentGames: recent.games, gameHistoryHidden: recent.hidden });
  } catch (error) {
    res.status(500).json({ message: "Unable to load profile" });
  }
});

router.patch("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(USER_SELECT);
    if (!user) return res.status(404).json({ message: "Profile not found" });

    const next = {};
    if (req.body.displayName !== undefined || req.body.username !== undefined) {
      const username = cleanText(req.body.username || req.body.displayName || user.username, 20).replace(/\s+/g, "");
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ message: "Username must be 3-20 letters, numbers, or underscores." });
      }
      const exists = await User.exists({ username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ message: "Username already taken." });
      next.username = username;
    }

    if (req.body.bio !== undefined) next.bio = cleanText(req.body.bio, 500);
    if (req.body.country !== undefined) next.country = cleanText(req.body.country, 56).replace(/[^a-zA-Z -]/g, "") || "";

    Object.assign(user, next);
    await user.save();
    const recent = await recentGamesFor(user, req.user.userId);
    res.json({ message: "Profile updated successfully.", profile: relationshipSafeUser(user, true), recentGames: recent.games, gameHistoryHidden: recent.hidden });
  } catch (error) {
    res.status(500).json({ message: "Unable to update profile" });
  }
});

module.exports = router;
