import { makeMove } from "./move";
import { isKingInCheck } from "./check";

const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function getLegalMoves(board, row, col, turn) {
  const piece = board[row][col];
  if (!piece || piece[0] !== turn) return [];

  const pseudoMoves = getPseudoMoves(board, row, col);
  const legalMoves = [];

  for (let move of pseudoMoves) {
    const newBoard = makeMove(board, [row, col], move);

    if (!isKingInCheck(newBoard, turn)) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

function getPseudoMoves(board, row, col) {
  const piece = board[row][col];
  const color = piece[0];
  const type = piece[1];
  let moves = [];

  const directions = {
    rook: [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ],
    bishop: [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ],
    knight: [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ],
  };

  const add = (r, c) => {
    if (!inBounds(r, c)) return;
    if (!board[r][c] || board[r][c][0] !== color) moves.push([r, c]);
  };

  if (type === "p") {
    const dir = color === "w" ? -1 : 1;

    if (inBounds(row + dir, col) && !board[row + dir][col])
      moves.push([row + dir, col]);

    if ((color === "w" && row === 6) || (color === "b" && row === 1)) {
      if (!board[row + dir][col] && !board[row + 2 * dir][col])
        moves.push([row + 2 * dir, col]);
    }

    for (let dc of [-1, 1]) {
      const r = row + dir,
        c = col + dc;
      if (inBounds(r, c) && board[r][c] && board[r][c][0] !== color)
        moves.push([r, c]);
    }
  }

  if (type === "r" || type === "q") {
    for (let [dr, dc] of directions.rook) {
      for (let i = 1; i < 8; i++) {
        const r = row + dr * i,
          c = col + dc * i;
        if (!inBounds(r, c)) break;
        if (board[r][c]) {
          if (board[r][c][0] !== color) moves.push([r, c]);
          break;
        }
        moves.push([r, c]);
      }
    }
  }

  if (type === "b" || type === "q") {
    for (let [dr, dc] of directions.bishop) {
      for (let i = 1; i < 8; i++) {
        const r = row + dr * i,
          c = col + dc * i;
        if (!inBounds(r, c)) break;
        if (board[r][c]) {
          if (board[r][c][0] !== color) moves.push([r, c]);
          break;
        }
        moves.push([r, c]);
      }
    }
  }

  if (type === "n") {
    directions.knight.forEach(([dr, dc]) => {
      add(row + dr, col + dc);
    });
  }

  if (type === "k") {
    const kingMoves = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    kingMoves.forEach(([dr, dc]) => {
      add(row + dr, col + dc);
    });
  }

  return moves;
}
