function getGameDateValue(game) {
  const value = game?.completedAt || game?.finishedAt || game?.endedAt || game?.createdAt || game?.updatedAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function daysSince(value) {
  const time = Number(value || 0);
  if (!time) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function getRuleGameResult(game, userId) {
  const result = String(game?.result || game?.status || "").toLowerCase();
  if (result === "draw" || game?.isDraw) return "Draw";
  const winnerId = String(game?.winner?._id || game?.winner || "");
  if (winnerId && winnerId === userId) return "Win";
  if (game?.winner) return "Loss";
  if (result === "completed") return "Completed";
  if (result === "active") return "Active";
  if (result === "abandoned") return "Abandoned";
  return "Recorded";
}

export function getPuzzleActivity(puzzleStats, puzzleLimits, safeStats) {
  const stats = puzzleStats?.stats || puzzleStats || {};
  const limits = puzzleStats?.limits || puzzleLimits || {};
  const limit = Number(limits.limit || 0);
  const remaining = Number(limits.remaining || 0);
  const usedToday = Number.isFinite(Number(limits.used))
    ? Number(limits.used)
    : Math.max(limit - remaining, 0);
  const started = Number(stats.started ?? stats.attempts ?? safeStats?.puzzlesAttempted ?? 0);
  const solved = Number(stats.solved ?? safeStats?.puzzlesSolved ?? 0);
  const failed = Number(stats.failed ?? 0);
  const accuracy = Number(stats.accuracy ?? (started ? Math.round((solved / started) * 100) : 0));

  return {
    started: Number.isFinite(started) ? started : 0,
    solved: Number.isFinite(solved) ? solved : 0,
    failed: Number.isFinite(failed) ? failed : 0,
    accuracy: Number.isFinite(accuracy) ? accuracy : 0,
    usedToday: Number.isFinite(usedToday) ? usedToday : 0,
  };
}

export function buildWeakness({ gamesPlayed, wins, losses, draws, recentGames, userId, puzzleActivity }) {
  const sortedGames = [...recentGames].sort((a, b) => getGameDateValue(b) - getGameDateValue(a));
  const latestGameAge = daysSince(getGameDateValue(sortedGames[0]));
  const recentResults = sortedGames.slice(0, 5).map((game) => getRuleGameResult(game, userId));
  const recentLosses = recentResults.filter((result) => result === "Loss").length;
  const recentLossStreak = recentResults[0] === "Loss" && recentResults[1] === "Loss";
  const winRate = Math.round((wins / Math.max(gamesPlayed, 1)) * 100);

  if (gamesPlayed <= 0) {
    return {
      id: "practice-consistency-new-user",
      weakness: "Practice Consistency",
      tone: "info",
      explanation: "There is not enough game history yet, so your first signal is training consistency.",
      suggestion: "Solve 5 tactical puzzles today, then play one AI game so ChessPlay can compare practice with real positions.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      reason: "no_games",
    };
  }

  if (puzzleActivity.started === 0 && puzzleActivity.usedToday === 0) {
    return {
      id: "tactical-practice-no-puzzles",
      weakness: "Tactical Practice",
      tone: "warning",
      explanation: "You have game activity, but no puzzle practice yet. Tactics are the safest first pattern to train.",
      suggestion: "Solve 5 tactical puzzles today before your next game.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      reason: "no_puzzle_activity",
    };
  }

  if (puzzleActivity.started >= 5 && puzzleActivity.accuracy > 0 && puzzleActivity.accuracy < 55) {
    return {
      id: "tactical-practice-low-accuracy",
      weakness: "Tactical Practice",
      tone: "warning",
      explanation: `Your puzzle accuracy is ${puzzleActivity.accuracy}%, so tactics are the clearest practice signal.`,
      suggestion: "Slow down on puzzles: identify checks, captures, and threats before moving.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      reason: "low_puzzle_accuracy",
    };
  }

  if (gamesPlayed >= 3 && (losses >= wins + 1 || winRate < 40 || recentLossStreak)) {
    return {
      id: "game-stability-loss-trend",
      weakness: "Game Stability",
      tone: "danger",
      explanation: recentLosses >= 2
        ? `You lost ${recentLosses} of your recent games. This record-based MVP flags stability without claiming move-level blunder analysis.`
        : "Your win/loss trend suggests stability is the safest area to improve.",
      suggestion: "Before every move, ask: what changed after my opponent moved, and is my plan still safe?",
      ctaLabel: "Play Safer AI Game",
      ctaRoute: "ai",
      reason: "loss_trend",
    };
  }

  if (latestGameAge !== null && latestGameAge >= 3) {
    return {
      id: "practice-consistency-inactive",
      weakness: "Practice Consistency",
      tone: "info",
      explanation: `You have not played in ${latestGameAge} days, so consistency is currently the clearest improvement lever.`,
      suggestion: "Restart with a short puzzle set, then play one AI game to rebuild rhythm.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      reason: "inactive",
    };
  }

  if (gamesPlayed >= 5 && draws + losses >= Math.ceil(gamesPlayed * 0.45)) {
    return {
      id: "conversion-practice-results",
      weakness: "Conversion Practice",
      tone: "primary",
      explanation: "Your record shows several non-winning results. This MVP treats that as a conversion practice signal, not engine analysis.",
      suggestion: "Review one recent non-win and practice turning advantages into simpler positions.",
      ctaLabel: "Review Games",
      ctaRoute: "history",
      reason: "conversion",
    };
  }

  if (gamesPlayed >= 3 && puzzleActivity.usedToday === 0) {
    return {
      id: "opening-practice-no-warmup",
      weakness: "Opening Practice",
      tone: "primary",
      explanation: "You are playing games without a tactical warmup. A short opening review can reduce early instability.",
      suggestion: "Warm up with a small puzzle set, then review your first 10 moves from a recent game.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      reason: "no_warmup",
    };
  }

  return {
    id: "tactical-practice-default",
    weakness: "Tactical Practice",
    tone: "success",
    explanation: "Your current profile is balanced, so tactics remain the highest-impact daily practice target.",
    suggestion: "Solve 5 tactical puzzles today and review any failed attempts.",
    ctaLabel: "Start Training",
    ctaRoute: "puzzles",
    reason: "default",
  };
}
