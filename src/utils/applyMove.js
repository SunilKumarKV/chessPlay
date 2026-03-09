import { colorOf, typeOf, cloneBoard } from "./boardUtils";

export function applyMove(
  board,
  from,
  to,
  castlingRights,
  promotionPiece = "Q",
) {
  const [fr, fc] = from;
  const [tr, tc] = to;
  const piece = board[fr][fc];
  const color = colorOf(piece);
  const type = typeOf(piece);
  const next = cloneBoard(board);

  next[tr][tc] = piece;
  next[fr][fc] = null;

  if (type === "P" && tc !== fc && !board[tr][tc]) {
    next[fr][tc] = null;
  }

  let newEnPassant = null;
  if (type === "P" && Math.abs(tr - fr) === 2) {
    newEnPassant = [(fr + tr) / 2, tc];
  }

  if (type === "P" && (tr === 0 || tr === 7)) {
    next[tr][tc] = color + promotionPiece;
  }

  if (type === "K" && Math.abs(tc - fc) === 2) {
    const baseRow = color === "w" ? 7 : 0;
    if (tc === 6) {
      next[baseRow][5] = next[baseRow][7];
      next[baseRow][7] = null;
    } // kingside
    if (tc === 2) {
      next[baseRow][3] = next[baseRow][0];
      next[baseRow][0] = null;
    } // queenside
  }

  const newCastling = {
    w: { ...castlingRights.w },
    b: { ...castlingRights.b },
  };

  if (type === "K") {
    newCastling[color].kingSide = false;
    newCastling[color].queenSide = false;
  }

  if (type === "R") {
    const baseRow = color === "w" ? 7 : 0;
    if (fr === baseRow && fc === 7) newCastling[color].kingSide = false;
    if (fr === baseRow && fc === 0) newCastling[color].queenSide = false;
  }

  return { newBoard: next, newEnPassant, newCastling };
}
