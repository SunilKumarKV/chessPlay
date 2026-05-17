const mongoose = require("mongoose");

const emailEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "", index: true },
    type: {
      type: String,
      enum: ["welcome", "payment_success", "trial_expiring"],
      required: true,
      index: true,
    },
    status: { type: String, enum: ["queued", "sent", "failed", "skipped"], default: "queued", index: true },
    payload: { type: Object, default: {} },
    scheduledFor: { type: Date, default: Date.now, index: true },
    sentAt: { type: Date, default: null },
    error: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

emailEventSchema.index({ type: 1, status: 1, scheduledFor: 1 });

module.exports = mongoose.model("EmailEvent", emailEventSchema);
