export function isKingInCheck(board, color) {
  let kingPos;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === color + "k") kingPos = [r, c];
    }
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && board[r][c][0] !== color) {
        // generate opponent moves and see if king attacked
      }
    }
  }

  return false;
}
