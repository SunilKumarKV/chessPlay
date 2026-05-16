const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    provider: { type: String, enum: ["razorpay", "manual", "upi", "paypal", "bank"], default: "manual", index: true },
    providerOrderId: { type: String, trim: true, default: "", index: true },
    providerPaymentId: { type: String, trim: true, default: "", index: true },
    webhookEventId: { type: String, trim: true, default: "" },
    plan: { type: String, enum: ["free", "pro", "premium", "lifetime", "supporter_monthly", "supporter_yearly"], default: "free" },
    amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ["INR", "USD"], default: "INR" },
    status: { type: String, enum: ["created", "paid", "failed", "refunded", "duplicate"], default: "created", index: true },
    raw: { type: Object, default: {} },
  },
  { timestamps: true },
);

paymentSchema.index({ webhookEventId: 1 }, { unique: true, partialFilterExpression: { webhookEventId: { $gt: "" } } });

module.exports = mongoose.model("Payment", paymentSchema);
