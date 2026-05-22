// @ts-nocheck
import express from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import SupportPayment from "../models/SupportPayment";
import { getJwtSecret, getRequestAccessToken, sanitizeText } from "../utils/security";

const router = express.Router();

const supportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many support requests. Please try again later." },
});

async function optionalAuth(req, _res, next) {
  const token = getRequestAccessToken(req);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, getJwtSecret("access"));
    req.supportUserId = decoded.userId || null;
  } catch {
    req.supportUserId = null;
  }
  next();
}

router.post("/record", supportLimiter, optionalAuth, async (req, res) => {
  const amount = Math.max(0, Math.min(100000, Number(req.body.amount || 0)));
  const payment = await SupportPayment.create({
    user: req.supportUserId,
    email: sanitizeText(req.body.email || "", 160).toLowerCase(),
    provider: ["razorpay_link", "upi", "manual"].includes(req.body.provider) ? req.body.provider : "manual",
    providerReference: sanitizeText(req.body.providerReference || "", 160),
    amount,
    currency: req.body.currency === "USD" ? "USD" : "INR",
    status: ["created", "paid", "failed", "cancelled"].includes(req.body.status) ? req.body.status : "created",
    note: sanitizeText(req.body.note || "", 500),
  });
  res.status(201).json({ payment });
});

router.get("/history/me", optionalAuth, async (req, res) => {
  if (!req.supportUserId) return res.status(401).json({ message: "Please sign in to view support history." });
  const payments = await SupportPayment.find({ user: req.supportUserId }).sort({ createdAt: -1 }).limit(50);
  res.json({ payments });
});

export default router;
