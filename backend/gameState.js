const { getPositionKey } = require("./chessUtils");

function createInitialGameState() {
  const gameState = {
    board: [
      ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
      ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
      ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
    ],
    turn: "w",
    enPassant: null,
    castling: {
      w: { kingSide: true, queenSide: true },
      b: { kingSide: true, queenSide: true },
    },
    status: "playing",
    halfmoveClock: 0,
    positionHistory: [],
    moveHistory: [],
    capturedW: [],
    capturedB: [],
    chatHistory: [],
    players: {
      w: { id: null, name: "Player 1", userId: null, disconnected: false },
      b: { id: null, name: "Player 2", userId: null, disconnected: false },
    },
  };

  gameState.positionHistory = [getPositionKey(gameState)];
  return gameState;
}

function isPlayableStatus(status) {
  return status === "playing" || status === "check";
}

function toGameResult(status) {
  if (isPlayableStatus(status)) return "ongoing";
  if (
    status === "draw" ||
    status === "stalemate" ||
    status === "draw-50move" ||
    status === "draw-repetition"
  ) {
    return "draw";
  }
  return status;
}

module.exports = {
  createInitialGameState,
  isPlayableStatus,
  toGameResult,
};
