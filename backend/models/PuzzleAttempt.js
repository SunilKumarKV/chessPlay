const mongoose = require("mongoose");

const puzzleAttemptSchema = new mongoose.Schema({
  puzzle: { type: mongoose.Schema.Types.ObjectId, ref: "Puzzle", required: true, index: true },
  puzzleId: { type: String, required: true, trim: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  ownerKey: { type: String, required: true, trim: true, index: true },
  ownerType: { type: String, enum: ["guest", "user"], required: true, index: true },
  difficulty: { type: String, enum: ["beginner", "intermediate", "advanced", "master"], required: true },
  status: {
    type: String,
    enum: ["started", "in_progress", "solved", "failed"],
    default: "started",
    index: true,
  },
  movesSubmitted: [{ type: String, trim: true, lowercase: true }],
  currentIndex: { type: Number, default: 1, min: 1 },
  hintsUsed: { type: Number, default: 0, min: 0 },
  mistakeCount: { type: Number, default: 0, min: 0 },
  lastMove: { type: String, trim: true, lowercase: true, default: "" },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

puzzleAttemptSchema.index({ ownerKey: 1, puzzleId: 1 });
puzzleAttemptSchema.index({ ownerKey: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model("PuzzleAttempt", puzzleAttemptSchema);
