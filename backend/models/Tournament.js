const mongoose = require("mongoose");

const tournamentParticipantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["joined", "checked_in", "withdrawn"],
      default: "joined",
      index: true,
    },
  },
  { _id: false },
);

const tournamentRoundSchema = new mongoose.Schema(
  {
    roundNumber: { type: Number, min: 1 },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed"],
      default: "scheduled",
    },
    startsAt: { type: Date, default: null },
    games: [{ type: mongoose.Schema.Types.ObjectId, ref: "Game" }],
  },
  { _id: false },
);

const tournamentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    format: {
      type: String,
      enum: ["rapid", "blitz", "bullet", "classical", "casual"],
      default: "rapid",
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "upcoming", "open", "active", "completed", "cancelled"],
      default: "draft",
      index: true,
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, default: null },
    maxPlayers: { type: Number, default: 32, min: 2, max: 512 },
    players: [tournamentParticipantSchema],
    rounds: [tournamentRoundSchema],
    rules: { type: String, default: "", trim: true, maxlength: 2000 },
    isPublished: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

tournamentSchema.index({ status: 1, startsAt: 1 });
tournamentSchema.index({ isPublished: 1, startsAt: 1 });

module.exports = mongoose.model("Tournament", tournamentSchema);
