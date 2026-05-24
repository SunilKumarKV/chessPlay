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

router.get('/me', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });
    return res.json({ billing: billingForUser(user), requests: [], intents: [], referralCode: null });
  } catch {
    return res.status(500).json({ message: 'Unable to load billing information.' });
  }
});

router.get('/referral/me', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });
    return res.json({
      referralCode: null,
      referrals: [],
      rewards: { coinsEarned: 0, qualified: 0, pending: 0 },
      shareUrl: '',
    });
  } catch {
    return res.status(500).json({ message: 'Unable to load referral information.' });
  }
});

module.exports = router;
