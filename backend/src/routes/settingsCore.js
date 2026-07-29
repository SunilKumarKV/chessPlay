const express = require('express');
const auth = require('../middleware/auth');
const { findUserById } = require('../src/repositories/userRepository');
const { prisma } = require('../src/config/prisma');

const router = express.Router();

function documentId(userId) {
  return `user_settings:${userId}`;
}

async function getStoredSettings(userId) {
  const record = await prisma.documentRecord.findUnique({ where: { id: documentId(userId) } });
  return record?.data || {};
}

async function saveStoredSettings(userId, settings) {
  const data = { userId, ...settings };
  await prisma.documentRecord.upsert({
    where: { id: documentId(userId) },
    create: { id: documentId(userId), collection: 'user_settings', data },
    update: { data },
  });
  return data;
}

function defaultSettings(user) {
  return {
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
  };
}

function payload(user, settings) {
  return {
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
    settings,
  };
}

router.get('/me', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });
    const stored = await getStoredSettings(user.id);
    return res.json(payload(user, { ...defaultSettings(user), ...stored }));
  } catch {
    return res.status(500).json({ message: 'Unable to load settings.' });
  }
});

router.patch('/me', auth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user || user.deletedAt) return res.status(404).json({ message: 'User not found' });
    const incoming = req.body?.settings || {};
    const merged = {
      ...defaultSettings(user),
      ...(await getStoredSettings(user.id)),
      ...incoming,
    };
    await saveStoredSettings(user.id, merged);
    return res.json(payload(user, merged));
  } catch {
    return res.status(500).json({ message: 'Unable to save settings.' });
  }
});

module.exports = router;
