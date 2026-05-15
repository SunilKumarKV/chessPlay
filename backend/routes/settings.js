const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const { sanitizeText } = require("../utils/security");

const router = express.Router();

const THEMES = new Set(["system", "light", "dark", "midnight", "tournament", "newspaper"]);
const BOARD_THEMES = new Set(["classic", "blue", "green", "brown", "purple", "mono", "neon", "wood", "tournament"]);
const PIECE_SETS = new Set(["classic", "modern", "neo", "minimal"]);
const ANIMATIONS = new Set(["none", "fast", "normal", "reduced"]);
const NOTATIONS = new Set(["san", "lan", "uci"]);
const DEFAULT_MODES = new Set(["ai", "online", "player"]);
const ORIENTATIONS = new Set(["white", "black", "auto"]);
const HISTORY_VISIBILITY = new Set(["public", "friends", "private"]);
const FRIEND_REQUESTS = new Set(["everyone", "friends_of_friends", "none"]);

function bool(value, fallback = true) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function enumValue(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function normalizePayload(body = {}) {
  const account = body.account && typeof body.account === "object" ? body.account : {};
  const appearance = body.appearance && typeof body.appearance === "object" ? body.appearance : {};
  const game = body.game && typeof body.game === "object" ? body.game : {};
  const notifications = body.notifications && typeof body.notifications === "object" ? body.notifications : {};
  const privacy = body.privacy && typeof body.privacy === "object" ? body.privacy : {};

  const update = {};

  if (typeof account.username === "string") {
    const username = account.username.trim();
    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
      const err = new Error("Username must be 3-20 letters or numbers.");
      err.status = 400;
      throw err;
    }
    update.username = username;
  }
  if (typeof account.bio === "string") update.bio = sanitizeText(account.bio, 500);
  if (typeof account.country === "string") {
    update.country = account.country.replace(/[^a-zA-Z -]/g, "").slice(0, 56) || "US";
  }

  update.privacy = {
    profileVisibility: bool(privacy.profileVisibility, true),
    gameHistory: privacy.gameHistoryVisibility === "private" ? false : bool(privacy.gameHistory, true),
    gameHistoryVisibility: enumValue(privacy.gameHistoryVisibility, HISTORY_VISIBILITY, "public"),
    onlineStatus: bool(privacy.onlineStatus, true),
    friendRequests: privacy.friendRequests === "none" ? false : bool(privacy.friendRequests, true),
    friendRequestPolicy: enumValue(privacy.friendRequestPolicy, FRIEND_REQUESTS, "everyone"),
    spectatorMode: bool(privacy.spectatorMode, false),
  };

  update.preferences = {
    notifications: {
      gameInvites: bool(notifications.gameInvites, true),
      friendRequests: bool(notifications.friendRequests, true),
      messages: bool(notifications.messages, true),
      tournaments: bool(notifications.tournaments ?? notifications.tournamentUpdates, true),
      community: bool(notifications.community, true),
      supporter: bool(notifications.supporter, true),
      moveNotifications: bool(notifications.moveNotifications, true),
      gameResults: bool(notifications.gameResults, true),
      achievementAlerts: bool(notifications.achievementAlerts, true),
    },
    appearance: {
      theme: enumValue(appearance.theme, THEMES, "dark"),
      boardTheme: enumValue(appearance.boardTheme, BOARD_THEMES, "classic"),
      pieceSet: enumValue(appearance.pieceSet, PIECE_SETS, "classic"),
      fontFamily: String(appearance.fontFamily || "inter").slice(0, 24),
      fontSize: Math.min(Math.max(Number(appearance.fontSize) || 16, 12), 20),
      language: String(appearance.language || "en").slice(0, 12),
      accentColor: String(appearance.accentColor || "").slice(0, 24),
      textColor: String(appearance.textColor || "").slice(0, 24),
      moveNotation: enumValue(appearance.moveNotation, NOTATIONS, "san"),
      boardCoordinates: bool(appearance.boardCoordinates, true),
      boardAnimation: enumValue(appearance.boardAnimation, ANIMATIONS, "normal"),
    },
    gameplay: {
      defaultMode: enumValue(game.defaultMode, DEFAULT_MODES, "ai"),
      boardOrientation: enumValue(game.boardOrientation, ORIENTATIONS, "white"),
      moveConfirmation: bool(game.moveConfirmation ?? game.confirmMove, false),
      soundEffects: bool(game.soundEffects ?? game.soundEnabled, true),
      animation: enumValue(game.animation || appearance.boardAnimation, ANIMATIONS, "normal"),
      showLegalMoves: bool(game.showLegalMoves, true),
      showLastMove: bool(game.showLastMove, true),
      autoPromote: bool(game.autoPromote, true),
      confirmMove: bool(game.confirmMove, false),
      defaultTimeControl: Math.min(Math.max(Number(game.defaultTimeControl) || 2, 0), 6),
      aiDifficulty: Math.min(Math.max(Number(game.aiDifficulty) || 3, 0), 6),
      premove: bool(game.premove, true),
      autoQueen: bool(game.autoQueen, true),
      alwaysPromoteToQueen: bool(game.alwaysPromoteToQueen, false),
    },
  };

  return update;
}

function settingsResponse(user) {
  const preferences = user.preferences || {};
  const notifications = preferences.notifications || {};
  const appearance = preferences.appearance || {};
  const gameplay = preferences.gameplay || {};
  return {
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio || "",
      avatar: user.avatar || null,
      country: user.country || "US",
      isSupporter: Boolean(user.isSupporter),
      adsDisabled: Boolean(user.adsDisabled || user.entitlements?.noAds),
      plan: user.plan || "free",
      planStatus: user.planStatus || "active",
      isAdmin: Boolean(user.isAdmin),
    },
    settings: {
      account: {
        username: user.username,
        email: user.email,
        bio: user.bio || "",
        avatar: user.avatar || null,
        country: user.country || "US",
      },
      privacy: {
        profileVisibility: user.privacy?.profileVisibility !== false,
        gameHistory: user.privacy?.gameHistory !== false,
        gameHistoryVisibility: user.privacy?.gameHistoryVisibility || (user.privacy?.gameHistory === false ? "private" : "public"),
        onlineStatus: user.privacy?.onlineStatus !== false,
        friendRequests: user.privacy?.friendRequests !== false,
        friendRequestPolicy: user.privacy?.friendRequestPolicy || (user.privacy?.friendRequests === false ? "none" : "everyone"),
        spectatorMode: Boolean(user.privacy?.spectatorMode),
      },
      notifications: {
        gameInvites: notifications.gameInvites !== false,
        friendRequests: notifications.friendRequests !== false,
        messages: notifications.messages !== false,
        tournaments: notifications.tournaments !== false,
        community: notifications.community !== false,
        supporter: notifications.supporter !== false,
        moveNotifications: notifications.moveNotifications !== false,
        gameResults: notifications.gameResults !== false,
        achievementAlerts: notifications.achievementAlerts !== false,
      },
      appearance: {
        theme: appearance.theme || "dark",
        boardTheme: appearance.boardTheme || "classic",
        pieceSet: appearance.pieceSet || "classic",
        fontFamily: appearance.fontFamily || "inter",
        fontSize: appearance.fontSize || 16,
        language: appearance.language || "en",
        accentColor: appearance.accentColor || "",
        textColor: appearance.textColor || "",
        moveNotation: appearance.moveNotation || "san",
        boardCoordinates: appearance.boardCoordinates !== false,
        boardAnimation: appearance.boardAnimation || "normal",
      },
      game: {
        defaultMode: gameplay.defaultMode || "ai",
        boardOrientation: gameplay.boardOrientation || "white",
        moveConfirmation: Boolean(gameplay.moveConfirmation),
        soundEffects: gameplay.soundEffects !== false,
        animation: gameplay.animation || "normal",
        showLegalMoves: gameplay.showLegalMoves !== false,
        showLastMove: gameplay.showLastMove !== false,
        soundEnabled: gameplay.soundEffects !== false,
        autoPromote: gameplay.autoPromote !== false,
        confirmMove: Boolean(gameplay.confirmMove ?? gameplay.moveConfirmation),
        defaultTimeControl: gameplay.defaultTimeControl ?? 2,
        aiDifficulty: gameplay.aiDifficulty ?? 3,
        premove: gameplay.premove !== false,
        autoQueen: gameplay.autoQueen !== false,
        alwaysPromoteToQueen: Boolean(gameplay.alwaysPromoteToQueen),
      },
    },
  };
}

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(settingsResponse(user));
  } catch (error) {
    res.status(500).json({ message: "Unable to load settings." });
  }
});

router.patch("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const update = normalizePayload(req.body || {});

    if (update.username && update.username !== user.username) {
      const exists = await User.exists({ username: update.username, _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ message: "Username already taken." });
      user.username = update.username;
    }
    if (Object.prototype.hasOwnProperty.call(update, "bio")) user.bio = update.bio;
    if (Object.prototype.hasOwnProperty.call(update, "country")) user.country = update.country;
    user.privacy = { ...(user.privacy?.toObject?.() || user.privacy || {}), ...update.privacy };
    user.preferences = {
      ...(user.preferences?.toObject?.() || user.preferences || {}),
      notifications: update.preferences.notifications,
      appearance: update.preferences.appearance,
      gameplay: update.preferences.gameplay,
    };

    await user.save();
    res.json({ message: "Settings updated successfully.", ...settingsResponse(user) });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: status === 500 ? "Unable to update settings." : error.message });
  }
});

module.exports = router;
