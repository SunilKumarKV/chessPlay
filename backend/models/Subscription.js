const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: ["free", "pro", "premium", "lifetime"], required: true, index: true },
    status: { type: String, enum: ["trialing", "active", "pending", "cancelled", "expired"], default: "pending", index: true },
    provider: { type: String, enum: ["manual", "razorpay", "admin"], default: "manual" },
    providerSubscriptionId: { type: String, trim: true, default: "" },
    trialEndsAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true },
);

subscriptionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
