const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    category: { type: String, enum: ["bug", "feature", "payment", "general"], default: "general", index: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    page: { type: String, trim: true, maxlength: 200, default: "" },
    status: { type: String, enum: ["open", "in_review", "resolved", "closed"], default: "open", index: true },
    userAgent: { type: String, trim: true, maxlength: 300, default: "" },
    ipHash: { type: String, trim: true, default: "" },
    adminNotes: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true },
);

feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
