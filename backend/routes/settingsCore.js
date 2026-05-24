const express = require('express');
const auth = require('../middleware/auth');
const { findUserById } = require('../src/repositories/userRepository');

const router = express.Router();

router.get('/me', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: null,
        country: 'US',
        bio: '',
        isAdmin: String(user.role || '').toUpperCase() === 'ADMIN',
        isSupporter: Boolean(user.isPremium),
        adsDisabled: Boolean(user.isPremium),
        plan: user.isPremium ? 'premium' : 'free',
        planStatus: 'active',
        supporterStatus: user.isPremium ? 'supporter' : 'free',
      },
      settings: {
        privacy: {
          profileVisibility: 'public',
          gameHistoryVisibility: 'public',
          friendRequests: 'everyone',
        },
        notifications: {
          gameInvites: true,
          friendRequests: true,
          messages: true,
          tournaments: true,
          community: true,
          supporter: true,
        },
        appearance: {
          theme: 'system',
          accentColor: 'default',
          textColor: 'default',
          boardTheme: 'classic',
          selectedBadge: user.isPremium ? 'supporter' : 'new-player',
        },
        badges: {
          earned: ['new-player', 'active-player', 'community-member'],
          selected: user.isPremium ? 'supporter' : 'new-player',
        },
        gameplay: {
          defaultMode: 'ai',
          boardOrientation: 'white',
          moveConfirmation: false,
          soundEffects: true,
          animation: 'normal',
        },
      },
    });
  } catch {
    return res.status(500).json({ message: 'Unable to load settings.' });
  }
});

module.exports = router;
