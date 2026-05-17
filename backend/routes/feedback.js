const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const Feedback = require("../models/Feedback");
const User = require("../models/User");
const { getJwtSecret, getRequestAccessToken, sanitizeText } = require("../utils/security");
const { validateBody } = require("../middleware/validate");

const router = express.Router();
const VALID_CATEGORIES = new Set(["bug", "feature", "payment", "general"]);

const feedbackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many feedback submissions. Please try again later." },
});

const validateFeedback = validateBody({
  category: { max: 40, pattern: /^[a-z_]*$/ },
  message: { required: true, max: 2000 },
  email: { max: 160 },
  page: { max: 200 },
});

async function optionalAuth(req, _res, next) {
  try {
    const token = getRequestAccessToken(req);
    if (!token) return next();
    const decoded = jwt.verify(token, getJwtSecret("access"));
    req.feedbackUser = await User.findById(decoded.userId).select("_id email");
  } catch {
    req.feedbackUser = null;
  }
  return next();
}

router.post("/", feedbackLimiter, optionalAuth, validateFeedback, async (req, res) => {
  try {
    const category = VALID_CATEGORIES.has(req.body.category) ? req.body.category : "general";
    const message = sanitizeText(req.body.message, 2000);
    if (!message || message.length < 8) return res.status(400).json({ message: "Feedback message is too short." });
    const ipHash = crypto.createHash("sha256").update(`${req.ip}|${req.headers["user-agent"] || ""}`).digest("hex");
    const feedback = await Feedback.create({
      user: req.feedbackUser?._id || null,
      email: sanitizeText(req.body.email || req.feedbackUser?.email || "", 160).toLowerCase(),
      category,
      message,
      page: sanitizeText(req.body.page || "", 200),
      userAgent: sanitizeText(req.headers["user-agent"] || "", 300),
      ipHash,
    });
    res.status(201).json({ message: "Thanks. Feedback submitted.", feedbackId: feedback._id });
  } catch {
    res.status(500).json({ message: "Unable to submit feedback." });
  }
});

module.exports = router;
