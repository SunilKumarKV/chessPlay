export const saveGame = (board, turn) => {
  localStorage.setItem("chessGame", JSON.stringify({ board, turn }));
};

export const loadGame = () => {
  return JSON.parse(localStorage.getItem("chessGame"));
};
