const mongoose = require("mongoose");

const allowedPlans = ["supporter_monthly", "supporter_yearly", "pro"];
const allowedMethods = ["upi", "bank", "paypal"];

const supporterRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: allowedPlans,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      max: 100000,
    },
    currency: { type: String, enum: ["INR", "USD"], default: "INR" },
    paymentMethod: { type: String, enum: allowedMethods, default: "upi", index: true },
    upiId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    utr: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 6,
      maxlength: 40,
    },
    bankReference: { type: String, trim: true, maxlength: 80, default: "" },
    payerEmail: { type: String, trim: true, maxlength: 120, default: "" },
    providerReference: { type: String, trim: true, maxlength: 120, default: "" },
    paymentIntentReference: { type: String, trim: true, maxlength: 120, default: "" },
    proofSignature: { type: String, trim: true, maxlength: 128, default: "" },
    paymentDate: { type: Date, default: null },
    paymentProofUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

supporterRequestSchema.index({ user: 1, status: 1 });
supporterRequestSchema.index({ utr: 1 }, { unique: true });

module.exports = mongoose.model("SupporterRequest", supporterRequestSchema);
