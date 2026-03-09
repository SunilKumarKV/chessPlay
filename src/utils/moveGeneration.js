import { inBounds, colorOf, typeOf, opponent } from "./boardUtils";

export function getRawMoves(board, row, col, enPassantTarget, castlingRights) {
  const piece = board[row][col];
  if (!piece) return [];

  const color = colorOf(piece);
  const type = typeOf(piece);
  const moves = [];

  const addIfValid = (r, c) => {
    if (!inBounds(r, c)) return false;
    if (colorOf(board[r][c]) === color) return false; // blocked by own piece
    moves.push([r, c]);
    return colorOf(board[r][c]) === opponent(color); // stop after capture
  };

  const slide = (dr, dc) => {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      if (addIfValid(r, c)) break;
      r += dr;
      c += dc;
    }
  };

  if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;

    // Single push
    if (inBounds(row + dir, col) && !board[row + dir][col]) {
      moves.push([row + dir, col]);
      // Double push from starting rank
      if (row === startRow && !board[row + 2 * dir][col]) {
        moves.push([row + 2 * dir, col]);
      }
    }

    // Diagonal captures + en passant
    for (const dc of [-1, 1]) {
      const nr = row + dir;
      const nc = col + dc;
      if (inBounds(nr, nc)) {
        if (colorOf(board[nr][nc]) === opponent(color)) {
          moves.push([nr, nc]);
        }
        if (
          enPassantTarget &&
          enPassantTarget[0] === nr &&
          enPassantTarget[1] === nc
        ) {
          moves.push([nr, nc]);
        }
      }
    }
  }

  // ── KNIGHT ────────────────────────────────────────────────
  if (type === "N") {
    for (const [dr, dc] of [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ]) {
      addIfValid(row + dr, col + dc);
    }
  }

  // ── BISHOP ────────────────────────────────────────────────
  if (type === "B") {
    for (const [dr, dc] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ])
      slide(dr, dc);
  }

  // ── ROOK ──────────────────────────────────────────────────
  if (type === "R") {
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ])
      slide(dr, dc);
  }

  // ── QUEEN = BISHOP + ROOK ─────────────────────────────────
  if (type === "Q") {
    for (const [dr, dc] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1], // diagonal
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1], // straight
    ])
      slide(dr, dc);
  }

  // ── KING ──────────────────────────────────────────────────
  if (type === "K") {
    for (const [dr, dc] of [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ])
      addIfValid(row + dr, col + dc);

    const baseRow = color === "w" ? 7 : 0;
    if (row === baseRow && col === 4) {
      const cr = castlingRights[color];
      if (cr.kingSide && !board[baseRow][5] && !board[baseRow][6])
        moves.push([baseRow, 6]);
      if (
        cr.queenSide &&
        !board[baseRow][3] &&
        !board[baseRow][2] &&
        !board[baseRow][1]
      )
        moves.push([baseRow, 2]);
    }
  }

  return moves;
}
