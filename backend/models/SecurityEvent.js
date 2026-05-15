const mongoose = require("mongoose");

const securityEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["register_success", "login_success", "login_failed", "admin_login", "token_rejected", "admin_denied"],
      required: true,
      index: true,
    },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    ip: { type: String, maxlength: 80, default: "", index: true },
    userAgent: { type: String, maxlength: 300, default: "" },
    reason: { type: String, maxlength: 240, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SecurityEvent", securityEventSchema);
