export const AI_LEVELS = {
  easy: {
    id: "easy",
    label: "Easy",
    depth: 2,
    skill: 1,
    movetime: 450,
    moveDelay: 900,
    description: "Beginner friendly moves with a calmer reply speed.",
  },
  medium: {
    id: "medium",
    label: "Medium",
    depth: 6,
    skill: 8,
    movetime: 800,
    moveDelay: 700,
    description: "Balanced club-level challenge.",
  },
  hard: {
    id: "hard",
    label: "Hard",
    depth: 12,
    skill: 16,
    movetime: 1300,
    moveDelay: 500,
    description: "Strong tactical play for serious practice.",
  },
  pro: {
    id: "pro",
    label: "Pro",
    depth: 18,
    skill: 20,
    movetime: 2000,
    moveDelay: 350,
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
