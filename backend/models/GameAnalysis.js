const mongoose = require("mongoose");

const gameAnalysisSchema = new mongoose.Schema(
  {
    game: { type: mongoose.Schema.Types.ObjectId, ref: "Game", default: null, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    accuracy: { type: Number, min: 0, max: 100, default: 0 },
    mistakes: { type: Number, min: 0, default: 0 },
    blunders: { type: Number, min: 0, default: 0 },
    bestMoves: [{ type: String, trim: true }],
    status: { type: String, enum: ["placeholder", "queued", "complete", "failed"], default: "placeholder" },
    summary: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("GameAnalysis", gameAnalysisSchema);
