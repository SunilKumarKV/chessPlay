const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referred: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    code: { type: String, required: true, uppercase: true, trim: true, index: true },
    status: { type: String, enum: ["created", "joined", "upgraded", "rewarded"], default: "created", index: true },
    coinsEarned: { type: Number, default: 0, min: 0, max: 100000 },
    rewardReason: { type: String, default: "" },
  },
  { timestamps: true },
);

referralSchema.index({ referrer: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("Referral", referralSchema);
