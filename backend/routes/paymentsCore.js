const express = require('express');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { prisma } = require('../src/config/prisma');

const router = express.Router();

const PLANS = {
  free: { label: 'Free', amountInr: 0, durationDays: 0, entitlements: {} },
  pro: { label: 'Pro', amountInr: 99, durationDays: 30, entitlements: { noAds: true, premiumSounds: true } },
  premium: { label: 'Premium', amountInr: 299, durationDays: 30, entitlements: { noAds: true, premiumSounds: true, premiumThemes: true, advancedStats: true } },
  lifetime: { label: 'Lifetime', amountInr: 2999, durationDays: 36500, entitlements: { noAds: true, premiumSounds: true, premiumThemes: true, advancedStats: true } },
};

function userId(req) {
  return String(req.user?.userId || req.user?.id || '');
}

function clean(value, max = 120) {
  return String(value || '').replace(/[^A-Za-z0-9_:-]/g, '').slice(0, max);
}

function normalizePlan(value) {
  const plan = String(value || 'free').toLowerCase();
  return PLANS[plan] ? plan : 'free';
}

function publicPayment(payment) {
  const meta = payment.metadata || {};
  return {
    _id: payment.id,
    id: payment.id,
    provider: String(payment.provider || 'MANUAL').toLowerCase(),
    providerOrderId: meta.providerOrderId || payment.transactionRef || '',
    providerPaymentId: meta.providerPaymentId || '',
    plan: meta.plan || 'free',
    amount: Number(payment.amountCents || 0) / 100,
    currency: payment.currency || 'INR',
    status: String(payment.status || 'PENDING').toLowerCase(),
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function fakeOrder(payment, plan, amount) {
  return {
    id: payment.transactionRef,
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: `CP-${payment.id}`,
    notes: { plan },
    status: 'created',
  };
}

function verifyRazorpayWebhook(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const signature = String(req.headers['x-razorpay-signature'] || '');
  if (!signature) return false;
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.rawBody || ''), 'utf8');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const sig = Buffer.from(signature, 'hex');
  const exp = Buffer.from(expected, 'hex');
  return sig.length === exp.length && crypto.timingSafeEqual(sig, exp);
}

router.post('/create-order', auth, async (req, res) => {
  try {
    const plan = normalizePlan(req.body?.plan);
    if (plan === 'free') return res.status(400).json({ message: 'Choose a paid plan.' });
    const config = PLANS[plan];
    const reference = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payment = await prisma.payment.create({
      data: {
        userId: userId(req),
        provider: 'MANUAL',
        status: 'PENDING',
        amountCents: Math.round(config.amountInr * 100),
        currency: 'INR',
        transactionRef: reference,
        metadata: { plan, providerOrderId: reference, compatibilityMode: true },
      },
    });
    res.status(201).json({
      order: fakeOrder(payment, plan, config.amountInr),
      keyId: process.env.RAZORPAY_KEY_ID || '',
      configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      message: 'Payment order created. Admin approval is required before activation.',
    });
  } catch {
    res.status(500).json({ message: 'Unable to create payment order.' });
  }
});

router.post('/verify', auth, async (req, res) => {
  try {
    const orderId = clean(req.body?.razorpay_order_id || req.body?.orderId, 100);
    const paymentId = clean(req.body?.razorpay_payment_id || req.body?.paymentId, 100);
    if (!orderId || !paymentId) return res.status(400).json({ message: 'Payment order id and payment id are required.' });

    const payment = await prisma.payment.findFirst({ where: { userId: userId(req), transactionRef: orderId } });
    if (!payment) return res.status(404).json({ message: 'Payment order not found.' });
    if (payment.status === 'APPROVED') return res.json({ message: 'Payment already verified.', payment: publicPayment(payment) });
    if (!['PENDING', 'SUBMITTED'].includes(String(payment.status))) return res.status(409).json({ message: 'Payment cannot be submitted in its current state.' });

    const meta = payment.metadata || {};
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUBMITTED', metadata: { ...meta, providerPaymentId: paymentId, verificationPending: true, submittedAt: new Date().toISOString() } },
    });
    res.json({ message: 'Payment submitted for verification. Admin approval is required before activation.', payment: publicPayment(updated) });
  } catch {
    res.status(500).json({ message: 'Unable to verify payment.' });
  }
});

router.get('/history', auth, async (req, res) => {
  const payments = await prisma.payment.findMany({ where: { userId: userId(req) }, orderBy: { createdAt: 'desc' }, take: 50 });
  const subscriptions = await prisma.subscription.findMany({ where: { userId: userId(req) }, orderBy: { createdAt: 'desc' }, take: 10 }).catch(() => []);
  res.json({ payments: payments.map(publicPayment), subscriptions });
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!verifyRazorpayWebhook(req)) return res.status(401).json({ message: 'Invalid webhook signature.' });
    const eventId = clean(req.headers['x-razorpay-event-id'] || `webhook_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`, 120);
    await prisma.documentRecord.create({ collection: 'payment_webhooks', data: { provider: 'razorpay', eventId, receivedAt: new Date().toISOString(), status: 'received' } });
    res.json({ received: true });
  } catch {
    res.status(400).json({ message: 'Webhook processing failed.' });
  }
});

router.post('/trial/start', auth, async (req, res) => {
  try {
    const uid = userId(req);
    const existing = await prisma.subscription.findFirst({ where: { userId: uid, provider: 'TRIAL' } }).catch(() => null);
    if (existing) return res.status(409).json({ message: 'Trial already used.' });
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const subscription = await prisma.subscription.create({ data: { userId: uid, plan: 'pro', status: 'TRIALING', provider: 'TRIAL', currentPeriodStart: now, currentPeriodEnd: end, metadata: { trial: true } } });
    res.status(201).json({ message: '7-day Pro trial started. Entitlements require server-side subscription evaluation.', subscription });
  } catch {
    res.status(500).json({ message: 'Unable to start trial.' });
  }
});

router.post('/subscription/cancel', auth, async (req, res) => {
  const subscription = await prisma.subscription.findFirst({ where: { userId: userId(req), status: { in: ['ACTIVE', 'TRIALING'] } }, orderBy: { createdAt: 'desc' } }).catch(() => null);
  if (subscription) await prisma.subscription.update({ where: { id: subscription.id }, data: { status: 'CANCELED', metadata: { ...(subscription.metadata || {}), cancelAtPeriodEnd: true } } });
  res.json({ message: 'Subscription set to cancel at period end.', subscription });
});

router.post('/subscription/downgrade', auth, async (req, res) => {
  const nextPlan = normalizePlan(req.body?.plan || 'free');
  if (!['free', 'pro'].includes(nextPlan)) return res.status(400).json({ message: 'Downgrade target must be free or pro.' });
  const subscription = await prisma.subscription.findFirst({ where: { userId: userId(req), status: { in: ['ACTIVE', 'TRIALING'] } }, orderBy: { createdAt: 'desc' } }).catch(() => null);
  if (subscription) {
    await prisma.subscription.update({ where: { id: subscription.id }, data: { plan: nextPlan, status: nextPlan === 'free' ? 'CANCELED' : subscription.status, metadata: { ...(subscription.metadata || {}), requestedDowngrade: nextPlan } } });
  }
  res.json({ message: 'Plan downgrade request recorded. Entitlements are not directly modified by this endpoint.', plan: nextPlan });
});

router.post('/coupon/validate', (req, res) => {
  const plan = normalizePlan(req.body?.plan);
  const config = PLANS[plan];
  res.json({ valid: false, code: clean(req.body?.coupon, 32), discountPercent: 0, discountAmount: 0, originalAmount: config.amountInr, finalAmount: config.amountInr });
});

router.get('/plans', (_req, res) => {
  res.json({ plans: PLANS, razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) });
});

module.exports = router;
