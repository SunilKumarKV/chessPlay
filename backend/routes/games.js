const express = require('express');
const { prisma } = require('../src/config/prisma');
const auth = require('../middleware/auth');
const { findActiveRoomForUserId } = require('../src/activeRooms');
const router = express.Router();
const VALID_RESULTS = new Set(['white', 'black', 'draw']);
const VALID_COLORS = new Set(['w', 'b']);
const MAX_PAGE_SIZE = 50;

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

function requestUserId(req) {
  return String(req.user?.userId || '');
}

function settingsDocumentId(userId) {
  return `user_settings:${userId}`;
}

async function getUserPrivacy(userId) {
  const record = await prisma.documentRecord.findUnique({ where: { id: settingsDocumentId(userId) } });
  const settingsPrivacy = record?.data?.privacy || {};
  return {
    gameHistory: settingsPrivacy.gameHistoryVisibility !== 'private',
  };
}

async function canViewGameHistory(targetUserId, currentUserId) {
  if (String(targetUserId) === String(currentUserId)) return true;
  const privacy = await getUserPrivacy(targetUserId);
  return privacy?.gameHistory === false ? false : true;
}

function normalizeMove(move) {
  return {
    from: String(move.from || ''),
    to: String(move.to || ''),
    piece: String(move.piece || ''),
    promotion: move.promotion ? String(move.promotion) : undefined,
    timestamp: move.timestamp ? new Date(String(move.timestamp)) : new Date(),
  };
}

function toResultEnum(result) {
  if (result === 'white') return 'WHITE_WIN';
  if (result === 'black') return 'BLACK_WIN';
  return 'DRAW';
}

function buildLeaderboardRow(user, stats) {
  const statData = stats || {};
  const gamesPlayed = Number(statData.gamesPlayed || 0);
  const wins = Number(statData.gamesWon || 0);
  const losses = Number(statData.gamesLost || 0);
  const draws = Number(statData.gamesDrawn || 0);

  return {
    username: user.username,
    rating: Number.isFinite(user.rating) ? user.rating : null,
    wins,
    losses,
    draws,
    gamesPlayed,
    isSupporter: Boolean(user.isPremium),
    adsDisabled: false,
    selectedBadge: user.isPremium ? 'supporter' : 'new-player',
  };
}

function sortLeaderboard(rows, mode) {
  return rows.sort((a, b) => {
    if (mode === 'rating' || mode === 'all') {
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
    }
    if (mode === 'wins' || mode === 'all') {
      if (b.wins !== a.wins) return b.wins - a.wins;
    }
    if (mode === 'gamesPlayed' || mode === 'all') {
      if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
    }
    if (a.username < b.username) return -1;
    if (a.username > b.username) return 1;
    return 0;
  });
}

router.get('/history', auth, async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10, MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;
    const currentUserId = requestUserId(req);
    const targetUserId = req.query.userId ? String(req.query.userId) : currentUserId;

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!(await canViewGameHistory(targetUserId, currentUserId))) {
      return res.status(403).json({ message: 'This game history is private' });
    }

    const where = {
      result: { not: null },
      OR: [
        { whitePlayerId: targetUserId },
        { blackPlayerId: targetUserId },
      ],
    };

    const [total, games] = await Promise.all([
      prisma.game.count({ where }),
      prisma.game.findMany({
        where,
        include: {
          whitePlayer: { select: { username: true } },
          blackPlayer: { select: { username: true } },
        },
        orderBy: [{ endedAt: 'desc' }, { startedAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    res.json({
      games,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Game history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/record', auth, async (req, res) => {
  try {
    const { moves, playerColor = 'w', result } = req.body;

    if (!Array.isArray(moves)) {
      return res.status(400).json({ message: 'Moves are required' });
    }
    if (moves.length > 500) {
      return res.status(400).json({ message: 'Too many moves' });
    }
    if (!VALID_RESULTS.has(String(result))) {
      return res.status(400).json({ message: 'Invalid game result' });
    }
    if (!VALID_COLORS.has(playerColor)) {
      return res.status(400).json({ message: 'Invalid player color' });
    }

    const currentUserId = requestUserId(req);
    const gameData = {
      whitePlayerId: playerColor === 'w' ? currentUserId : null,
      blackPlayerId: playerColor === 'b' ? currentUserId : null,
      status: 'COMPLETED',
      result: toResultEnum(String(result)),
      moves: moves.map(normalizeMove),
      startedAt: new Date(),
      endedAt: new Date(),
    };

    const game = await prisma.game.create({ data: gameData });
    res.status(201).json({ game });
  } catch (error) {
    console.error('Record game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 50, MAX_PAGE_SIZE);
    const allowedModes = new Set(['all', 'rating', 'wins', 'gamesPlayed']);
    const requestedMode = String(req.query.mode || '').trim();
    const mode = allowedModes.has(requestedMode) ? requestedMode : 'all';
    const search = String(req.query.search || '').trim().slice(0, 40);

    const where = { deletedAt: null };
    if (search) {
      where.username = { contains: search, mode: 'insensitive' };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        rating: true,
        isPremium: true,
      },
      take: 200,
    });

    const stats = await prisma.stats.findMany({
      where: {
        userId: { in: users.map((user) => user.id) },
      },
    });
    const statsByUserId = new Map(stats.map((entry) => [entry.userId, entry.data || {}]));

    const leaderboard = sortLeaderboard(
      users.map((user) => buildLeaderboardRow(user, statsByUserId.get(user.id))),
      mode,
    ).slice(0, limit).map((row, index) => ({ rank: index + 1, ...row }));

    res.set('Cache-Control', 'public, max-age=30');
    res.json({ leaderboard, meta: { limit, mode, search } });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Unable to load leaderboard' });
  }
});

router.get('/active-room', auth, async (req, res) => {
  try {
    const activeRoom = findActiveRoomForUserId(requestUserId(req));
    res.json({ activeRoom });
  } catch (error) {
    console.error('Active room lookup error:', error);
    res.status(500).json({ message: 'Unable to load active room' });
  }
});

router.get('/:gameId', auth, async (req, res) => {
  try {
    const currentUserId = requestUserId(req);
    const game = await prisma.game.findUnique({
      where: { id: req.params.gameId },
      include: {
        whitePlayer: { select: { username: true } },
        blackPlayer: { select: { username: true } },
      },
    });

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    if (game.whitePlayerId !== currentUserId && game.blackPlayerId !== currentUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ game });
  } catch (error) {
    console.error('Game details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
