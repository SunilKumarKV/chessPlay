const PREMIUM_THEME_HINTS = new Set([
  "advancedPawn",
  "attraction",
  "clearance",
  "deflection",
  "interference",
  "quietMove",
  "sacrifice",
  "veryLong",
]);

function difficultyFromRating(rating) {
  const value = Number(rating) || 0;
  if (value <= 1100) return "beginner";
  if (value <= 1700) return "intermediate";
  if (value <= 2400) return "advanced";
  return "master";
}

function isPremiumPuzzle(rating, themes = []) {
  const difficulty = difficultyFromRating(rating);
  return difficulty === "advanced" || difficulty === "master" || themes.some((theme) => PREMIUM_THEME_HINTS.has(theme));
}

function normalizePuzzleRecord(record) {
  const themes = String(record.Themes || record.themes || "")
    .split(/\s+/)
    .map((theme) => theme.trim())
    .filter(Boolean);
  const openingTags = String(record.OpeningTags || record.openingTags || "")
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const rating = Number(record.Rating ?? record.rating ?? 1200) || 1200;

  return {
    puzzleId: String(record.PuzzleId || record.puzzleId || "").trim(),
    fen: String(record.FEN || record.fen || "").trim(),
    moves: String(record.Moves || record.moves || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean),
    rating,
    ratingDeviation: Number(record.RatingDeviation ?? record.ratingDeviation ?? 0) || 0,
    popularity: Number(record.Popularity ?? record.popularity ?? 0) || 0,
    nbPlays: Number(record.NbPlays ?? record.nbPlays ?? 0) || 0,
    themes,
    gameUrl: String(record.GameUrl || record.gameUrl || "").trim(),
    openingTags,
    difficulty: difficultyFromRating(rating),
    source: record.source || "lichess-open-database-cc0",
    isPremium: typeof record.isPremium === "boolean" ? record.isPremium : isPremiumPuzzle(rating, themes),
    isActive: record.isActive !== false,
  };
}

async function connectDatabase() {
  const { checkDatabase } = require("../lib/prisma");
  const status = await checkDatabase();
  if (!status.ok && process.env.NODE_ENV === "production") {
    throw new Error(`Database unavailable: ${status.message}`);
  }
}

module.exports = {
  connectDatabase,
  difficultyFromRating,
  isPremiumPuzzle,
  normalizePuzzleRecord,
};
