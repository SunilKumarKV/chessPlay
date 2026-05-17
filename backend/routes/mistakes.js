const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const MistakeReview = require("../models/MistakeReview");
const { sanitizeText } = require("../utils/security");

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

router.get("/", auth, async (req, res) => {
  const status = ["open", "reviewed", "dismissed"].includes(req.query.status) ? req.query.status : "open";
  const items = await MistakeReview.find({ user: req.user.userId, status }).sort({ updatedAt: -1 }).limit(50);
  res.json({ items });
});

router.post("/", auth, async (req, res) => {
  const fen = sanitizeText(req.body.fen || "", 120);
  if (!fen) return res.status(400).json({ message: "FEN is required." });
  const item = await MistakeReview.create({
    user: req.user.userId,
    game: isValidObjectId(req.body.gameId) ? req.body.gameId : null,
    analysis: isValidObjectId(req.body.analysisId) ? req.body.analysisId : null,
    fen,
    movePlayed: sanitizeText(req.body.movePlayed || "", 12),
    bestMove: sanitizeText(req.body.bestMove || "", 12),
    reason: sanitizeText(req.body.reason || "", 500),
    severity: ["inaccuracy", "mistake", "blunder"].includes(req.body.severity) ? req.body.severity : "mistake",
  });
  res.status(201).json({ item });
});

router.patch("/:id", auth, async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid review item id." });
  const item = await MistakeReview.findOne({ _id: req.params.id, user: req.user.userId });
  if (!item) return res.status(404).json({ message: "Review item not found." });
  if (["open", "reviewed", "dismissed"].includes(req.body.status)) {
    item.status = req.body.status;
    item.reviewedAt = req.body.status === "reviewed" ? new Date() : item.reviewedAt;
  }
  await item.save();
  res.json({ item });
});

module.exports = router;
