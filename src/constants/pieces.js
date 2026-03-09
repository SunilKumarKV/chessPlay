export const EMPTY = null;

/** Unicode symbols keyed by piece code e.g. "wK" → "♔" */
export const PIECE_SYMBOLS = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};

/** Pieces a pawn can promote to */
export const PROMOTION_PIECES = ["Q", "R", "B", "N"];

/** Human-readable piece names */
export const PIECE_NAMES = {
  K: "King",
  Q: "Queen",
  R: "Rook",
  B: "Bishop",
  N: "Knight",
  P: "Pawn",
};
