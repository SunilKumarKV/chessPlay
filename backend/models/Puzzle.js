const mongoose = require("mongoose");

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "master"];

const puzzleSchema = new mongoose.Schema({
  puzzleId: { type: String, required: true, trim: true },
  fen: { type: String, required: true, trim: true },
  moves: [{ type: String, trim: true, lowercase: true, minlength: 4, maxlength: 5 }],
  rating: { type: Number, default: 1200, index: true },
  ratingDeviation: { type: Number, default: 0 },
  popularity: { type: Number, default: 0 },
  nbPlays: { type: Number, default: 0 },
  themes: [{ type: String, trim: true, index: true }],
  gameUrl: { type: String, trim: true, default: "" },
  openingTags: [{ type: String, trim: true }],
  difficulty: {
    type: String,
    enum: DIFFICULTIES,
    default: "beginner",
    index: true,
  },
  source: { type: String, default: "lichess-open-database-cc0", index: true },
  isPremium: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },

  // Future puzzle generation pipeline hooks. These are intentionally dormant:
  // PGN uploads and Stockfish analysis jobs can attach here later without
  // changing the public puzzle contract.
  generation: {
    sourcePgnId: { type: String, trim: true, default: "" },
    analysisJobId: { type: String, trim: true, default: "" },
    method: { type: String, trim: true, default: "lichess-import" },
  },

  attempts: { type: Number, default: 0, min: 0 },
  solves: { type: Number, default: 0, min: 0 },
}, {
  timestamps: true,
});

puzzleSchema.index({ difficulty: 1, isActive: 1, isPremium: 1 });
puzzleSchema.index({ rating: 1, popularity: -1 });
puzzleSchema.index(
  { puzzleId: 1 },
  { unique: true, partialFilterExpression: { puzzleId: { $type: "string" } } },
);

module.exports = mongoose.model("Puzzle", puzzleSchema);
