export function buildTrainingRecommendation({ weakness, gamesPlayed, puzzleActivity }) {
  if (!weakness) return null;

  const base = {
    id: `training-${weakness.id}`,
    weakness: weakness.weakness,
    weaknessRule: weakness.reason,
  };

  if (weakness.weakness === "Tactical Practice") {
    return {
      ...base,
      title: "Tactical Practice",
      reason: puzzleActivity.started >= 5 && puzzleActivity.accuracy > 0
        ? `Your tactical accuracy is ${puzzleActivity.accuracy}%, so the fastest gain is cleaner calculation.`
        : "Your activity points to tactics as the next highest-impact training area.",
      action: "Solve 5 tactics today.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      trainingType: "tactics",
      tone: "warning",
    };
  }

  if (weakness.weakness === "Practice Consistency" || weakness.weakness === "Puzzle Consistency") {
    return {
      ...base,
      title: "Practice Consistency",
      reason: gamesPlayed <= 0
        ? "ChessPlay needs one real game signal, and a steady first session is better than a long plan."
        : "Your recent activity rhythm is the limiting factor right now.",
      action: "Play one 10-minute AI game.",
      ctaLabel: "Play 10-Min AI Game",
      ctaRoute: "ai",
      timeControl: "10+0",
      trainingType: "ai_game",
      tone: "info",
    };
  }

  if (weakness.weakness === "Opening Practice") {
    return {
      ...base,
      title: "Opening Practice",
      reason: "Your current pattern suggests early move quality needs a quick review before more games.",
      action: "Review your first 10 moves and look for undeveloped pieces, king safety, and early threats.",
      ctaLabel: "Review Openings",
      ctaRoute: "analysis",
      trainingType: "openings",
      tone: "primary",
    };
  }

  if (weakness.weakness === "Conversion Practice") {
    return {
      ...base,
      title: "Conversion Practice",
      reason: "Non-winning results make conversion practice the clearest next step from the current signals.",
      action: "Practice simple endgame-style positions and review one recent non-win.",
      ctaLabel: "Review Games",
      ctaRoute: "history",
      trainingType: "endgames",
      tone: "primary",
    };
  }

  if (weakness.weakness === "Game Stability") {
    return {
      ...base,
      title: "Game Stability",
      reason: "Your loss trend points to safer move selection and board checks before each move.",
      action: "Review your last game, then play one safer AI game.",
      ctaLabel: "Review Last Game",
      ctaRoute: "history",
      trainingType: "review_games",
      tone: "danger",
    };
  }

  return {
    ...base,
    title: "Tactical Practice",
    reason: "Tactics are the clearest daily training path from the current signals.",
    action: "Solve 5 tactics today.",
    ctaLabel: "Start Training",
    ctaRoute: "puzzles",
    trainingType: "tactics",
    tone: "success",
  };
}
