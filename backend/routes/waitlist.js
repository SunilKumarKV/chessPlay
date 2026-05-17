const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const validator = require("validator");
const Waitlist = require("../models/Waitlist");
const { sanitizeText } = require("../utils/security");
const { validateBody } = require("../middleware/validate");

const router = express.Router();

const waitlistLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many waitlist attempts. Please try again later." },
});

const validateWaitlist = validateBody({
  email: { required: true, max: 160 },
  source: { max: 80 },
  interest: { max: 120 },
});

router.post("/", waitlistLimiter, validateWaitlist, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!validator.isEmail(email)) return res.status(400).json({ message: "Enter a valid email address." });
    const source = sanitizeText(req.body.source || "app", 80);
    const interest = sanitizeText(req.body.interest || "premium", 120);
    const ipHash = crypto.createHash("sha256").update(`${req.ip}|${req.headers["user-agent"] || ""}`).digest("hex");
    const item = await Waitlist.findOneAndUpdate(
      { email },
      { $setOnInsert: { email, source, interest, ipHash } },
      { upsert: true, new: true },
    );
    res.status(item.createdAt?.getTime() === item.updatedAt?.getTime() ? 201 : 200).json({
      message: "You are on the ChessPlay waitlist.",
      duplicate: item.createdAt?.getTime() !== item.updatedAt?.getTime(),
    });
  } catch {
    res.status(500).json({ message: "Unable to join waitlist." });
  }
});

module.exports = router;
