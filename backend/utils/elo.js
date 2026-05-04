const User = require("../models/User");

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function computeRating(oldRating, expected, score, k = 32) {
  return Math.round(oldRating + k * (score - expected));
}

async function updatePlayerStats(winnerId, loserId) {
  try {
    const winner = await User.findById(winnerId);
    if (!winner) return;

    winner.gamesPlayed += 1;
    winner.gamesWon += 1;

    if (loserId) {
      const loser = await User.findById(loserId);
      if (loser) {
        loser.gamesPlayed += 1;
        loser.gamesLost += 1;

        const expectedWinner = expectedScore(winner.rating, loser.rating);
        const expectedLoser = expectedScore(loser.rating, winner.rating);

        winner.rating = computeRating(winner.rating, expectedWinner, 1);
        loser.rating = computeRating(loser.rating, expectedLoser, 0);

        await loser.save();
      }
    }

    await winner.save();
  } catch (error) {
    console.error("User rating update error:", error);
  }
}

async function updatePlayerStatsVsAi(userId, userWon, aiDifficulty, isDraw = false) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const aiRating = 1500 + aiDifficulty * 50;
    const expectedUser = expectedScore(user.rating, aiRating);

    user.gamesPlayed += 1;
    if (isDraw) {
      user.gamesDrawn += 1;
    } else if (userWon) {
      user.gamesWon += 1;
      user.rating = computeRating(user.rating, expectedUser, 1);
    } else {
      user.gamesLost += 1;
      user.rating = computeRating(user.rating, expectedUser, 0);
    }

    await user.save();
  } catch (error) {
    console.error("AI rating update error:", error);
  }
}

module.exports = {
  expectedScore,
  computeRating,
  updatePlayerStats,
  updatePlayerStatsVsAi,
};
