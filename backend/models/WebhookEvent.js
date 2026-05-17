const mongoose = require("mongoose");

const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ["razorpay"], default: "razorpay", index: true },
    eventId: { type: String, required: true, trim: true },
    eventType: { type: String, trim: true, maxlength: 120, default: "", index: true },
    status: { type: String, enum: ["processed", "ignored", "failed"], default: "processed", index: true },
    raw: { type: Object, default: {} },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model("WebhookEvent", webhookEventSchema);
