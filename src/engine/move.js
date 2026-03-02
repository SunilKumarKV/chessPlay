export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function makeMove(board, from, to) {
  const newBoard = cloneBoard(board);

  const [fr, fc] = from;
  const [tr, tc] = to;

  newBoard[tr][tc] = newBoard[fr][fc];
  newBoard[fr][fc] = "";

  return newBoard;
}
