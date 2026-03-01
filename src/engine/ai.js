import { getLegalMoves } from "./moves";

function evaluateBoard(board) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  let score = 0;

  for (let row of board) {
    for (let piece of row) {
      if (piece) {
        const value = values[piece[1]];
        score += piece[0] === "w" ? value : -value;
      }
    }
  }
  return score;
}

export function minimax(board, depth, isMax) {
  if (depth === 0) return evaluateBoard(board);

  // simplified search
  return evaluateBoard(board);
}
