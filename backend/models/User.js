const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationTokenHash: {
    type: String,
    default: null,
    select: false,
  },
  emailVerificationExpires: {
    type: Date,
    default: null,
    select: false,
  },
  passwordResetTokenHash: {
    type: String,
    default: null,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    default: null,
    select: false,
  },
  refreshTokenHash: {
    type: String,
    default: null,
    select: false,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  isBanned: {
    type: Boolean,
    default: false,
    index: true,
  },
  bannedAt: { type: Date, default: null },
  bannedReason: { type: String, trim: true, maxlength: 300, default: "" },

  // v1.2.1 SaaS / supporter plan fields
  plan: {
    type: String,
    enum: ["free", "supporter_monthly", "supporter_yearly", "pro", "premium", "lifetime"],
    default: "free",
  },
  planStatus: {
    type: String,
    enum: ["active", "expired", "pending", "cancelled"],
    default: "active",
  },
  planStartedAt: { type: Date, default: null },
  planExpiresAt: { type: Date, default: null },
  isSupporter: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  supporterSince: { type: Date, default: null },
  supporterPlan: {
    type: String,
    enum: ["none", "supporter_monthly", "supporter_yearly", "pro", "premium", "lifetime"],
    default: "none",
  },
  supporterExpiresAt: { type: Date, default: null },
  adsDisabled: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  referralCode: { type: String, uppercase: true, trim: true, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  coins: { type: Number, default: 0, min: 0 },
  analysisCredits: { type: Number, default: 10, min: 0 },
  entitlements: {
    noAds: { type: Boolean, default: false },
    premiumSounds: { type: Boolean, default: false },
    unlimitedAnalysis: { type: Boolean, default: false },
    advancedEngineDepth: { type: Boolean, default: false },
    customBoards: { type: Boolean, default: false },
    premiumThemes: { type: Boolean, default: false },
    advancedStats: { type: Boolean, default: false },
    unlimitedGameReview: { type: Boolean, default: false },
    tournaments: { type: Boolean, default: false },
    earlyAccess: { type: Boolean, default: false },
    premiumPuzzleFilters: { type: Boolean, default: false },
    advancedAnalysis: { type: Boolean, default: false },
  },
  bonusPuzzleCredits: { type: Number, default: 0, min: 0 },
  trialDaysAwarded: { type: Number, default: 0, min: 0 },
  puzzleXp: { type: Number, default: 0, min: 0 },
  puzzleStreak: { type: Number, default: 0, min: 0 },
  puzzleLastSolvedDate: { type: String, trim: true, default: "" },
  badges: [{ type: String, trim: true }],
  bio: {
    type: String,
    maxlength: 500,
    default: "",
  },
  avatar: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    enum: ["GM", "IM", "FM", "CM", "WGM", "WIM", "WFM", "WCM"],
    default: null,
  },
  country: {
    type: String,
    default: "US",
  },
  puzzleRating: {
    type: Number,
    default: 1200,
  },
  highestPuzzleRating: {
    type: Number,
    default: 1200,
  },
  puzzlesSolved: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },
  gamesPlayed: {
    type: Number,
    default: 0,
  },
  gamesWon: {
    type: Number,
    default: 0,
  },
  gamesLost: {
    type: Number,
    default: 0,
  },
  gamesDrawn: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 1200,
  },
  privacy: {
    profileVisibility: {
      type: Boolean,
      default: true,
    },
    gameHistory: {
      type: Boolean,
      default: true,
    },
    onlineStatus: {
      type: Boolean,
      default: true,
    },
    friendRequests: {
      type: Boolean,
      default: true,
    },
    spectatorMode: {
      type: Boolean,
      default: false,
    },
  },

  settings: {
    privacy: {
      profileVisibility: { type: String, enum: ["public", "private"], default: "public" },
      gameHistoryVisibility: { type: String, enum: ["public", "friends", "private"], default: "public" },
      friendRequests: { type: String, enum: ["everyone", "friendsOfFriends", "none"], default: "everyone" },
    },
    notifications: {
      gameInvites: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      tournaments: { type: Boolean, default: true },
      community: { type: Boolean, default: true },
      supporter: { type: Boolean, default: true },
    },
    appearance: {
      theme: { type: String, enum: ["system", "light", "dark", "newspaper", "midnight", "tournament", "royal", "forest", "neon"], default: "system" },
      accentColor: { type: String, enum: ["default", "blue", "purple", "emerald", "amber", "rose", "cyan"], default: "default" },
      textColor: { type: String, enum: ["default", "softWhite", "warm", "cool", "highContrast"], default: "default" },
      boardTheme: { type: String, enum: ["classic", "tournamentGreen", "neonDark", "wooden", "marble", "neonCyberpunk", "glassBoard", "darkPro", "minimalLight"], default: "classic" },
      selectedBadge: { type: String, default: "new-player", trim: true, maxlength: 64 },
    },
    badges: {
      earned: [{ type: String, trim: true, maxlength: 64 }],
      selected: { type: String, default: "new-player", trim: true, maxlength: 64 },
    },
    gameplay: {
      defaultMode: { type: String, enum: ["ai", "online", "player"], default: "ai" },
      boardOrientation: { type: String, enum: ["white", "black", "auto"], default: "white" },
      moveConfirmation: { type: Boolean, default: false },
      soundEffects: { type: Boolean, default: true },
      animation: { type: String, enum: ["normal", "reduced"], default: "normal" },
    },
  },

  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  friendRequests: [
    {
      from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      status: {
        type: String,
        enum: ["pending", "accepted", "declined"],
        default: "pending",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
