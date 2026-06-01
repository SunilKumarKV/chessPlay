const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { prisma } = require('../src/config/prisma');
const { getRequestAccessToken, getJwtSecret } = require('../utils/security');

const router = express.Router();

function clean(value, max = 1000) {
  let output = '';
  let previousWasSpace = false;

  for (const char of String(value || '')) {
    const code = char.charCodeAt(0);
    if (char === '<' || char === '>' || code === 127) continue;

    if (code <= 31) {
      if (!previousWasSpace && output.length < max) {
        output += ' ';
        previousWasSpace = true;
      }
      continue;
    }

    if (/\s/.test(char)) {
      if (!previousWasSpace && output.length < max) {
        output += ' ';
        previousWasSpace = true;
      }
      continue;
    }

    output += char;
    previousWasSpace = false;
    if (output.length >= max) break;
  }

  return output.trim();
}

function optionalAuth(req, _res, next) {
  try {
    const token = getRequestAccessToken(req);
    if (token) req.user = jwt.verify(token, getJwtSecret('access'));
  } catch {}
  next();
}

function userId(req) {
  return String(req.user?.userId || req.user?.id || '');
}

function isAdmin(user) {
  const admins = String(process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((email) => email.trim()).filter(Boolean);
  return String(user?.role || '').toUpperCase() === 'ADMIN' || admins.includes(String(user?.email || '').toLowerCase());
}

function safeJsonArray(value) {
  return Array.isArray(value) ? value : [];
}

async function usersById(ids) {
  const unique = [...new Set(ids.map(String).filter(Boolean))];
  if (!unique.length) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: unique }, deletedAt: null } });
  return new Map(users.map((user) => [user.id, user]));
}

async function publicTournament(tournament, viewerId = '') {
  const players = safeJsonArray(tournament.players).filter((entry) => entry?.status !== 'withdrawn');
  const userMap = await usersById(players.map((entry) => entry.userId || entry.user));
  return {
    _id: tournament.id,
    id: tournament.id,
    title: tournament.title,
    description: tournament.description || '',
    format: tournament.format || 'rapid',
    status: String(tournament.status || 'DRAFT').toLowerCase(),
    startsAt: tournament.startsAt,
    endsAt: tournament.endsAt,
    maxPlayers: tournament.maxPlayers || 32,
    playerCount: players.length,
    players: players.map((entry) => {
      const player = userMap.get(String(entry.userId || entry.user));
      return {
        username: player?.username || 'ChessPlayer',
        rating: player?.rating || 1200,
        supporterBadge: Boolean(player?.isPremium),
        joinedAt: entry.joinedAt,
        status: entry.status || 'joined',
      };
    }),
    rules: tournament.rules || '',
    isJoined: Boolean(viewerId && players.some((entry) => String(entry.userId || entry.user) === String(viewerId))),
    roadmap: ['Phase 1: Registration', 'Phase 2: Pairings', 'Phase 3: Live tournament rooms', 'Phase 4: Results and rankings'],
  };
}

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const allowed = ['DRAFT', 'OPEN', 'ACTIVE', 'COMPLETED', 'CANCELED'];
    const status = String(req.query.status || '').toUpperCase();
    const tournaments = await prisma.tournament.findMany({
      where: status && allowed.includes(status) ? { status } : {},
      orderBy: { startsAt: 'asc' },
      take: 50,
    });
    const mapped = await Promise.all(tournaments.map((item) => publicTournament(item, userId(req))));
    res.json({ tournaments: mapped });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    res.json({ tournament: await publicTournament(tournament, userId(req)) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/join', auth, async (req, res, next) => {
  try {
    const uid = userId(req);
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    if (String(tournament.status) !== 'OPEN') return res.status(409).json({ message: 'This tournament is not open for registration.' });
    const players = safeJsonArray(tournament.players);
    const active = players.filter((entry) => entry?.status !== 'withdrawn');
    if (active.some((entry) => String(entry.userId || entry.user) === uid)) return res.status(409).json({ message: 'You already joined this tournament.' });
    if (active.length >= Number(tournament.maxPlayers || 32)) return res.status(409).json({ message: 'This tournament is full.' });
    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: { players: [...players, { userId: uid, status: 'joined', joinedAt: new Date().toISOString() }] },
    });
    res.json({ message: 'Joined tournament successfully.', tournament: await publicTournament(updated, uid) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/leave', auth, async (req, res, next) => {
  try {
    const uid = userId(req);
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ message: 'Tournament not found.' });
    if (!['DRAFT', 'OPEN'].includes(String(tournament.status))) return res.status(409).json({ message: 'You can leave only before the tournament starts.' });
    let found = false;
    const players = safeJsonArray(tournament.players).map((entry) => {
      if (String(entry.userId || entry.user) === uid && entry.status !== 'withdrawn') {
        found = true;
        return { ...entry, status: 'withdrawn', withdrawnAt: new Date().toISOString() };
      }
      return entry;
    });
    if (!found) return res.status(404).json({ message: 'You are not registered for this tournament.' });
    const updated = await prisma.tournament.update({ where: { id: tournament.id }, data: { players } });
    res.json({ message: 'Left tournament successfully.', tournament: await publicTournament(updated, uid) });
  } catch (error) {
    next(error);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const uid = userId(req);
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!isAdmin(user)) return res.status(403).json({ message: 'Admin access required.' });
    const title = clean(req.body?.title, 100);
    if (!title) return res.status(400).json({ message: 'Tournament title is required.' });
    const format = ['rapid', 'blitz', 'bullet', 'classical', 'casual'].includes(req.body?.format) ? req.body.format : 'rapid';
    const rawStatus = String(req.body?.status || 'draft').toUpperCase();
    const status = rawStatus === 'UPCOMING' ? 'DRAFT' : ['DRAFT', 'OPEN', 'ACTIVE'].includes(rawStatus) ? rawStatus : 'DRAFT';
    const startsAt = new Date(req.body?.startsAt || Date.now() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(startsAt.getTime())) return res.status(400).json({ message: 'Valid start date is required.' });
    const tournament = await prisma.tournament.create({
      data: {
        title,
        description: clean(req.body?.description, 1000),
        format,
        status,
        startsAt,
        endsAt: req.body?.endsAt ? new Date(req.body.endsAt) : null,
        maxPlayers: Math.min(512, Math.max(2, Number(req.body?.maxPlayers || 32))),
        rules: clean(req.body?.rules, 2000),
        players: [],
        createdById: uid,
      },
    });
    res.status(201).json({ tournament: await publicTournament(tournament, uid) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
