export const AI_LEVELS = {
  easy: {
    id: "easy",
    label: "Easy",
    depth: 4,
    skill: 5,
    description: "Beginner friendly moves with fast replies.",
  },
  medium: {
    id: "medium",
    label: "Medium",
    depth: 8,
    skill: 10,
    description: "Balanced club-level challenge.",
  },
  hard: {
    id: "hard",
    label: "Hard",
    depth: 14,
    skill: 18,
    description: "Strong tactical play for serious practice.",
  },
  pro: {
    id: "pro",
    label: "Pro",
    depth: 20,
    skill: 20,
    description: "Maximum Stockfish strength for premium analysis.",
  },
};

export const AI_LEVEL_ORDER = ["easy", "medium", "hard", "pro"];

export function normalizeAiLevel(value) {
  if (AI_LEVELS[value]) return value;
  const numeric = Number(value);
  if (numeric <= 5) return "easy";
  if (numeric <= 10) return "medium";
  if (numeric <= 18) return "hard";
  return "pro";
}

export function getAiLevelConfig(value) {
  return AI_LEVELS[normalizeAiLevel(value)] || AI_LEVELS.medium;
}

export function classifyMoveByCentipawn(score) {
  if (score == null || Number.isNaN(Number(score))) return "Analyzing";
  const cp = Math.abs(Number(score));
  if (cp <= 20) return "Best / Excellent";
  if (cp <= 60) return "Good";
  if (cp <= 140) return "Inaccuracy";
  if (cp <= 300) return "Mistake";
  return "Blunder risk";
}
