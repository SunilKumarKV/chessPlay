const express = require('express');
const auth = require('../middleware/auth');
const { findUserById } = require('../src/repositories/userRepository');

const router = express.Router();

function safeProfile(user) {
  return {
    id: user.id,
    _id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    email: user.email,
    avatar: null,
    bio: '',
    country: '',
    title: null,
    rating: Number(user.rating || 1200),
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDrawn: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    joinedAt: user.createdAt,
    createdAt: user.createdAt,
    isSupporter: Boolean(user.isPremium),
    isPremium: Boolean(user.isPremium),
    isAdmin: String(user.role || '').toUpperCase() === 'ADMIN',
    adsDisabled: Boolean(user.isPremium),
    plan: user.isPremium ? 'Supporter' : 'Free',
    planStatus: 'active',
    supporterPlan: user.isPremium ? 'premium' : 'none',
    supporterSince: null,
    selectedBadge: user.isPremium ? 'supporter' : 'new-player',
    earnedBadges: ['new-player', 'active-player', 'community-member'],
    settings: {},
    privacy: {
      profileVisibility: 'public',
      gameHistoryVisibility: 'public',
      friendRequests: 'everyone',
    },
  };
}

router.get('/me', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'Profile not found' });
    return res.json({ profile: safeProfile(user), recentGames: [], gameHistoryHidden: false });
  } catch {
    return res.status(500).json({ message: 'Unable to load profile' });
  }
});

module.exports = router;
