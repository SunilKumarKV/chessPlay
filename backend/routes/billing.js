const crypto = require("crypto");
const mongoose = require("mongoose");
const express = require("express");
const rateLimit = require("express-rate-limit");
const validator = require("validator");
const auth = require("../middleware/auth");
const User = require("../models/User");
const SupporterRequest = require("../models/SupporterRequest");
const PaymentIntent = require("../models/PaymentIntent");
const AdminAuditLog = require("../models/AdminAuditLog");
const Referral = require("../models/Referral");
const Tournament = require("../models/Tournament");
const { sanitizeText } = require("../utils/security");
const { sendAutomationNotification } = require("../utils/automationBot");
const { getPremiumPlanConfig } = require("../src/services/premiumPlans");

const router = express.Router();

const supporterRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many supporter requests. Please try again later." },
});

const PLAN_CONFIG = {
  supporter_monthly: {
    label: "Supporter Monthly",
    amount: 49,
    usdAmount: 2,
    days: 30,
    benefits: ["No ads", "Premium sounds", "Premium badge", "Advanced analysis credits"],
    entitlements: { noAds: true, premiumSounds: true, premiumThemes: true, earlyAccess: true },
  },
  supporter_yearly: {
    label: "Supporter Yearly",
    amount: 499,
    usdAmount: 12,
    days: 365,
    benefits: ["No ads", "Premium sounds", "Custom boards", "Best value", "Early beta access"],
    entitlements: { noAds: true, premiumSounds: true, customBoards: true, premiumThemes: true, unlimitedGameReview: true, earlyAccess: true },
  },
  pro: {
    label: "Pro",
    amount: 99,
    usdAmount: 3,
    days: 30,
    benefits: ["No ads", "25 puzzles/day", "Premium sounds", "Early feature access"],
    entitlements: { noAds: true, premiumSounds: true, premiumThemes: true, earlyAccess: true },
  },
  premium: {
    label: "Premium",
    amount: 299,
    usdAmount: 8,
    days: 30,
    benefits: ["No ads", "100 puzzles/day", "Premium filters", "Advanced analysis placeholders", "Priority feedback"],
    entitlements: { noAds: true, premiumSounds: true, unlimitedAnalysis: true, advancedEngineDepth: true, customBoards: true, premiumThemes: true, advancedStats: true, unlimitedGameReview: true, earlyAccess: true },
  },
  lifetime: {
    label: "Lifetime",
    amount: 2999,
    usdAmount: 79,
    days: 36500,
    benefits: ["No ads", "200 puzzles/day", "Lifetime badge", "All premium placeholders", "Priority roadmap voting"],
    entitlements: { noAds: true, premiumSounds: true, unlimitedAnalysis: true, advancedEngineDepth: true, customBoards: true, premiumThemes: true, advancedStats: true, unlimitedGameReview: true, tournaments: true, earlyAccess: true },
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
  } catch {
    res.status(500).json({ message: "Admin check failed" });
  }
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

function billingMessageFor(status) {
  if (status === 401) return "Session expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "Payment request not found.";
  return "Unable to update billing information. Please try again.";
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateUpiId(value) {
  const upi = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,}@[a-z0-9._-]{2,}$/i.test(upi) || upi.length > 80) return null;
  return upi;
}

function validateUtr(value) {
  const utr = String(value || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{6,60}$/.test(utr)) return null;
  return utr;
}

function signPayload(payload) {
  const secret = process.env.PAYMENT_SIGNING_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "local-dev-signing-secret-change-me";
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}

function createReference(provider) {
  return `CP-${provider.toUpperCase()}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function paymentMethodsFor(plan) {
  const selected = PLAN_CONFIG[plan] || PLAN_CONFIG.supporter_monthly;
  const upiId = process.env.UPI_ID || "";
  const merchantName = process.env.UPI_MERCHANT_NAME || "ChessPlay";
  const qrUrl = process.env.UPI_QR_URL || "";
  const bank = {
    accountName: process.env.BANK_ACCOUNT_NAME || "",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || "",
    ifsc: process.env.BANK_IFSC || "",
    bankName: process.env.BANK_NAME || "",
  };
  const bankConfigured = Boolean(bank.accountName && bank.accountNumber && bank.ifsc && bank.bankName);
  return {
    india: [
      { id: "upi", label: "UPI ID", upiId, merchantName, amount: selected.amount, currency: "INR", configured: Boolean(upiId) },
      { id: "qr", label: "QR Scan", qrUrl, upiId, merchantName, amount: selected.amount, currency: "INR", configured: Boolean(upiId && qrUrl) },
      { id: "bank", label: "Bank Transfer", bank, amount: selected.amount, currency: "INR", configured: bankConfigured },
    ],
    global: [
      { id: "paypal", label: "PayPal", checkoutUrl: process.env.PAYPAL_CHECKOUT_URL || "", paypalEmail: process.env.PAYPAL_EMAIL || "", amount: selected.usdAmount, currency: "USD", configured: Boolean(process.env.PAYPAL_CHECKOUT_URL || process.env.PAYPAL_EMAIL) },
    ],
    manualFallback: { enabled: true, label: "Manual approval fallback" },
  };
}

function publicBillingUser(user) {
  const planExpired = user.planExpiresAt && new Date(user.planExpiresAt).getTime() < Date.now();
  const entitlements = user.entitlements || {};
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
    adsDisabled: !planExpired && (Boolean(user.adsDisabled) || Boolean(entitlements.noAds)),
    coins: user.coins || 0,
    analysisCredits: user.analysisCredits || 0,
    entitlements: planExpired ? {} : entitlements,
  };
}

async function writeAudit(req, action, targetType, targetId, details = {}) {
  try {
    await AdminAuditLog.create({
      actor: req.adminUser?._id || req.user?.userId || null,
      action,
      targetType,
      targetId: String(targetId),
      details,
      ip: req.ip,
      userAgent: req.headers["user-agent"] || "",
    });
  } catch (error) {
    console.warn("Audit log failed:", error.message);
  }
}

async function applyPlanToUser(user, plan, req) {
  const config = PLAN_CONFIG[plan];
  if (!config) throw new Error("Invalid plan");
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
  user.entitlements = { ...(user.entitlements || {}), ...config.entitlements };
  user.analysisCredits = config.entitlements.unlimitedAnalysis ? Math.max(user.analysisCredits || 0, 9999) : Math.max(user.analysisCredits || 0, 100);
  await user.save();

  const referral = await Referral.findOne({ referred: user._id, status: { $in: ["joined", "upgraded"] } });
  if (referral && referral.status !== "rewarded") {
    const rewardCoins = plan === "pro" ? 500 : 150;
    referral.status = "rewarded";
    referral.coinsEarned = rewardCoins;
    referral.rewardReason = `${plan} upgrade`;
    await referral.save();
    await User.findByIdAndUpdate(referral.referrer, { $inc: { coins: rewardCoins } });
    await writeAudit(req, "referral.rewarded", "Referral", referral._id, { rewardCoins, plan });
  }

  return expiresAt;
}

router.get("/plans", async (_req, res) => {
  const plans = await getPremiumPlanConfig(PLAN_CONFIG);
  res.json({
    currency: "INR",
    upiId: process.env.UPI_ID || "",
    merchantName: process.env.UPI_MERCHANT_NAME || "ChessPlay",
    plans,
    paymentMethods: paymentMethodsFor("supporter_monthly"),
    support: {
      contactEmail: process.env.SUPPORT_EMAIL_TO || process.env.ADMIN_EMAIL || "",
      manualVerification: true,
      message: "Payments are manually verified by admin before supporter benefits are enabled.",
    },
    adNetworks: {
      web: ["Google AdSense", "Media.net"],
      mobileLater: ["AdMob", "Unity Ads"],
    },
  });
});

router.get("/payment-methods", (req, res) => {
  const plan = String(req.query.plan || "supporter_monthly");
  res.json({ plan, methods: paymentMethodsFor(plan) });
});

router.post("/payment-intents", auth, async (req, res) => {
  try {
    const plan = String(req.body.plan || "");
    const provider = String(req.body.provider || "manual").toLowerCase();
    const config = PLAN_CONFIG[plan];
    if (!config) return res.status(400).json({ message: "Invalid plan" });
    if (!["upi", "bank", "paypal", "manual"].includes(provider)) return res.status(400).json({ message: "Invalid payment provider" });
    const configuredMethod = [...paymentMethodsFor(plan).india, ...paymentMethodsFor(plan).global].find((method) => method.id === provider);
    if (configuredMethod && configuredMethod.configured === false) return res.status(503).json({ message: "This payment method is not active yet. Please choose an active method or contact support." });

    const amount = provider === "paypal" ? config.usdAmount : config.amount;
    const currency = provider === "paypal" ? "USD" : "INR";
    const reference = createReference(provider);
    const providerCheckoutUrl = provider === "paypal" ? (process.env.PAYPAL_CHECKOUT_URL || "") : "";
    const payload = { userId: req.user.userId, plan, provider, amount, currency, reference };
    const signature = signPayload(payload);

    const intent = await PaymentIntent.create({ user: req.user.userId, plan, provider, amount, currency, reference, providerCheckoutUrl, signature, metadata: { paymentMethods: paymentMethodsFor(plan) } });
    res.status(201).json({ intent, signature, message: "Payment intent created. Submit proof after payment if webhook is not configured." });
  } catch (error) {
    console.error("Payment intent error:", error);
    res.status(500).json({ message: "Could not create payment intent" });
  }
});

router.post("/webhooks/:provider", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const provider = String(req.params.provider || "").toLowerCase();
    const webhookSecret = provider === "stripe" ? process.env.STRIPE_WEBHOOK_SECRET : process.env.PAYPAL_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(503).json({ message: `${provider} webhook secret is not configured` });
    const signature = req.headers["x-chessplay-signature"] || req.headers["stripe-signature"] || req.headers["paypal-transmission-sig"];
    if (!signature) return res.status(401).json({ message: "Webhook signature missing" });
    // Provider-specific SDK verification should be added when live credentials are enabled.
    res.json({ received: true, provider, mode: "signature-present-safe-stub" });
  } catch {
    res.status(400).json({ message: "Webhook failed" });
  }
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select(
    "plan planStatus planStartedAt planExpiresAt isSupporter isPremium supporterSince supporterPlan supporterExpiresAt adsDisabled coins analysisCredits entitlements referralCode",
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  const requests = await SupporterRequest.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(25)
    .select("plan amount currency paymentMethod upiId utr bankReference payerEmail providerReference paymentProofUrl status rejectionReason reviewedAt expiresAt paymentDate note createdAt updatedAt");
  const intents = await PaymentIntent.find({ user: user._id }).sort({ createdAt: -1 }).limit(5).select("plan provider amount currency status reference providerCheckoutUrl createdAt expiresAt");
  res.json({ billing: publicBillingUser(user), requests, intents, referralCode: user.referralCode || null });
});

router.post("/upi-request", auth, supporterRequestLimiter, async (req, res) => {
  try {
    const plan = String(req.body.plan || "").trim();
    const config = PLAN_CONFIG[plan];
    if (!config) return res.status(400).json({ message: "Invalid supporter plan" });

    const paymentMethod = String(req.body.paymentMethod || "upi").toLowerCase();
    if (!["upi", "bank", "paypal"].includes(paymentMethod)) return res.status(400).json({ message: "Invalid payment method" });
    const configuredMethod = [...paymentMethodsFor(plan).india, ...paymentMethodsFor(plan).global].find((method) => method.id === paymentMethod);
    if (configuredMethod && configuredMethod.configured === false) return res.status(503).json({ message: "This payment method is not active yet. Please choose an active method or contact support." });

    const amount = Number(req.body.amount);
    const minAmount = paymentMethod === "paypal" ? config.usdAmount : config.amount;
    if (!Number.isFinite(amount) || amount < minAmount) return res.status(400).json({ message: `Minimum amount for this plan is ${paymentMethod === "paypal" ? "$" : "₹"}${minAmount}` });

    const utr = validateUtr(req.body.utr || req.body.bankReference || req.body.providerReference);
    if (!utr) return res.status(400).json({ message: "Enter a valid UTR / bank / provider reference number" });

    const upiId = paymentMethod === "upi" ? validateUpiId(req.body.upiId) : "manual@payment";
    if (paymentMethod === "upi" && !upiId) return res.status(400).json({ message: "Enter a valid UPI ID, for example name@bank" });

    const paymentProofUrl = String(req.body.paymentProofUrl || "").trim();
    if (paymentProofUrl && !validator.isURL(paymentProofUrl, { require_protocol: true, protocols: ["https"] })) return res.status(400).json({ message: "Payment proof must be a valid https URL" });

    const pendingExists = await SupporterRequest.exists({ user: req.user.userId, status: "pending" });
    if (pendingExists) return res.status(409).json({ message: "You already have a pending supporter request" });

    const duplicateUtr = await SupporterRequest.exists({ utr });
    if (duplicateUtr) return res.status(409).json({ message: "This reference number was already submitted" });

    const proofPayload = { userId: req.user.userId, plan, amount, paymentMethod, utr, at: new Date().toISOString() };
    const proofSignature = signPayload(proofPayload);
    const request = await SupporterRequest.create({
      user: req.user.userId,
      plan,
      amount,
      currency: paymentMethod === "paypal" ? "USD" : "INR",
      paymentMethod,
      upiId,
      utr,
      bankReference: sanitizeText(req.body.bankReference || "", 80),
      payerEmail: sanitizeText(req.body.payerEmail || "", 120),
      providerReference: sanitizeText(req.body.providerReference || "", 120),
      paymentIntentReference: sanitizeText(req.body.paymentIntentReference || "", 120),
      paymentProofUrl,
      proofSignature,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : null,
      note: sanitizeText(req.body.note, 500),
    });

    await User.findByIdAndUpdate(req.user.userId, { planStatus: "pending" });
    await writeAudit(req, "payment_request_created", "SupporterRequest", request._id, { plan, amount, method: paymentMethod });
    const user = await User.findById(req.user.userId).select("username email");
    await sendAutomationNotification({
      type: "payment_submitted",
      user: req.user.userId,
      title: "New payment proof submitted",
      message: `${user?.username || "User"} submitted ${paymentMethod.toUpperCase()} proof for ${config.label}.`,
      payload: {
        requestId: String(request._id),
        userEmail: user?.email,
        plan,
        method: paymentMethod,
        reference: utr,
        amount,
        currency: request.currency,
      },
    });
    res.status(201).json({ message: "Payment proof submitted. Admin approval is required before premium access is enabled.", request });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "This reference number was already submitted" });
    console.error("Supporter request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/admin/requests", auth, requireAdmin, async (req, res) => {
  try {
    const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : undefined;
    const search = sanitizeText(req.query.search || "", 80);
    const filter = status ? { status } : {};
    if (search) {
      filter.$or = [
        { utr: new RegExp(escapeRegExp(search), "i") },
        { bankReference: new RegExp(escapeRegExp(search), "i") },
        { providerReference: new RegExp(escapeRegExp(search), "i") },
        { payerEmail: new RegExp(escapeRegExp(search), "i") },
      ];
    }

    const requests = await SupporterRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("user", "username email rating plan planStatus isSupporter isPremium supporterExpiresAt adsDisabled coins")
      .populate("reviewedBy", "username email");

    const filtered = search
      ? requests.filter((request) => {
          const value = `${request.user?.username || ""} ${request.user?.email || ""} ${request.utr || ""} ${request.bankReference || ""} ${request.providerReference || ""} ${request.payerEmail || ""}`.toLowerCase();
          return value.includes(search.toLowerCase());
        })
      : requests;

    res.json({ requests: filtered });
  } catch (error) {
    console.error("Admin billing request list error:", error.message);
    res.status(500).json({ message: "Unable to load payment requests." });
  }
});

router.patch("/admin/requests/:id/approve", auth, requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid payment request ID" });
    const request = await SupporterRequest.findById(req.params.id).populate("user");
    if (!request) return res.status(404).json({ message: "Supporter request not found" });
    if (request.status !== "pending") return res.status(409).json({ message: "Request is already reviewed" });
    const user = request.user;
    const expiresAt = await applyPlanToUser(user, request.plan, req);
    request.status = "approved";
    request.reviewedBy = req.adminUser._id;
    request.reviewedAt = new Date();
    request.expiresAt = expiresAt;
    await request.save();
    await writeAudit(req, "payment_request_approved", "SupporterRequest", request._id, { plan: request.plan, amount: request.amount, method: request.paymentMethod });
    await writeAudit(req, "supporter_enabled", "User", user._id, { plan: request.plan, requestId: String(request._id), adsDisabled: true });
    await sendAutomationNotification({
      type: "payment_approved",
      user: user._id,
      title: "Premium plan approved",
      message: `${user.username || user.email} is now premium until ${expiresAt.toDateString()}.`,
      payload: { requestId: String(request._id), userEmail: user.email, plan: request.plan, reference: request.utr, amount: request.amount, currency: request.currency, expiresAt },
    });
    res.json({ message: "Payment request approved successfully.", request, billing: publicBillingUser(user) });
  } catch (error) {
    console.error("Approve supporter error:", error.message);
    res.status(500).json({ message: billingMessageFor(500) });
  }
});

router.patch("/admin/requests/:id/reject", auth, requireAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid payment request ID" });
    const reason = sanitizeText(req.body.reason || "", 300);
    if (!reason || reason.length < 6) return res.status(400).json({ message: "Rejection reason is required." });
    const request = await SupporterRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Supporter request not found" });
    if (request.status !== "pending") return res.status(409).json({ message: "Request is already reviewed" });
    request.status = "rejected";
    request.reviewedBy = req.adminUser._id;
    request.reviewedAt = new Date();
    request.rejectionReason = reason;
    await request.save();
    const hasPending = await SupporterRequest.exists({ user: request.user, status: "pending" });
    if (!hasPending) await User.findByIdAndUpdate(request.user, { planStatus: "active" });
    await writeAudit(req, "payment_request_rejected", "SupporterRequest", request._id, { reason: request.rejectionReason });
    const user = await User.findById(request.user).select("username email");
    await sendAutomationNotification({
      type: "payment_rejected",
      user: request.user,
      title: "Payment proof rejected",
      message: `${user?.username || "User"}'s payment proof was rejected: ${request.rejectionReason}`,
      payload: { requestId: String(request._id), userEmail: user?.email, plan: request.plan, reference: request.utr, reason: request.rejectionReason },
    });
    res.json({ message: "Payment request rejected successfully.", request });
  } catch (error) {
    console.error("Reject supporter error:", error.message);
    res.status(500).json({ message: billingMessageFor(500) });
  }
});

router.patch("/admin/users/:id/plan", auth, requireAdmin, async (req, res) => {
  try {
    const plan = String(req.body.plan || "free");
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
      user.entitlements = {};
    } else {
      await applyPlanToUser(user, plan, req);
    }
    await user.save();
    await writeAudit(req, "user.plan.updated", "User", user._id, { plan });
    res.json({ message: "User plan updated", billing: publicBillingUser(user) });
  } catch (error) {
    console.error("Admin plan update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/admin/audit-logs", auth, requireAdmin, async (_req, res) => {
  const logs = await AdminAuditLog.find().sort({ createdAt: -1 }).limit(100).populate("actor", "username email");
  res.json({ logs });
});

router.get("/monetization", auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select("plan isPremium isSupporter adsDisabled entitlements coins analysisCredits");
  if (!user) return res.status(404).json({ message: "User not found" });
  const billing = publicBillingUser(user);
  res.json({
    billing,
    ads: {
      enabled: !billing.adsDisabled,
      placements: ["after_match", "dashboard_banner", "home_page", "rewarded_ad"],
      networks: { web: ["Google AdSense", "Media.net"], mobileLater: ["AdMob", "Unity Ads"] },
    },
    premiumUnlocks: ["noAds", "premiumSounds", "unlimitedAnalysis", "advancedEngineDepth", "customBoards", "premiumThemes", "advancedStats", "unlimitedGameReview", "tournaments", "earlyAccess"],
  });
});


function normalizeReferralCode(code) {
  return sanitizeText(code || "", 24).toUpperCase().replace(/[^A-Z0-9]/g, "");
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
  const user = await User.findById(userId).select("username email referralCode referredBy isSupporter isPremium adsDisabled");
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

router.get("/referral/me", auth, async (req, res) => {
  const dashboard = await referralDashboardForUser(req.user.userId);
  if (!dashboard) return res.status(404).json({ message: "User not found" });
  res.json(dashboard);
});

router.get("/referrals/me", auth, async (req, res) => {
  const dashboard = await referralDashboardForUser(req.user.userId);
  if (!dashboard) return res.status(404).json({ message: "User not found" });
  res.json(dashboard);
});

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
    { $setOnInsert: { referrer: referrer._id, referred: user._id, code, status: "joined", rewardNote: "Joined through referral. Reward is manually reviewed." } },
    { upsert: true },
  );
  await writeAudit(req, "referral_created", "Referral", user._id, { referrer: String(referrer._id) });
  return res.json({ message: "Referral connected successfully. Rewards are reviewed manually." });
}

router.post("/referral/apply", auth, async (req, res) => applyReferralForUser(req, res, req.body.code));

router.post("/referrals/claim", auth, async (req, res) => applyReferralForUser(req, res, req.body.code || req.body.referralCode));

router.get("/tournaments", auth, async (_req, res) => {
  const tournaments = await Tournament.find({ status: { $in: ["open", "running"] } }).sort({ startsAt: 1 }).limit(50).select("title description mode entryFee currency startsAt maxPlayers status participants");
  res.json({ tournaments });
});

router.post("/tournaments", auth, requireAdmin, async (req, res) => {
  const title = sanitizeText(req.body.title, 100);
  if (!title) return res.status(400).json({ message: "Tournament title is required" });
  const mode = req.body.mode === "paid" ? "paid" : "free";
  const entryFee = mode === "paid" ? Math.max(1, Number(req.body.entryFee || 49)) : 0;
  const tournament = await Tournament.create({ title, description: sanitizeText(req.body.description, 1000), mode, entryFee, startsAt: new Date(req.body.startsAt || Date.now() + 86400000), maxPlayers: Math.min(512, Math.max(2, Number(req.body.maxPlayers || 32))), createdBy: req.user.userId });
  await writeAudit(req, "tournament.created", "Tournament", tournament._id, { mode, entryFee });
  res.status(201).json({ tournament });
});

router.post("/tournaments/:id/join", auth, async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament || tournament.status !== "open") return res.status(404).json({ message: "Tournament is not open" });
  if (tournament.participants.some((id) => String(id) === String(req.user.userId))) return res.json({ message: "Already joined", tournament });
  if (tournament.participants.length >= tournament.maxPlayers) return res.status(409).json({ message: "Tournament is full" });
  tournament.participants.push(req.user.userId);
  await tournament.save();
  res.json({ message: tournament.mode === "paid" ? "Joined. Entry fee verification may be required." : "Joined tournament", tournament });
});

module.exports = router;
