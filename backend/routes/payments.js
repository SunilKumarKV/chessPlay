const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const Payment = require("../models/Payment");
const Subscription = require("../models/Subscription");
const Coupon = require("../models/Coupon");
const User = require("../models/User");
const WebhookEvent = require("../models/WebhookEvent");
const { PLANS, normalizePlan, planConfig } = require("../config/plans");
const razorpay = require("../services/razorpayService");
const { queueEmailEvent } = require("../services/emailEventService");
const { validateBody } = require("../middleware/validate");
const logger = require("../utils/safeLogger");

const router = express.Router();

const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many payment attempts. Please slow down." },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many webhook attempts." },
});

const validateCreateOrder = validateBody({
  plan: { required: true, max: 40, pattern: /^[a-z_]+$/ },
  coupon: { max: 32, pattern: /^[A-Za-z0-9_-]*$/ },
});

const validateVerifyPayment = validateBody({
  razorpay_order_id: { max: 80, pattern: /^[A-Za-z0-9_:-]*$/ },
  orderId: { max: 80, pattern: /^[A-Za-z0-9_:-]*$/ },
  razorpay_payment_id: { max: 80, pattern: /^[A-Za-z0-9_:-]*$/ },
  paymentId: { max: 80, pattern: /^[A-Za-z0-9_:-]*$/ },
  razorpay_signature: { max: 128, pattern: /^[a-fA-F0-9]*$/ },
  signature: { max: 128, pattern: /^[a-fA-F0-9]*$/ },
});

function normalizeCoupon(code) {
  return String(code || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

async function couponDiscount(code, plan) {
  const normalized = normalizeCoupon(code);
  if (!normalized) return { code: "", discountPercent: 0, discountAmount: 0 };
  const coupon = await Coupon.findOne({ code: normalized, active: true });
  if (!coupon) return { code: normalized, discountPercent: 0, discountAmount: 0, invalid: true };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return { code: normalized, discountPercent: 0, discountAmount: 0, invalid: true };
  if (coupon.maxRedemptions && coupon.redeemedCount >= coupon.maxRedemptions) return { code: normalized, discountPercent: 0, discountAmount: 0, invalid: true };
  if (coupon.plans?.length && !coupon.plans.includes(plan)) return { code: normalized, discountPercent: 0, discountAmount: 0, invalid: true };
  return { code: normalized, discountPercent: coupon.discountPercent || 0, discountAmount: coupon.discountAmount || 0 };
}

function discountedAmount(baseAmount, coupon = {}) {
  const afterPercent = baseAmount * (1 - (coupon.discountPercent || 0) / 100);
  return Math.max(1, Math.round(afterPercent - (coupon.discountAmount || 0)));
}

router.post("/create-order", auth, paymentLimiter, validateCreateOrder, async (req, res) => {
  try {
    const plan = normalizePlan(req.body.plan);
    if (plan === "free") return res.status(400).json({ message: "Choose a paid plan." });
    const config = planConfig(plan);
    const coupon = await couponDiscount(req.body.coupon, plan);
    if (coupon.invalid) return res.status(400).json({ message: "Coupon is not valid." });
    const amount = discountedAmount(config.amountInr, coupon);
    const receipt = `CP-${Date.now()}-${String(req.user.userId).slice(-6)}`;
    const order = await razorpay.createOrder({ amount, currency: "INR", receipt, notes: { plan, coupon: coupon.code } });
    await Payment.create({
      user: req.user.userId,
      provider: "razorpay",
      providerOrderId: order.id,
      webhookEventId: `order:${order.id}`,
      plan,
      amount,
      currency: "INR",
      status: "created",
      raw: { order, coupon },
    });
    res.status(201).json({
      order,
      keyId: razorpay.publicKey(),
      configured: razorpay.isConfigured(),
      message: razorpay.isConfigured() ? "Razorpay order created." : "Razorpay keys are not configured. Safe local order placeholder created.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to create payment order." });
  }
});

router.post("/verify", auth, paymentLimiter, validateVerifyPayment, async (req, res) => {
  try {
    const orderId = String(req.body.razorpay_order_id || req.body.orderId || "");
    const paymentId = String(req.body.razorpay_payment_id || req.body.paymentId || "");
    const signature = String(req.body.razorpay_signature || req.body.signature || "");
    const payment = await Payment.findOne({ providerOrderId: orderId, user: req.user.userId });
    if (!payment) return res.status(404).json({ message: "Payment order not found." });
    if (payment.status === "paid") return res.json({ message: "Payment already verified.", payment });
    if (!razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
      return res.status(400).json({ message: "Payment signature verification failed." });
    }
    payment.providerPaymentId = paymentId;
    payment.status = "paid";
    await payment.save();
    const plan = normalizePlan(payment.plan);
    const config = planConfig(plan);
    const now = new Date();
    const end = new Date(now.getTime() + config.durationDays * 24 * 60 * 60 * 1000);
    await Subscription.findOneAndUpdate(
      { user: req.user.userId, plan, status: { $in: ["active", "trialing", "pending"] } },
      { user: req.user.userId, plan, status: "active", provider: "razorpay", currentPeriodStart: now, currentPeriodEnd: end },
      { upsert: true, new: true },
    );
    await User.findByIdAndUpdate(req.user.userId, {
      $set: {
        plan,
        planStatus: "active",
        planStartedAt: now,
        planExpiresAt: end,
        isSupporter: true,
        isPremium: true,
        supporterPlan: plan,
        supporterExpiresAt: end,
        adsDisabled: true,
        entitlements: config.entitlements,
      },
    });
    if (payment.raw?.coupon?.code) {
      await Coupon.updateOne({ code: payment.raw.coupon.code }, { $inc: { redeemedCount: 1 } }).catch(() => {});
    }
    const user = await User.findById(req.user.userId).select("email").lean().catch(() => null);
    await queueEmailEvent("payment_success", { user: req.user.userId, email: user?.email || "", payload: { plan, amount: payment.amount, currency: payment.currency } });
    res.json({ message: "Payment verified and plan activated.", payment });
  } catch {
    res.status(500).json({ message: "Unable to verify payment." });
  }
});

router.get("/history", auth, async (req, res) => {
  const payments = await Payment.find({ user: req.user.userId }).sort({ createdAt: -1 }).limit(50).select("-raw");
  const subscriptions = await Subscription.find({ user: req.user.userId }).sort({ createdAt: -1 }).limit(10);
  res.json({ payments, subscriptions });
});

router.post("/webhook", webhookLimiter, express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body || {}));
    if (!razorpay.verifyWebhookSignature(rawBody, signature)) return res.status(401).json({ message: "Invalid webhook signature." });
    const event = JSON.parse(rawBody);
    const webhookEventId = String(event?.id || event?.payload?.payment?.entity?.id || event?.event || "");
    if (!webhookEventId) return res.status(400).json({ message: "Webhook event id missing." });
    try {
      await WebhookEvent.create({ provider: "razorpay", eventId: webhookEventId, eventType: String(event?.event || ""), raw: event, status: "processed" });
    } catch (error) {
      if (error?.code === 11000) {
        logger.warn("Duplicate Razorpay webhook ignored", { webhookEventId });
        return res.json({ received: true, duplicate: true });
      }
      throw error;
    }
    if (await Payment.exists({ webhookEventId })) {
      logger.warn("Duplicate Razorpay payment webhook ignored", { webhookEventId });
      return res.json({ received: true, duplicate: true });
    }
    await Payment.create({
      provider: "razorpay",
      providerPaymentId: String(event?.payload?.payment?.entity?.id || ""),
      webhookEventId,
      status: event?.event === "payment.captured" ? "paid" : "created",
      raw: event,
    });
    res.json({ received: true });
  } catch {
    res.status(400).json({ message: "Webhook processing failed." });
  }
});

router.post("/trial/start", auth, paymentLimiter, async (req, res) => {
  const userDoc = await User.findById(req.user.userId).select("email trialUsed trialUsedAt");
  if (!userDoc) return res.status(404).json({ message: "User not found." });
  const existingTrial = await Subscription.exists({ user: req.user.userId, status: { $in: ["trialing", "active", "expired", "cancelled"] }, trialEndsAt: { $ne: null } });
  if (userDoc.trialUsed || existingTrial) return res.status(409).json({ message: "Trial already used." });
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const subscription = await Subscription.create({ user: req.user.userId, plan: "pro", status: "trialing", provider: "manual", trialEndsAt, currentPeriodStart: now, currentPeriodEnd: trialEndsAt });
  userDoc.trialUsed = true;
  userDoc.trialUsedAt = now;
  await userDoc.save();
  await queueEmailEvent("trial_expiring", { user: req.user.userId, email: userDoc.email || "", scheduledFor: new Date(trialEndsAt.getTime() - 24 * 60 * 60 * 1000), payload: { plan: "pro", trialEndsAt } });
  res.status(201).json({ message: "7-day Pro trial started.", subscription });
});

router.post("/subscription/cancel", auth, paymentLimiter, async (req, res) => {
  const now = new Date();
  const subscription = await Subscription.findOneAndUpdate(
    { user: req.user.userId, status: { $in: ["active", "trialing", "pending"] } },
    { $set: { status: "cancelled", cancelledAt: now, cancelAtPeriodEnd: true } },
    { new: true, sort: { createdAt: -1 } },
  );
  await User.findByIdAndUpdate(req.user.userId, { $set: { planStatus: "cancelled" } });
  res.json({ message: "Subscription set to cancel at period end.", subscription });
});

router.post("/subscription/downgrade", auth, paymentLimiter, async (req, res) => {
  const nextPlan = normalizePlan(req.body.plan || "free");
  if (!["free", "pro"].includes(nextPlan)) return res.status(400).json({ message: "Downgrade target must be free or pro." });
  const config = planConfig(nextPlan);
  const now = new Date();
  const end = nextPlan === "free" ? null : new Date(now.getTime() + config.durationDays * 24 * 60 * 60 * 1000);
  await Subscription.updateMany({ user: req.user.userId, status: { $in: ["active", "trialing", "pending"] } }, { $set: { status: "cancelled", cancelledAt: now, cancelAtPeriodEnd: true } });
  await User.findByIdAndUpdate(req.user.userId, {
    $set: {
      plan: nextPlan,
      planStatus: "active",
      planStartedAt: now,
      planExpiresAt: end,
      isPremium: nextPlan !== "free",
      isSupporter: nextPlan !== "free",
      supporterPlan: nextPlan === "free" ? "none" : nextPlan,
      supporterExpiresAt: end,
      adsDisabled: Boolean(config.entitlements.noAds),
      entitlements: config.entitlements,
    },
  });
  res.json({ message: "Plan downgraded safely. Payment history is preserved.", plan: nextPlan });
});

router.post("/coupon/validate", paymentLimiter, async (req, res) => {
  const plan = normalizePlan(req.body.plan);
  const result = await couponDiscount(req.body.coupon, plan);
  if (result.invalid) return res.status(404).json({ valid: false, message: "Coupon not valid." });
  const config = planConfig(plan);
  res.json({ valid: Boolean(result.discountPercent || result.discountAmount), ...result, originalAmount: config.amountInr, finalAmount: discountedAmount(config.amountInr, result) });
});

router.get("/plans", (_req, res) => {
  res.json({ plans: PLANS, razorpayConfigured: razorpay.isConfigured() });
});

module.exports = router;
