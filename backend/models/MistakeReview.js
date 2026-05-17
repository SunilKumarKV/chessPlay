const mongoose = require("mongoose");

const mistakeReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    game: { type: mongoose.Schema.Types.ObjectId, ref: "Game", default: null, index: true },
    analysis: { type: mongoose.Schema.Types.ObjectId, ref: "GameAnalysis", default: null, index: true },
    fen: { type: String, required: true, trim: true, maxlength: 120 },
    movePlayed: { type: String, trim: true, maxlength: 12, default: "" },
    bestMove: { type: String, trim: true, maxlength: 12, default: "" },
    reason: { type: String, trim: true, maxlength: 500, default: "" },
    severity: { type: String, enum: ["inaccuracy", "mistake", "blunder"], default: "mistake", index: true },
    status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open", index: true },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

mistakeReviewSchema.index({ user: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model("MistakeReview", mistakeReviewSchema);
