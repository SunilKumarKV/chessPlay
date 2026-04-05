import { colorOf, typeOf, cloneBoard } from "./boardUtils";

// ─────────────────────────────────────────────────────────────
// APPLY MOVE
// Takes the current board + move parameters, returns the next
// board state including updated castling rights and en-passant
// target.  Does NOT validate legality — call getLegalMoves first.
// ─────────────────────────────────────────────────────────────

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

  // ── Standard move
  next[tr][tc] = piece;
  next[fr][fc] = null;

  // ── En passant capture: remove the pawn on the same rank as the moving pawn
  if (type === "P" && tc !== fc && !board[tr][tc]) {
    next[fr][tc] = null;
  }

  // ── Double pawn push: set the en-passant target on the skipped square
  let newEnPassant = null;
  if (type === "P" && Math.abs(tr - fr) === 2) {
    newEnPassant = [(fr + tr) / 2, tc];
  }

  // ── Pawn promotion
  if (type === "P" && (tr === 0 || tr === 7)) {
    next[tr][tc] = color + promotionPiece;
  }

  // ── Castling: move the corresponding rook
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

  // ── Update castling rights
  const newCastling = {
    w: { ...castlingRights.w },
    b: { ...castlingRights.b },
  };
  // King moved → lose both rights
  if (type === "K") {
    newCastling[color].kingSide = false;
    newCastling[color].queenSide = false;
  }
  // Rook moved → lose that side's right
  if (type === "R") {
    const baseRow = color === "w" ? 7 : 0;
    if (fr === baseRow && fc === 7) newCastling[color].kingSide = false;
    if (fr === baseRow && fc === 0) newCastling[color].queenSide = false;
  }

  // Rook captured → lose opponent rook rights if the captured rook was on its original square
  let capturedPiece = board[tr][tc];
  if (type === "P" && tc !== fc && !board[tr][tc]) {
    capturedPiece = board[fr][tc];
  }
  if (capturedPiece && typeOf(capturedPiece) === "R") {
    const capturedColor = colorOf(capturedPiece);
    const baseRow = capturedColor === "w" ? 7 : 0;
    if (tr === baseRow && tc === 7) newCastling[capturedColor].kingSide = false;
    if (tr === baseRow && tc === 0)
      newCastling[capturedColor].queenSide = false;
  }

  return { newBoard: next, newEnPassant, newCastling };
}
