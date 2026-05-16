const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    maxRedemptions: { type: Number, min: 0, default: 0 },
    redeemedCount: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true, index: true },
    expiresAt: { type: Date, default: null },
    plans: [{ type: String, trim: true }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Coupon", couponSchema);
