const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Referral = require("../models/Referral");
const AdminAuditLog = require("../models/AdminAuditLog");
const { sanitizeText } = require("../utils/security");

const router = express.Router();

const referralLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many referral requests. Please try again later." },
});

function normalizeReferralCode(code) {
  return sanitizeText(code || "", 24).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function writeAudit(req, action, targetType, targetId, details = {}) {
  try {
    await AdminAuditLog.create({
      action,
      targetType,
      targetId,
      details,
      actor: req.user?.userId || null,
      actorEmail: "system",
      ip: req.ip,
      userAgent: req.headers["user-agent"] || "",
    });
  } catch {
    // Audit logging should not block user-facing referral actions.
  }
}

async function ensureReferralCode(user) {
  if (user.referralCode && /^[A-Z0-9]{6,16}$/.test(user.referralCode)) return user.referralCode;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `CP${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.exists({ referralCode: code });
    if (!exists) {
      user.referralCode = code;
      await user.save();
      return code;
    }
  }
  throw new Error("Could not create a unique referral code");
}

function publicReferral(referral) {
  const referred = referral.referred || null;
  return {
    id: referral._id,
    username: referred?.username || "ChessPlay player",
    joinedAt: referral.createdAt,
    status: referral.status === "created" ? "pending" : referral.status,
    rewardStatus: referral.status === "rewarded" ? "rewarded" : referral.status === "rejected" ? "rejected" : "manual_review",
    rewardNote: referral.rewardNote || "Rewards are reviewed manually.",
  };
}

async function referralDashboardForUser(userId) {
  const user = await User.findById(userId).select("username referralCode isSupporter isPremium adsDisabled");
  if (!user) return null;
  const code = await ensureReferralCode(user);
  await Referral.updateOne(
    { referrer: user._id, referred: null, code },
    { $setOnInsert: { referrer: user._id, referred: null, code, status: "created", rewardNote: "Invite link created." } },
    { upsert: true },
  );
  const referralRows = await Referral.find({ referrer: user._id, referred: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("referred", "username createdAt")
    .lean();
  const joined = referralRows.filter((item) => ["joined", "verified", "reward_eligible", "rewarded"].includes(item.status)).length;
  const verified = referralRows.filter((item) => ["verified", "reward_eligible", "rewarded"].includes(item.status)).length;
  const rewarded = referralRows.filter((item) => item.status === "rewarded").length;
  const rewardEligible = referralRows.filter((item) => item.status === "reward_eligible").length;
  return {
    code,
    linkPath: `/register?ref=${code}`,
    stats: {
      invitesSent: referralRows.length,
      joinedUsers: joined,
      verifiedReferrals: verified,
      rewardStatus: rewarded > 0 ? "rewarded" : rewardEligible > 0 ? "eligible for manual review" : "manual review",
    },
    rewards: [
      { threshold: 3, label: "Supporter badge trial", status: joined >= 3 ? "manual review" : "coming soon" },
      { threshold: 5, label: "Early themes access", status: joined >= 5 ? "manual review" : "coming soon" },
      { threshold: 10, label: "Founder supporter badge", status: joined >= 10 ? "manual review" : "coming soon" },
    ],
    referrals: referralRows.map(publicReferral),
    user: {
      username: user.username,
      isSupporter: Boolean(user.isSupporter || user.isPremium),
      adsDisabled: Boolean(user.adsDisabled),
    },
  };
}

async function applyReferralForUser(req, res, rawCode) {
  const code = normalizeReferralCode(rawCode);
  if (!/^[A-Z0-9]{6,16}$/.test(code)) return res.status(400).json({ message: "Invalid referral code." });
  const referrer = await User.findOne({ referralCode: code }).select("_id username referralCode");
  if (!referrer || String(referrer._id) === String(req.user.userId)) return res.status(400).json({ message: "Referral code cannot be used." });
  const user = await User.findById(req.user.userId).select("referredBy referralCode");
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.referredBy) return res.status(409).json({ message: "Referral already connected to this account." });
  user.referredBy = referrer._id;
  await user.save();
  await Referral.updateOne(
    { referrer: referrer._id, referred: user._id },
    { $setOnInsert: { referrer: referrer._id, referred: user._id, code, status: "joined", rewardNote: "Joined through referral. Referrer received 3 bonus puzzle credits." } },
    { upsert: true },
  );
  await User.findByIdAndUpdate(referrer._id, { $inc: { bonusPuzzleCredits: 3 } }).catch(() => {});
  await writeAudit(req, "referral_created", "Referral", user._id, { referrer: String(referrer._id) });
  return res.json({ message: "Referral connected successfully. Rewards are reviewed manually." });
}

router.get("/me", auth, referralLimiter, async (req, res) => {
  const dashboard = await referralDashboardForUser(req.user.userId);
  if (!dashboard) return res.status(404).json({ message: "User not found" });
  res.json(dashboard);
});

router.post("/claim", auth, referralLimiter, async (req, res) => applyReferralForUser(req, res, req.body.code || req.body.referralCode));

module.exports = router;
