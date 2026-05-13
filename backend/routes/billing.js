const express = require("express");
const validator = require("validator");
const auth = require("../middleware/auth");
const User = require("../models/User");
const SupporterRequest = require("../models/SupporterRequest");
const { sanitizeText } = require("../utils/security");

const router = express.Router();

const PLAN_CONFIG = {
  supporter_monthly: {
    label: "Supporter Monthly",
    amount: 49,
    days: 30,
    benefits: ["No ads", "Premium supporter badge", "Early beta access"],
  },
  supporter_yearly: {
    label: "Supporter Yearly",
    amount: 499,
    days: 365,
    benefits: ["No ads", "Premium supporter badge", "Early beta access", "Best value"],
  },
  pro: {
    label: "Pro",
    amount: 999,
    days: 365,
    benefits: ["No ads", "Pro badge", "Future tournaments", "Advanced analysis"],
  },
};

function parseAdminEmails() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select("email isAdmin");
    const adminEmails = parseAdminEmails();
    if (!user || (!user.isAdmin && !adminEmails.includes(String(user.email).toLowerCase()))) {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.adminUser = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "Admin check failed" });
  }
}

function validateUpiId(value) {
  const upi = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,}@[a-z0-9._-]{2,}$/i.test(upi) || upi.length > 80) {
    return null;
  }
  return upi;
}

function validateUtr(value) {
  const utr = String(value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6,40}$/.test(utr)) return null;
  return utr;
}

function publicBillingUser(user) {
  const planExpired = user.planExpiresAt && new Date(user.planExpiresAt).getTime() < Date.now();
  return {
    plan: planExpired ? "free" : user.plan || "free",
    planStatus: planExpired ? "expired" : user.planStatus || "active",
    planStartedAt: user.planStartedAt || null,
    planExpiresAt: user.planExpiresAt || null,
    isSupporter: !planExpired && Boolean(user.isSupporter),
    isPremium: !planExpired && Boolean(user.isPremium),
    supporterSince: user.supporterSince || null,
    supporterPlan: planExpired ? "none" : user.supporterPlan || "none",
    supporterExpiresAt: user.supporterExpiresAt || null,
    adsDisabled: !planExpired && Boolean(user.adsDisabled),
  };
}

router.get("/plans", (_req, res) => {
  res.json({
    currency: "INR",
    upiId: process.env.UPI_ID || "your-upi-id@bank",
    merchantName: process.env.UPI_MERCHANT_NAME || "ChessPlay",
    plans: PLAN_CONFIG,
  });
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    "plan planStatus planStartedAt planExpiresAt isSupporter isPremium supporterSince supporterPlan supporterExpiresAt adsDisabled",
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  const requests = await SupporterRequest.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("plan amount upiId utr paymentProofUrl status rejectionReason expiresAt createdAt updatedAt");
  res.json({ billing: publicBillingUser(user), requests });
});

router.post("/upi-request", auth, async (req, res) => {
  try {
    const plan = String(req.body.plan || "").trim();
    const config = PLAN_CONFIG[plan];
    if (!config) return res.status(400).json({ message: "Invalid supporter plan" });

    const upiId = validateUpiId(req.body.upiId);
    if (!upiId) return res.status(400).json({ message: "Enter a valid UPI ID, for example name@bank" });

    const utr = validateUtr(req.body.utr);
    if (!utr) return res.status(400).json({ message: "Enter a valid UPI UTR/reference number" });

    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount < config.amount) {
      return res.status(400).json({ message: `Minimum amount for this plan is ₹${config.amount}` });
    }

    const paymentProofUrl = String(req.body.paymentProofUrl || "").trim();
    if (paymentProofUrl && !validator.isURL(paymentProofUrl, { require_protocol: true })) {
      return res.status(400).json({ message: "Payment proof must be a valid https URL" });
    }

    const pendingExists = await SupporterRequest.exists({ user: req.user.userId, status: "pending" });
    if (pendingExists) {
      return res.status(409).json({ message: "You already have a pending supporter request" });
    }

    const duplicateUtr = await SupporterRequest.exists({ utr });
    if (duplicateUtr) {
      return res.status(409).json({ message: "This UTR/reference number was already submitted" });
    }

    const request = await SupporterRequest.create({
      user: req.user.userId,
      plan,
      amount,
      upiId,
      utr,
      paymentProofUrl,
      note: sanitizeText(req.body.note, 500),
    });

    await User.findByIdAndUpdate(req.user.userId, { planStatus: "pending" });

    res.status(201).json({
      message: "Supporter request submitted. Admin approval is required before premium access is enabled.",
      request,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "This UTR/reference number was already submitted" });
    }
    console.error("Supporter request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/admin/requests", auth, requireAdmin, async (req, res) => {
  const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : undefined;
  const filter = status ? { status } : {};
  const requests = await SupporterRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user", "username email rating plan planStatus isSupporter isPremium supporterExpiresAt")
    .populate("reviewedBy", "username email");
  res.json({ requests });
});

router.patch("/admin/requests/:id/approve", auth, requireAdmin, async (req, res) => {
  try {
    const request = await SupporterRequest.findById(req.params.id).populate("user");
    if (!request) return res.status(404).json({ message: "Supporter request not found" });
    if (request.status !== "pending") return res.status(409).json({ message: "Request is already reviewed" });

    const config = PLAN_CONFIG[request.plan];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.days * 24 * 60 * 60 * 1000);

    request.status = "approved";
    request.reviewedBy = req.adminUser._id;
    request.reviewedAt = now;
    request.expiresAt = expiresAt;
    await request.save();

    const user = request.user;
    user.plan = request.plan;
    user.planStatus = "active";
    user.planStartedAt = now;
    user.planExpiresAt = expiresAt;
    user.isSupporter = true;
    user.isPremium = true;
    user.supporterSince = user.supporterSince || now;
    user.supporterPlan = request.plan;
    user.supporterExpiresAt = expiresAt;
    user.adsDisabled = true;
    await user.save();

    res.json({ message: "Supporter approved", request, billing: publicBillingUser(user) });
  } catch (error) {
    console.error("Approve supporter error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/admin/requests/:id/reject", auth, requireAdmin, async (req, res) => {
  try {
    const request = await SupporterRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Supporter request not found" });
    if (request.status !== "pending") return res.status(409).json({ message: "Request is already reviewed" });

    request.status = "rejected";
    request.reviewedBy = req.adminUser._id;
    request.reviewedAt = new Date();
    request.rejectionReason = sanitizeText(req.body.reason || "Payment could not be verified", 300);
    await request.save();

    const hasPending = await SupporterRequest.exists({ user: request.user, status: "pending" });
    if (!hasPending) await User.findByIdAndUpdate(request.user, { planStatus: "active" });

    res.json({ message: "Supporter request rejected", request });
  } catch (error) {
    console.error("Reject supporter error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/admin/users/:id/plan", auth, requireAdmin, async (req, res) => {
  try {
    const plan = String(req.body.plan || "free");
    const config = PLAN_CONFIG[plan];
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (plan === "free") {
      user.plan = "free";
      user.planStatus = "active";
      user.planExpiresAt = null;
      user.isSupporter = false;
      user.isPremium = false;
      user.supporterPlan = "none";
      user.supporterExpiresAt = null;
      user.adsDisabled = false;
    } else if (config) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + config.days * 24 * 60 * 60 * 1000);
      user.plan = plan;
      user.planStatus = "active";
      user.planStartedAt = now;
      user.planExpiresAt = expiresAt;
      user.isSupporter = true;
      user.isPremium = true;
      user.supporterSince = user.supporterSince || now;
      user.supporterPlan = plan;
      user.supporterExpiresAt = expiresAt;
      user.adsDisabled = true;
    } else {
      return res.status(400).json({ message: "Invalid plan" });
    }

    await user.save();
    res.json({ message: "User plan updated", billing: publicBillingUser(user) });
  } catch (error) {
    console.error("Admin plan update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
