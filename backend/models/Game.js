const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  whitePlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  blackPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  aiOpponent: {
    type: Boolean,
    default: false,
  },
  aiDifficulty: {
    type: Number,
    min: 0,
    max: 20,
    default: 10,
  },
  moves: [
    {
      from: String,
      to: String,
      piece: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  result: {
    type: String,
    enum: ["white", "black", "draw", "ongoing"],
    default: "ongoing",
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // in minutes
  },
  roomId: {
    type: String,
  },
});

// Index for efficient queries
gameSchema.index({ whitePlayer: 1, startTime: -1 });
gameSchema.index({ blackPlayer: 1, startTime: -1 });

module.exports = mongoose.model("Game", gameSchema);
