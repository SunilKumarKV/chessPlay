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
    minlength: 6,
  },
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
    const salt = await bcrypt.genSalt(10);
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
