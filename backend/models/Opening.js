const mongoose = require("mongoose");

const openingSchema = new mongoose.Schema(
  {
    eco: { type: String, required: true, trim: true, uppercase: true, maxlength: 8, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160, index: true },
    moves: { type: String, trim: true, maxlength: 500, default: "" },
    fen: { type: String, trim: true, maxlength: 120, default: "" },
    tags: [{ type: String, trim: true, lowercase: true }],
    source: { type: String, trim: true, maxlength: 120, default: "static-eco-sample" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

openingSchema.index({ eco: 1, name: 1 });

module.exports = mongoose.model("Opening", openingSchema);
