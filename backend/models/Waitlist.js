const mongoose = require("mongoose");

const waitlistSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    source: { type: String, trim: true, maxlength: 80, default: "app" },
    interest: { type: String, trim: true, maxlength: 120, default: "premium" },
    status: { type: String, enum: ["joined", "contacted", "converted", "unsubscribed"], default: "joined", index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    ipHash: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Waitlist", waitlistSchema);
