export const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const colorOf = (piece) => (piece ? piece[0] : null);
export const typeOf = (piece) => (piece ? piece[1] : null);
export const opponent = (color) => (color === "w" ? "b" : "w");
export const cloneBoard = (board) => board.map((row) => [...row]);
export const toAlgebraic = (row, col) => {
  const files = "abcdefgh";
  const ranks = "87654321";
  return `${files[col]}${ranks[row]}`;
};
export const buildMoveLabel = (piece, from, to, promotion = null) => {
  const type = typeOf(piece);
  const promo = promotion ? `=${promotion}` : "";
  return `${type}${toAlgebraic(...from)}→${toAlgebraic(...to)}${promo}`;
};
