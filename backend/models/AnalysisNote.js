const mongoose = require("mongoose");

const analysisNoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  gameId: { type: String, trim: true, maxlength: 120, index: true, default: "manual" },
  fen: { type: String, trim: true, maxlength: 120, default: "" },
  pgn: { type: String, trim: true, maxlength: 12000, default: "" },
  note: { type: String, trim: true, maxlength: 2000, default: "" },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

analysisNoteSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

analysisNoteSchema.index({ user: 1, gameId: 1 }, { unique: true });

module.exports = mongoose.model("AnalysisNote", analysisNoteSchema);
