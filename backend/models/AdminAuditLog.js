const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    action: { type: String, required: true, maxlength: 80, index: true },
    targetType: { type: String, required: true, maxlength: 60 },
    targetId: { type: String, required: true, maxlength: 120 },
    details: { type: Object, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);
