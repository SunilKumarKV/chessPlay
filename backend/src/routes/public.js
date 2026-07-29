const express = require('express');
const { prisma } = require('../src/config/prisma');
const { countActiveRooms } = require('../src/activeRooms');

const router = express.Router();

async function safeCount(label, countOperation) {
  try {
    const value = await countOperation();
    return Number.isFinite(value) ? value : 0;
  } catch (error) {
    console.warn(`Public stats ${label} unavailable:`, error?.message || error);
    return 0;
  }
}

function safeActiveRooms() {
  try {
    const value = countActiveRooms();
    return Number.isFinite(value) ? value : 0;
  } catch (error) {
    console.warn('Public stats activeRooms unavailable:', error?.message || error);
    return 0;
  }
}

async function getPublicStats(client = prisma) {
  const [
    totalGames,
    registeredUsers,
    aiGames,
    multiplayerGames,
    puzzlesSolved,
  ] = await Promise.all([
    safeCount('totalGames', () => client.game.count({ where: { status: 'COMPLETED' } })),
    safeCount('registeredUsers', () => client.user.count({ where: { deletedAt: null } })),
    safeCount('aiGames', () => client.game.count({
      where: {
        status: 'COMPLETED',
        OR: [
          { whitePlayerId: null, blackPlayerId: { not: null } },
          { blackPlayerId: null, whitePlayerId: { not: null } },
        ],
      },
    })),
    safeCount('multiplayerGames', () => client.game.count({
      where: {
        status: 'COMPLETED',
        whitePlayerId: { not: null },
        blackPlayerId: { not: null },
      },
    })),
    safeCount('puzzlesSolved', () => client.puzzleAttempt.count({ where: { success: true } })),
  ]);

  return {
    totalGames,
    registeredUsers,
    aiGames,
    multiplayerGames,
    puzzlesSolved,
    activeRooms: safeActiveRooms(),
  };
}

router.get('/stats', async (_req, res) => {
  const stats = await getPublicStats();
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json(stats);
});

module.exports = router;
module.exports.getPublicStats = getPublicStats;
