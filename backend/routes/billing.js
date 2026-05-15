const crypto = require("crypto");
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
    amount: 999,
    usdAmount: 24,
    days: 365,
    benefits: ["No ads", "Unlimited analysis", "Advanced engine depth", "Tournaments", "Advanced stats"],
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

router.get("/plans", (_req, res) => {
  res.json({
    currency: "INR",
    upiId: process.env.UPI_ID || "",
    merchantName: process.env.UPI_MERCHANT_NAME || "ChessPlay",
    plans: PLAN_CONFIG,
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
    .limit(5)
    .select("plan amount currency paymentMethod upiId utr bankReference payerEmail paymentProofUrl status rejectionReason expiresAt createdAt updatedAt");
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
    await writeAudit(req, "supporter.request.submitted", "SupporterRequest", request._id, { plan, amount, method: paymentMethod });
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
  const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : undefined;
  const filter = status ? { status } : {};
  const requests = await SupporterRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user", "username email rating plan planStatus isSupporter isPremium supporterExpiresAt coins")
    .populate("reviewedBy", "username email");
  res.json({ requests });
});

router.patch("/admin/requests/:id/approve", auth, requireAdmin, async (req, res) => {
  try {
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
    await writeAudit(req, "supporter.approved", "SupporterRequest", request._id, { plan: request.plan, amount: request.amount, method: request.paymentMethod });
    await sendAutomationNotification({
      type: "payment_approved",
      user: user._id,
      title: "Premium plan approved",
      message: `${user.username || user.email} is now premium until ${expiresAt.toDateString()}.`,
      payload: { requestId: String(request._id), userEmail: user.email, plan: request.plan, reference: request.utr, amount: request.amount, currency: request.currency, expiresAt },
    });
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
    await writeAudit(req, "supporter.rejected", "SupporterRequest", request._id, { reason: request.rejectionReason });
    const user = await User.findById(request.user).select("username email");
    await sendAutomationNotification({
      type: "payment_rejected",
      user: request.user,
      title: "Payment proof rejected",
      message: `${user?.username || "User"}'s payment proof was rejected: ${request.rejectionReason}`,
      payload: { requestId: String(request._id), userEmail: user?.email, plan: request.plan, reference: request.utr, reason: request.rejectionReason },
    });
    res.json({ message: "Supporter request rejected", request });
  } catch (error) {
    console.error("Reject supporter error:", error);
    res.status(500).json({ message: "Server error" });
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

router.get("/referral/me", auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select("referralCode coins");
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!user.referralCode) {
    user.referralCode = `CP${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    await user.save();
  }
  await Referral.updateOne({ referrer: user._id, code: user.referralCode }, { $setOnInsert: { referrer: user._id, code: user.referralCode, status: "created" } }, { upsert: true });
  const referrals = await Referral.find({ referrer: user._id }).sort({ createdAt: -1 }).limit(50).populate("referred", "username email plan");
  res.json({ code: user.referralCode, coins: user.coins || 0, referrals, redeemOptions: ["premium month", "analysis credits", "board themes"] });
});

router.post("/referral/apply", auth, async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,20}$/.test(code)) return res.status(400).json({ message: "Invalid referral code" });
  const ref = await Referral.findOne({ code }).populate("referrer");
  if (!ref || String(ref.referrer._id) === String(req.user.userId)) return res.status(400).json({ message: "Referral code cannot be used" });
  const user = await User.findById(req.user.userId);
  if (!user || user.referredBy) return res.status(409).json({ message: "Referral already applied" });
  user.referredBy = ref.referrer._id;
  await user.save();
  await Referral.create({ referrer: ref.referrer._id, referred: user._id, code, status: "joined", coinsEarned: 25, rewardReason: "friend joined" });
  await User.findByIdAndUpdate(ref.referrer._id, { $inc: { coins: 25 } });
  res.json({ message: "Referral applied. Referrer earned 25 coins." });
});

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
