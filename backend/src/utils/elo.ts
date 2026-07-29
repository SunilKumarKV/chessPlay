// @ts-nocheck
import User from "../models/User";

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function computeRating(oldRating, expected, score, k = 32) {
  return Math.round(oldRating + k * (score - expected));
}

async function updatePlayerStats(winnerId, loserId, client = null) {
  const db = client || prisma;
  try {
    const winner = await findUserById(winnerId, db);
    if (!winner) return;

    const winnerRating = Number(winner.rating || 1200);
    let loserRating = 1200;
    let loser = null;
    if (loserId) {
      loser = await findUserById(loserId, db);
      loserRating = Number(loser?.rating || 1200);
    }

    const expectedWinner = expectedScore(winnerRating, loserRating);
    const newWinnerRating = computeRating(winnerRating, expectedWinner, 1);
    await updateUserRating(winnerId, newWinnerRating, db);
    await incrementUserStats(winnerId, { gamesPlayed: 1, gamesWon: 1 }, db);

    if (loser) {
      const expectedLoser = expectedScore(loserRating, winnerRating);
      const newLoserRating = computeRating(loserRating, expectedLoser, 0);
      await updateUserRating(loserId, newLoserRating, db);
      await incrementUserStats(loserId, { gamesPlayed: 1, gamesLost: 1 }, db);
    }
  } catch (error) {
    console.error("User rating update error:", error);
  }
}

async function updatePlayerStatsVsAi(userId, userWon, aiDifficulty, isDraw = false, client = null) {
  const db = client || prisma;
  try {
    const user = await findUserById(userId, db);
    if (!user) return;

    const aiRating = 1500 + aiDifficulty * 50;
    const expectedUser = expectedScore(user.rating, aiRating);
    const statsDelta = { gamesPlayed: 1 };

    if (isDraw) {
      statsDelta.gamesDrawn = 1;
    } else if (userWon) {
      statsDelta.gamesWon = 1;
    } else {
      statsDelta.gamesLost = 1;
    }

    const newRating = isDraw
      ? Number(user.rating || 1200)
      : computeRating(Number(user.rating || 1200), expectedUser, userWon ? 1 : 0);

    await updateUserRating(userId, newRating, db);
    await incrementUserStats(userId, statsDelta, db);
  } catch (error) {
    console.error("AI rating update error:", error);
  }
}

export { expectedScore,
  computeRating,
  updatePlayerStats,
  updatePlayerStatsVsAi, };
