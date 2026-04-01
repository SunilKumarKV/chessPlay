import { colorOf, typeOf, opponent, cloneBoard } from "./boardUtils";
import { getRawMoves } from "./moveGeneration";

// CHECK DETECTION

export function isInCheck(board, color, enPassantTarget, castlingRights) {
  // Locate the king
  let kingRow = -1,
    kingCol = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === color + "K") {
        kingRow = r;
        kingCol = c;
      }
    }
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (colorOf(board[r][c]) === opponent(color)) {
        const enemyMoves = getRawMoves(
          board,
          r,
          c,
          enPassantTarget,
          castlingRights,
        );
        if (enemyMoves.some(([mr, mc]) => mr === kingRow && mc === kingCol))
          return true;
      }
    }
  }
  return false;
}

export function getLegalMoves(
  board,
  row,
  col,
  enPassantTarget,
  castlingRights,
) {
  const piece = board[row][col];
  if (!piece) return [];

  const color = colorOf(piece);
  const rawMoves = getRawMoves(
    board,
    row,
    col,
    enPassantTarget,
    castlingRights,
  );
  const legal = [];

  for (const [tr, tc] of rawMoves) {
    const next = cloneBoard(board);
    next[tr][tc] = piece;
    next[row][col] = null;

    // ── Special case: castling — also move the rook and check the pass-through square
    if (typeOf(piece) === "K" && Math.abs(tc - col) === 2) {
      const baseRow = color === "w" ? 7 : 0;
      const passCol = tc === 6 ? 5 : 3;
      const rookFrom = tc === 6 ? 7 : 0;
      const rookTo = tc === 6 ? 5 : 3;

      // Move rook in the simulation
      next[baseRow][rookTo] = next[baseRow][rookFrom];
      next[baseRow][rookFrom] = null;

      // Cannot castle through check — test the intermediate square
      const midBoard = cloneBoard(board);
      midBoard[baseRow][passCol] = piece;
      midBoard[row][col] = null;
      if (isInCheck(midBoard, color, null, castlingRights)) continue;

      // Cannot castle while in check — already filtered below
    }

    // ── Special case: en passant — remove the captured pawn
    if (typeOf(piece) === "P" && tc !== col && !board[tr][tc]) {
      next[row][tc] = null; // captured pawn sits on same rank as moving pawn
    }

    // Only keep this move if our king is safe after it
    if (!isInCheck(next, color, null, castlingRights)) {
      legal.push([tr, tc]);
    }
  }

  return legal;
}

export function hasAnyLegalMove(board, color, enPassantTarget, castlingRights) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (colorOf(board[r][c]) === color) {
        if (
          getLegalMoves(board, r, c, enPassantTarget, castlingRights).length > 0
        )
          return true;
      }
    }
  }
  return false;
}

/**
 * Derive the current game status.
 * @returns {'playing' | 'check' | 'checkmate' | 'stalemate'}
 */
export function getGameStatus(
  board,
  currentTurn,
  enPassantTarget,
  castlingRights,
) {
  const inCheck = isInCheck(
    board,
    currentTurn,
    enPassantTarget,
    castlingRights,
  );
  const hasMoves = hasAnyLegalMove(
    board,
    currentTurn,
    enPassantTarget,
    castlingRights,
  );

  if (!hasMoves) return inCheck ? "checkmate" : "stalemate";
  if (inCheck) return "check";
  return "playing";
}
