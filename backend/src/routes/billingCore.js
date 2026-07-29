const express = require('express');
const auth = require('../middleware/auth');
const { findUserById } = require('../src/repositories/userRepository');

const router = express.Router();

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
    entitlements: premium
      ? {
          noAds: true,
          premiumSounds: true,
          premiumThemes: true,
          unlimitedAnalysis: true,
          advancedEngineDepth: true,
          advancedStats: true,
          earlyAccess: true,
        }
      : {},
  };
}

function referralCodeForUser(user) {
  const source = String(user.username || user.email || user.id || 'PLAYER')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
  return `CP${source || 'PLAYER'}`;
}

function referralPayload(user) {
  const code = referralCodeForUser(user);
  return {
    code,
    referralCode: code,
    shareUrl: `/register?ref=${encodeURIComponent(code)}`,
    user: {
      id: user.id,
      username: user.username,
      isSupporter: Boolean(user.isPremium),
      isPremium: Boolean(user.isPremium),
    },
    stats: {
      invitesSent: 0,
      joinedUsers: 0,
      verifiedReferrals: 0,
      rewardStatus: 'Manual review',
    },
    referrals: [],
    rewards: [
      { threshold: 1, label: 'Community badge', status: 'Not started' },
      { threshold: 3, label: 'Supporter perk review', status: 'Not started' },
      { threshold: 5, label: 'Premium theme unlock review', status: 'Not started' },
    ],
    rewardsSummary: { coinsEarned: 0, qualified: 0, pending: 0 },
  };
}

router.get('/me', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });
    return res.json({ billing: billingForUser(user), requests: [], intents: [], referralCode: referralCodeForUser(user) });
  } catch {
    return res.status(500).json({ message: 'Unable to load billing information.' });
  }
});

router.get('/referral/me', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });
    return res.json(referralPayload(user));
  } catch {
    return res.status(500).json({ message: 'Unable to load referral information.' });
  }
});

router.post('/referral/apply', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ message: 'Referral code is required.' });
    if (code === referralCodeForUser(user)) return res.status(400).json({ message: 'You cannot apply your own referral code.' });
    return res.json({ message: 'Referral code connected for manual review.', referral: { code, status: 'pending_review' } });
  } catch {
    return res.status(500).json({ message: 'Unable to apply referral code.' });
  }
});

module.exports = router;
