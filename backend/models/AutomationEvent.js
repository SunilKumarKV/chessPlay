const mongoose = require("mongoose");

const automationEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "payment_submitted",
      "payment_approved",
      "payment_rejected",
      "support_ticket_created",
      "refund_requested",
      "faq_question",
      "bot_test",
    ],
    required: true,
    index: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  status: {
    type: String,
    enum: ["queued", "sent", "partial", "failed"],
    default: "queued",
    index: true,
  },
  channels: [{ type: String, enum: ["telegram", "whatsapp", "email"] }],
  title: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 2000 },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  responses: { type: mongoose.Schema.Types.Mixed, default: {} },
  error: { type: String, default: "", maxlength: 2000 },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

automationEventSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("AutomationEvent", automationEventSchema);
