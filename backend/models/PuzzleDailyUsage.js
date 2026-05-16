const mongoose = require("mongoose");

const puzzleDailyUsageSchema = new mongoose.Schema({
  ownerKey: { type: String, required: true, trim: true, index: true },
  ownerType: { type: String, enum: ["guest", "user"], required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  guestKey: { type: String, trim: true, default: "" },
  dateKey: { type: String, required: true, trim: true, index: true },
  plan: {
    type: String,
    enum: ["guest", "free", "premium_basic", "premium_pro", "premium_lifetime"],
    default: "guest",
  },
  limit: { type: Number, required: true, min: 0 },
  used: { type: Number, default: 0, min: 0 },
  puzzleIds: [{ type: String, trim: true }],
}, {
  timestamps: true,
});

puzzleDailyUsageSchema.index({ ownerKey: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model("PuzzleDailyUsage", puzzleDailyUsageSchema);
