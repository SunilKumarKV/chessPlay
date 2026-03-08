export const FILES = "abcdefgh";
export const RANKS = "87654321";

export const INITIAL_BOARD = [
  ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
  ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
  ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
];

export const INITIAL_CASTLING = {
  w: { kingSide: true, queenSide: true },
  b: { kingSide: true, queenSide: true },
};

export const SQUARE_COLORS = {
  light: "#f0d9b5",
  dark: "#b58863",
  lightHighlight: "#cdd16f",
  darkHighlight: "#aaa23a",
  selected: "#7fc97f",
};
