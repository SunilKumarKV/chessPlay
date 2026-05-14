const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: {
    type: String,
    enum: ["general", "payment", "refund", "bug", "account", "premium", "faq"],
    default: "general",
    index: true,
  },
  subject: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status: {
    type: String,
    enum: ["open", "in_review", "resolved", "closed"],
    default: "open",
    index: true,
  },
  priority: {
    type: String,
    enum: ["low", "normal", "high", "urgent"],
    default: "normal",
  },
  relatedPaymentReference: { type: String, trim: true, maxlength: 120, default: "" },
  adminNotes: { type: String, maxlength: 1000, default: "" },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

supportTicketSchema.pre("save", function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
