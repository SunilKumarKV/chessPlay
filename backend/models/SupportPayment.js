const mongoose = require("mongoose");

const supportPaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    provider: { type: String, enum: ["razorpay_link", "upi", "manual"], default: "manual", index: true },
    providerReference: { type: String, trim: true, maxlength: 160, default: "", index: true },
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, enum: ["INR", "USD"], default: "INR" },
    status: { type: String, enum: ["created", "paid", "failed", "cancelled"], default: "created", index: true },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    raw: { type: Object, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SupportPayment", supportPaymentSchema);
