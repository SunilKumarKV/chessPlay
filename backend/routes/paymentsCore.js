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
      message: 'Payment order created in Prisma compatibility mode.',
    });
  } catch {
    res.status(500).json({ message: 'Unable to create payment order.' });
  }
});

router.post('/verify', auth, async (req, res) => {
  try {
    const orderId = clean(req.body?.razorpay_order_id || req.body?.orderId, 100);
    const paymentId = clean(req.body?.razorpay_payment_id || req.body?.paymentId, 100);
    const payment = await prisma.payment.findFirst({ where: { userId: userId(req), transactionRef: orderId } });
    if (!payment) return res.status(404).json({ message: 'Payment order not found.' });
    if (payment.status === 'APPROVED') return res.json({ message: 'Payment already verified.', payment: publicPayment(payment) });
    const meta = payment.metadata || {};
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUBMITTED', metadata: { ...meta, providerPaymentId: paymentId, verificationPending: true } },
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
    const eventId = req.headers['x-razorpay-event-id'] || `webhook_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await prisma.documentRecord.create({ collection: 'payment_webhooks', data: { provider: 'razorpay', eventId, receivedAt: new Date().toISOString(), status: 'received' } });
    res.json({ received: true, mode: 'prisma-compatibility' });
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
    const subscription = await prisma.subscription.create({ data: { userId: uid, plan: 'pro', status: 'ACTIVE', provider: 'TRIAL', currentPeriodStart: now, currentPeriodEnd: end, metadata: { trial: true } } });
    await prisma.user.update({ where: { id: uid }, data: { isPremium: true } });
    res.status(201).json({ message: '7-day Pro trial started.', subscription });
  } catch {
    res.status(500).json({ message: 'Unable to start trial.' });
  }
});

router.post('/subscription/cancel', auth, async (req, res) => {
  const subscription = await prisma.subscription.findFirst({ where: { userId: userId(req), status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } }).catch(() => null);
  if (subscription) await prisma.subscription.update({ where: { id: subscription.id }, data: { status: 'CANCELED', metadata: { ...(subscription.metadata || {}), cancelAtPeriodEnd: true } } });
  res.json({ message: 'Subscription set to cancel at period end.', subscription });
});

router.post('/subscription/downgrade', auth, async (req, res) => {
  const nextPlan = normalizePlan(req.body?.plan || 'free');
  if (!['free', 'pro'].includes(nextPlan)) return res.status(400).json({ message: 'Downgrade target must be free or pro.' });
  await prisma.user.update({ where: { id: userId(req) }, data: { isPremium: nextPlan !== 'free' } });
  res.json({ message: 'Plan downgraded safely. Payment history is preserved.', plan: nextPlan });
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
