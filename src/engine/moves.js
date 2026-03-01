export function getLegalMoves(board, row, col, gameState) {
  const piece = board[row][col];
  if (!piece) return [];

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

  const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

  const addMove = (r, c) => {
    if (inBounds(r, c)) {
      const target = board[r][c];
      if (!target || target[0] !== color) moves.push([r, c]);
    }
  };

  if (type === "p") {
    const dir = color === "w" ? -1 : 1;
    if (!board[row + dir]?.[col]) addMove(row + dir, col);

    if ((color === "w" && row === 6) || (color === "b" && row === 1)) {
      if (!board[row + 2 * dir][col]) addMove(row + 2 * dir, col);
    }

    if (board[row + dir]?.[col + 1]?.[0] !== color) addMove(row + dir, col + 1);

    if (board[row + dir]?.[col - 1]?.[0] !== color) addMove(row + dir, col - 1);
  }

  if (type === "r" || type === "q") {
    directions.rook.forEach(([dr, dc]) => {
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
    });
  }

  if (type === "b" || type === "q") {
    directions.bishop.forEach(([dr, dc]) => {
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
    });
  }

  if (type === "n") {
    directions.knight.forEach(([dr, dc]) => {
      addMove(row + dr, col + dc);
    });
  }

  if (type === "k") {
    directions.rook.concat(directions.bishop).forEach(([dr, dc]) => {
      addMove(row + dr, col + dc);
    });
  }

  return moves;
}
