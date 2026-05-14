const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 1000 },
    mode: { type: String, enum: ["free", "paid"], default: "free", index: true },
    entryFee: { type: Number, default: 0, min: 0, max: 100000 },
    currency: { type: String, default: "INR" },
    startsAt: { type: Date, required: true, index: true },
    maxPlayers: { type: Number, default: 32, min: 2, max: 512 },
    status: { type: String, enum: ["draft", "open", "running", "completed", "cancelled"], default: "open", index: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Tournament", tournamentSchema);
