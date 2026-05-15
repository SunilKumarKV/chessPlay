const mongoose = require("mongoose");

const puzzleSchema = new mongoose.Schema({
  fen: { type: String, required: true, trim: true },
  moves: [{ type: String, trim: true, minlength: 4, maxlength: 5 }],
  solution: [{ type: String, trim: true, minlength: 4, maxlength: 5 }],
  difficulty: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    default: "beginner",
    index: true,
  },
  theme: {
    type: String,
    enum: ["checkmate", "forks", "pins", "skewers", "endgames", "opening-traps", "mixed"],
    default: "mixed",
    index: true,
  },
  title: { type: String, trim: true, maxlength: 100, default: "Chess tactic" },
  instruction: { type: String, trim: true, maxlength: 220, default: "Find the best move." },
  isPublished: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  attempts: { type: Number, default: 0, min: 0 },
  solves: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

puzzleSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Puzzle", puzzleSchema);
