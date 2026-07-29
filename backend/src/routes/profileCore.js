const express = require('express');
const auth = require('../middleware/auth');
const { findUserById, findUserByUsername } = require('../src/repositories/userRepository');
const { prisma } = require('../src/config/prisma');

const router = express.Router();

function documentId(userId) {
  return `user_profiles:${userId}`;
}

async function getProfileMeta(userId) {
  const record = await prisma.documentRecord.findUnique({ where: { id: documentId(userId) } });
  return record?.data || {};
}

async function saveProfileMeta(userId, input) {
  const current = await getProfileMeta(userId);
  const data = {
    ...current,
    userId,
    bio: String(input.bio || '').slice(0, 500),
    country: String(input.country || '').slice(0, 80),
    avatar: input.avatar || current.avatar || null,
    selectedBadge: input.selectedBadge || current.selectedBadge || undefined,
  };
  await prisma.documentRecord.upsert({
    where: { id: documentId(userId) },
    create: { id: documentId(userId), collection: 'user_profiles', data },
    update: { data },
  });
  return data;
}

function safeProfile(user, meta = {}) {
  return {
    id: user.id,
    _id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    email: user.email,
    avatar: meta.avatar || null,
    bio: meta.bio || '',
    country: meta.country || '',
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
    selectedBadge: meta.selectedBadge || (user.isPremium ? 'supporter' : 'new-player'),
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
    const meta = await getProfileMeta(user.id);
    return res.json({ profile: safeProfile(user, meta), recentGames: [], gameHistoryHidden: false });
  } catch {
    return res.status(500).json({ message: 'Unable to load profile' });
  }
});

router.patch('/me', auth, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.userId);
    if (!currentUser || currentUser.deletedAt) return res.status(404).json({ message: 'Profile not found' });

    const username = String(req.body?.username || currentUser.username).trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return res.status(400).json({ message: 'Username must be 3-24 characters and use only letters, numbers, or underscore.' });
    }

    const existing = await findUserByUsername(username);
    if (existing && existing.id !== currentUser.id) return res.status(400).json({ message: 'Username already exists' });

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: { username, displayName: username },
    });
    const meta = await saveProfileMeta(user.id, req.body || {});
    return res.json({ profile: safeProfile(user, meta), recentGames: [] });
  } catch {
    return res.status(500).json({ message: 'Unable to update profile.' });
  }
});

router.get('/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim();
    const user = await findUserByUsername(username);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'Profile not found' });
    const meta = await getProfileMeta(user.id);
    const profile = safeProfile(user, meta);
    delete profile.email;
    return res.json({ profile, recentGames: [], gameHistoryHidden: false });
  } catch {
    return res.status(500).json({ message: 'Unable to load profile' });
  }
});

module.exports = router;
