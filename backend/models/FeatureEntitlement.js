const mongoose = require("mongoose");

const featureEntitlementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    feature: { type: String, required: true, trim: true, index: true },
    enabled: { type: Boolean, default: true },
    source: { type: String, enum: ["plan", "admin", "trial", "coupon"], default: "plan" },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

featureEntitlementSchema.index({ user: 1, feature: 1 }, { unique: true });

module.exports = mongoose.model("FeatureEntitlement", featureEntitlementSchema);
