import { getLegalMoves } from "./moves";
import { makeMove } from "./move";

function evaluate(board) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  let score = 0;

  for (let row of board) {
    for (let piece of row) {
      if (piece) {
        const val = values[piece[1]];
        score += piece[0] === "w" ? val : -val;
      }
    }
  }
  return score;
}

export function minimax(board, depth, turn, maximizing) {
  if (depth === 0) return evaluate(board);

  const moves = getAllMoves(board, turn);

  if (maximizing) {
    let maxEval = -Infinity;
    for (let move of moves) {
      const newBoard = makeMove(board, move.from, move.to);
      const evalScore = minimax(newBoard, depth - 1, flip(turn), false);
      maxEval = Math.max(maxEval, evalScore);
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let move of moves) {
      const newBoard = makeMove(board, move.from, move.to);
      const evalScore = minimax(newBoard, depth - 1, flip(turn), true);
      minEval = Math.min(minEval, evalScore);
    }
    return minEval;
  }
}

function getAllMoves(board, turn) {
  let all = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && board[r][c][0] === turn) {
        const moves = getLegalMoves(board, r, c, turn);
        moves.forEach((m) => {
          all.push({ from: [r, c], to: m });
        });
      }
    }
  }
  return all;
}

function flip(color) {
  return color === "w" ? "b" : "w";
}
