const express = require("express");
const Opening = require("../models/Opening");
const { sanitizeText } = require("../utils/security");

const router = express.Router();

const STATIC_OPENINGS = [
  { eco: "C20", name: "King's Pawn Game", moves: "1. e4 e5", tags: ["open", "classical"] },
  { eco: "B20", name: "Sicilian Defense", moves: "1. e4 c5", tags: ["semi-open", "counterplay"] },
  { eco: "D00", name: "Queen's Pawn Game", moves: "1. d4 d5", tags: ["closed", "classical"] },
  { eco: "A40", name: "Modern Defense", moves: "1. d4 g6", tags: ["hypermodern"] },
  { eco: "C50", name: "Italian Game", moves: "1. e4 e5 2. Nf3 Nc6 3. Bc4", tags: ["development", "open"] },
];

router.get("/search", async (req, res) => {
  const q = sanitizeText(req.query.q || "", 80);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 25);
  const regex = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
  const dbQuery = regex ? { isActive: true, $or: [{ eco: regex }, { name: regex }, { moves: regex }, { tags: regex }] } : { isActive: true };
  const openings = await Opening.find(dbQuery).sort({ eco: 1 }).limit(limit).lean().catch(() => []);
  const fallback = STATIC_OPENINGS.filter((item) => !q || regex.test(item.eco) || regex.test(item.name) || regex.test(item.moves) || item.tags.some((tag) => regex.test(tag))).slice(0, limit);
  res.json({ openings: openings.length ? openings : fallback, source: openings.length ? "database" : "static-eco-sample" });
});

module.exports = router;
