import { getLegalMoves } from "./moves";

export function isKingInCheck(board, color) {
  let kingPos;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === color + "k") kingPos = [r, c];
    }
  }

  const opponent = color === "w" ? "b" : "w";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && board[r][c][0] === opponent) {
        const moves = getPseudoOnly(board, r, c);
        for (let m of moves) {
          if (m[0] === kingPos[0] && m[1] === kingPos[1]) return true;
        }
      }
    }
  }

  return false;
}

function getPseudoOnly(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];
  const color = piece[0];
  const type = piece[1];
  let moves = [];
  const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

  if (type === "p") {
    const dir = color === "w" ? -1 : 1;
    for (let dc of [-1, 1]) {
      const r = row + dir,
        c = col + dc;
      if (inBounds(r, c)) moves.push([r, c]);
    }
  }

  return moves;
}
