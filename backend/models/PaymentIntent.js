const mongoose = require("mongoose");

const paymentIntentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: ["supporter_monthly", "supporter_yearly", "pro"], required: true },
    amount: { type: Number, required: true, min: 1, max: 100000 },
    currency: { type: String, default: "INR", enum: ["INR", "USD"] },
    provider: { type: String, enum: ["upi", "bank", "qr", "paypal", "stripe", "manual"], required: true },
    status: { type: String, enum: ["created", "pending_proof", "submitted", "verified", "failed", "cancelled"], default: "created", index: true },
    reference: { type: String, required: true, unique: true, index: true },
    providerCheckoutUrl: { type: String, default: "" },
    metadata: { type: Object, default: {} },
    signature: { type: String, default: "" },
    verifiedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true },
);

paymentIntentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("PaymentIntent", paymentIntentSchema);
