const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referred: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    code: { type: String, required: true, uppercase: true, trim: true, index: true },
    status: {
      type: String,
      enum: ["created", "joined", "verified", "reward_eligible", "rewarded", "rejected"],
      default: "created",
      index: true,
    },
    rewardType: { type: String, default: "manual_review" },
    rewardNote: { type: String, default: "" },
    rewardReviewedAt: { type: Date, default: null },
    rewardReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

referralSchema.index({ referrer: 1, referred: 1 }, { unique: true, partialFilterExpression: { referred: { $type: "objectId" } } });
referralSchema.index({ referrer: 1, code: 1 });

module.exports = mongoose.model("Referral", referralSchema);
