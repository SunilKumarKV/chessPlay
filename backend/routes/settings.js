const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

const DEFAULT_SETTINGS = {
  privacy: {
    profileVisibility: "public",
    gameHistoryVisibility: "public",
    friendRequests: "everyone",
  },
  notifications: {
    gameInvites: true,
    friendRequests: true,
    messages: true,
    tournaments: true,
    community: true,
    supporter: true,
  },
  appearance: {
    theme: "system",
    accentColor: "default",
    textColor: "default",
    boardTheme: "classic",
    selectedBadge: "new-player",
  },
  badges: {
    earned: ["new-player", "active-player", "community-member"],
    selected: "new-player",
  },
  gameplay: {
    defaultMode: "ai",
    boardOrientation: "white",
    moveConfirmation: false,
    soundEffects: true,
    animation: "normal",
  },
};

const enums = {
  profileVisibility: new Set(["public", "private"]),
  gameHistoryVisibility: new Set(["public", "friends", "private"]),
  friendRequests: new Set(["everyone", "friendsOfFriends", "none"]),
  theme: new Set(["system", "light", "dark", "newspaper", "midnight", "tournament", "royal", "forest", "neon"]),
  accentColor: new Set(["default", "blue", "purple", "emerald", "amber", "rose", "cyan"]),
  textColor: new Set(["default", "softWhite", "warm", "cool", "highContrast"]),
  boardTheme: new Set(["classic", "tournamentGreen", "neonDark", "wooden", "marble", "neonCyberpunk", "glassBoard", "darkPro", "minimalLight"]),
  selectedBadge: new Set(["new-player", "active-player", "community-member", "supporter", "founder-supporter", "premium-player", "early-access", "puzzle-learner", "tournament-ready", "referral-builder", "analysis-explorer"]),
  defaultMode: new Set(["ai", "online", "player"]),
  boardOrientation: new Set(["white", "black", "auto"]),
  animation: new Set(["normal", "reduced"]),
};

function bool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function pickEnum(value, allowed, fallback) {
  return typeof value === "string" && allowed.has(value) ? value : fallback;
}

const SUPPORTER_THEMES = new Set(["midnight", "tournament", "royal", "forest", "neon"]);
const SUPPORTER_BOARD_THEMES = new Set(["wooden", "marble", "neonCyberpunk", "glassBoard", "darkPro", "minimalLight"]);
const SUPPORTER_BADGES = new Set(["supporter", "founder-supporter", "premium-player", "early-access"]);
const DEFAULT_BADGES = ["new-player", "active-player", "community-member"];

function earnedBadgesForUser(user) {
  const earned = new Set([...(Array.isArray(user?.badges?.earned) ? user.badges.earned : []), ...DEFAULT_BADGES]);
  if (user?.isSupporter || user?.isPremium) {
    ["supporter", "founder-supporter", "premium-player", "early-access"].forEach((badge) => earned.add(badge));
  }
  if ((user?.puzzlesSolved || 0) > 0) earned.add("puzzle-learner");
  if ((user?.gamesPlayed || 0) > 0) earned.add("active-player");
  return Array.from(earned);
}

function normalizeSettings(input = {}, user = null) {
  return {
    privacy: {
      profileVisibility: pickEnum(input.privacy?.profileVisibility, enums.profileVisibility, DEFAULT_SETTINGS.privacy.profileVisibility),
      gameHistoryVisibility: pickEnum(input.privacy?.gameHistoryVisibility, enums.gameHistoryVisibility, DEFAULT_SETTINGS.privacy.gameHistoryVisibility),
      friendRequests: pickEnum(input.privacy?.friendRequests, enums.friendRequests, DEFAULT_SETTINGS.privacy.friendRequests),
    },
    notifications: {
      gameInvites: bool(input.notifications?.gameInvites, DEFAULT_SETTINGS.notifications.gameInvites),
      friendRequests: bool(input.notifications?.friendRequests, DEFAULT_SETTINGS.notifications.friendRequests),
      messages: bool(input.notifications?.messages, DEFAULT_SETTINGS.notifications.messages),
      tournaments: bool(input.notifications?.tournaments, DEFAULT_SETTINGS.notifications.tournaments),
      community: bool(input.notifications?.community, DEFAULT_SETTINGS.notifications.community),
      supporter: bool(input.notifications?.supporter, DEFAULT_SETTINGS.notifications.supporter),
    },
    appearance: {
      theme: pickEnum(input.appearance?.theme, enums.theme, DEFAULT_SETTINGS.appearance.theme),
      accentColor: pickEnum(input.appearance?.accentColor, enums.accentColor, DEFAULT_SETTINGS.appearance.accentColor),
      textColor: pickEnum(input.appearance?.textColor, enums.textColor, DEFAULT_SETTINGS.appearance.textColor),
      boardTheme: pickEnum(input.appearance?.boardTheme, enums.boardTheme, DEFAULT_SETTINGS.appearance.boardTheme),
      selectedBadge: pickEnum(input.appearance?.selectedBadge || input.badges?.selected, enums.selectedBadge, DEFAULT_SETTINGS.appearance.selectedBadge),
    },
    badges: {
      earned: earnedBadgesForUser(user),
      selected: pickEnum(input.badges?.selected || input.appearance?.selectedBadge, enums.selectedBadge, DEFAULT_SETTINGS.badges.selected),
    },
    gameplay: {
      defaultMode: pickEnum(input.gameplay?.defaultMode, enums.defaultMode, DEFAULT_SETTINGS.gameplay.defaultMode),
      boardOrientation: pickEnum(input.gameplay?.boardOrientation, enums.boardOrientation, DEFAULT_SETTINGS.gameplay.boardOrientation),
      moveConfirmation: bool(input.gameplay?.moveConfirmation, DEFAULT_SETTINGS.gameplay.moveConfirmation),
      soundEffects: bool(input.gameplay?.soundEffects, DEFAULT_SETTINGS.gameplay.soundEffects),
      animation: pickEnum(input.gameplay?.animation, enums.animation, DEFAULT_SETTINGS.gameplay.animation),
    },
  };
}

function settingsFromUser(user) {
  const normalized = normalizeSettings(user.settings || {}, user);
  // Backward compatibility with the existing boolean privacy fields.
  if (!user.settings?.privacy) {
    normalized.privacy.profileVisibility = user.privacy?.profileVisibility === false ? "private" : "public";
    normalized.privacy.gameHistoryVisibility = user.privacy?.gameHistory === false ? "private" : "public";
    normalized.privacy.friendRequests = user.privacy?.friendRequests === false ? "none" : "everyone";
  }
  return normalized;
}

function safeUser(user) {
  const latestStatus = user.planStatus === "pending"
    ? "pending"
    : user.isSupporter
      ? "supporter"
      : user.planStatus === "cancelled" || user.planStatus === "expired"
        ? "rejected"
        : "free";

  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    avatar: user.avatar || null,
    country: user.country || "US",
    bio: user.bio || "",
    isAdmin: Boolean(user.isAdmin),
    isSupporter: Boolean(user.isSupporter),
    adsDisabled: Boolean(user.adsDisabled),
    plan: user.plan || "free",
    planStatus: user.planStatus || "active",
    supporterStatus: latestStatus,
  };
}

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("username email avatar country bio privacy settings isAdmin isSupporter adsDisabled plan planStatus");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: safeUser(user), settings: settingsFromUser(user) });
  } catch (error) {
    console.error("Settings load error:", error.message);
    res.status(500).json({ message: "Unable to load settings." });
  }
});

router.patch("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const nextSettings = normalizeSettings(req.body?.settings || req.body || {}, user);
    const isSupporter = Boolean(user.isSupporter || user.isPremium);
    if (!isSupporter && SUPPORTER_THEMES.has(nextSettings.appearance.theme)) nextSettings.appearance.theme = user.settings?.appearance?.theme || DEFAULT_SETTINGS.appearance.theme;
    if (!isSupporter && SUPPORTER_BOARD_THEMES.has(nextSettings.appearance.boardTheme)) nextSettings.appearance.boardTheme = user.settings?.appearance?.boardTheme || DEFAULT_SETTINGS.appearance.boardTheme;
    if (!nextSettings.badges.earned.includes(nextSettings.appearance.selectedBadge) || (!isSupporter && SUPPORTER_BADGES.has(nextSettings.appearance.selectedBadge))) nextSettings.appearance.selectedBadge = "new-player";
    nextSettings.badges.selected = nextSettings.appearance.selectedBadge;
    user.settings = nextSettings;
    user.privacy = {
      ...(user.privacy || {}),
      profileVisibility: nextSettings.privacy.profileVisibility !== "private",
      gameHistory: nextSettings.privacy.gameHistoryVisibility !== "private",
      friendRequests: nextSettings.privacy.friendRequests !== "none",
    };

    if (req.body?.profile && typeof req.body.profile === "object") {
      const username = String(req.body.profile.username || user.username).trim();
      if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        return res.status(400).json({ message: "Username must be 3-20 letters or numbers." });
      }
      if (username !== user.username) {
        const exists = await User.findOne({ username, _id: { $ne: user._id } });
        if (exists) return res.status(409).json({ message: "Username already taken." });
        user.username = username;
      }
      if (req.body.profile.bio !== undefined) {
        user.bio = String(req.body.profile.bio || "").replace(/<[^>]*>/g, "").slice(0, 500);
      }
      if (req.body.profile.country !== undefined) {
        user.country = String(req.body.profile.country || "US").replace(/[^a-zA-Z -]/g, "").slice(0, 56) || "US";
      }
    }

    await user.save();
    res.json({ message: "Settings updated successfully.", user: safeUser(user), settings: settingsFromUser(user) });
  } catch (error) {
    console.error("Settings update error:", error.message);
    res.status(500).json({ message: "Unable to update settings." });
  }
});

module.exports = router;
