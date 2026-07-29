const express = require('express');
const auth = require('../middleware/auth');
const { findUserById } = require('../src/repositories/userRepository');
const { prisma } = require('../src/config/prisma');

const router = express.Router();

const PLANS = {
  free: { label: 'Free', amount: 0, usdAmount: 0, days: 0, benefits: ['Play vs AI', 'Play Online', 'Puzzles'] },
  pro: { label: 'Pro', amount: 99, usdAmount: 3, days: 30, benefits: ['No ads', 'Premium sounds', 'Priority feedback'] },
  premium: { label: 'Premium', amount: 299, usdAmount: 8, days: 30, benefits: ['No ads', 'Premium filters', 'Priority feedback'] },
  lifetime: { label: 'Lifetime', amount: 2999, usdAmount: 79, days: 36500, benefits: ['Lifetime badge', 'Priority roadmap voting'] },
  supporter_monthly: { label: 'Supporter Monthly', amount: 49, usdAmount: 2, days: 30, benefits: ['Supporter badge', 'No ads', 'Priority feedback'] },
  supporter_yearly: { label: 'Supporter Yearly', amount: 499, usdAmount: 12, days: 365, benefits: ['Supporter badge', 'No ads', 'Priority feedback'] },
};

function clean(value, max = 500) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function billingForUser(user) {
  const premium = Boolean(user.isPremium);
  return {
    plan: premium ? 'premium' : 'free',
    planStatus: 'active',
    planStartedAt: null,
    planExpiresAt: null,
    isSupporter: premium,
    isPremium: premium,
    supporterSince: null,
    supporterPlan: premium ? 'premium' : 'none',
    supporterExpiresAt: null,
    adsDisabled: premium,
    coins: 0,
    analysisCredits: premium ? 9999 : 0,
    entitlements: premium ? { noAds: true, premiumSounds: true, premiumThemes: true, earlyAccess: true } : {},
  };
}

function publicPayment(payment) {
  const meta = payment.metadata || {};
  const reference = String(payment.transactionRef || meta.reference || '');
  return {
    _id: payment.id,
    id: payment.id,
    plan: meta.plan || 'supporter_monthly',
    amount: Number(meta.amount || payment.amountCents / 100 || 0),
    currency: payment.currency || meta.currency || 'INR',
    paymentMethod: String(meta.paymentMethod || payment.provider || 'manual').toLowerCase(),
    utr: reference,
    providerReference: reference,
    status: String(payment.status || 'SUBMITTED').toLowerCase(),
    rejectionReason: meta.rejectionReason || '',
    reviewedAt: payment.reviewedAt || null,
    paymentDate: meta.paymentDate || null,
    note: payment.notes || meta.note || '',
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function methodsFor(planCode = 'supporter_monthly') {
  const plan = PLANS[planCode] || PLANS.supporter_monthly;
  return {
    india: [
      { id: 'upi', label: 'UPI', upiId: process.env.UPI_ID || process.env.SUPPORT_UPI_ID || '', amount: plan.amount, currency: 'INR', configured: true },
      { id: 'bank', label: 'Bank transfer', amount: plan.amount, currency: 'INR', configured: false },
    ],
    global: [
      { id: 'paypal', label: 'PayPal', paypalEmail: process.env.PAYPAL_EMAIL || process.env.SUPPORT_PAYPAL_EMAIL || '', amount: plan.usdAmount, currency: 'USD', configured: true },
    ],
    manualFallback: { enabled: true, label: 'Manual approval fallback' },
  };
}

router.get('/plans', (_req, res) => {
  res.json({
    currency: 'INR',
    upiId: process.env.UPI_ID || process.env.SUPPORT_UPI_ID || '',
    merchantName: process.env.UPI_MERCHANT_NAME || 'ChessPlay',
    plans: PLANS,
    paymentMethods: methodsFor('supporter_monthly'),
    support: { contactEmail: process.env.SUPPORT_EMAIL_TO || process.env.ADMIN_EMAIL || '', manualVerification: true },
  });
});

router.get('/payment-methods', (req, res) => {
  const plan = String(req.query.plan || 'supporter_monthly');
  res.json({ plan, methods: methodsFor(plan) });
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });
    const payments = await prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 25 });
    res.json({ billing: billingForUser(user), requests: payments.map(publicPayment), intents: [], referralCode: null });
  } catch {
    res.status(500).json({ message: 'Unable to load billing information.' });
  }
});

router.post('/upi-request', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });
    const plan = clean(req.body?.plan, 80);
    const config = PLANS[plan];
    if (!config || plan === 'free') return res.status(400).json({ message: 'Invalid supporter plan' });
    const paymentMethod = clean(req.body?.paymentMethod || 'upi', 20).toLowerCase();
    if (!['upi', 'bank', 'paypal'].includes(paymentMethod)) return res.status(400).json({ message: 'Invalid payment method' });
    const amount = Number(req.body?.amount);
    const minimum = paymentMethod === 'paypal' ? config.usdAmount : config.amount;
    if (!Number.isFinite(amount) || amount < minimum) return res.status(400).json({ message: `Minimum amount for this plan is ${minimum}` });
    const reference = clean(req.body?.utr || req.body?.bankReference || req.body?.providerReference || req.body?.reference, 80).toUpperCase();
    if (!/^[A-Z0-9-]{6,80}$/.test(reference)) return res.status(400).json({ message: 'Enter a valid transaction/reference ID with at least 6 characters.' });
    const duplicate = await prisma.payment.findFirst({ where: { transactionRef: reference } });
    if (duplicate) return res.status(409).json({ message: 'This reference number was already submitted' });
    const pending = await prisma.payment.findFirst({ where: { userId: user.id, status: { in: ['PENDING', 'SUBMITTED'] } } });
    if (pending) return res.status(409).json({ message: 'You already have a pending supporter request' });
    const metadata = { plan, amount, paymentMethod, reference, paymentDate: clean(req.body?.paymentDate, 40), note: clean(req.body?.note, 500) };
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        status: 'SUBMITTED',
        provider: paymentMethod === 'paypal' ? 'PAYPAL' : paymentMethod === 'bank' ? 'BANK' : 'UPI',
        amountCents: Math.round(amount * 100),
        currency: paymentMethod === 'paypal' ? 'USD' : 'INR',
        transactionRef: reference,
        notes: metadata.note,
        metadata,
      },
    });
    res.status(201).json({ message: 'Payment proof submitted. Admin approval is required before premium access is enabled.', request: publicPayment(payment) });
  } catch {
    res.status(500).json({ message: 'Unable to submit payment request.' });
  }
});

module.exports = router;
