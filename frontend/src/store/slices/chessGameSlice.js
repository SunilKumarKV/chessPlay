import { createSlice } from "@reduxjs/toolkit";
import { Chess } from "chess.js";

const initialState = {
  // Game state
  game: new Chess(),
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  history: [],
  currentMove: 0,

  // Game status
  isGameOver: false,
  result: null, // 'checkmate', 'stalemate', 'draw', etc.
  winner: null,

  // AI state
  aiEnabled: true,
  aiColor: "b", // 'w' or 'b'
  aiThinking: false,
  aiDifficulty: 10, // 0-20 scale

  // UI state
  selectedSquare: null,
  possibleMoves: [],
  lastMove: null,
  flipped: false,

  // Captured pieces
  capturedWhite: [],
  capturedBlack: [],

  // Time control
  timeControl: { initial: 300, increment: 0 }, // seconds
  whiteTime: 300,
  blackTime: 300,
  activeClock: "w",
  gameStarted: false,
};

const chessGameSlice = createSlice({
  name: "chessGame",
  initialState,
  reducers: {
    // Game actions
    makeMove: (state, action) => {
      const { from, to, promotion } = action.payload;
      try {
        const move = state.game.move({ from, to, promotion });
        if (move) {
          state.fen = state.game.fen();
          state.history.push(move);
          state.currentMove = state.history.length;
          state.lastMove = { from, to };

          // Update captured pieces
          if (move.captured) {
            const capturedPiece =
              move.color === "w"
                ? move.captured.toUpperCase()
                : move.captured.toLowerCase();
            if (move.color === "w") {
              state.capturedBlack.push(capturedPiece);
            } else {
              state.capturedWhite.push(capturedPiece);
            }
          }

          // Check game status
          if (state.game.isGameOver()) {
            state.isGameOver = true;
            if (state.game.isCheckmate()) {
              state.result = "checkmate";
              state.winner = state.game.turn() === "w" ? "b" : "w";
            } else if (state.game.isStalemate()) {
              state.result = "stalemate";
            } else if (state.game.isDraw()) {
              state.result = "draw";
            }
          }
        }
      } catch (error) {
        console.error("Invalid move:", error);
      }
    },

    // UI actions
    selectSquare: (state, action) => {
      const square = action.payload;
      state.selectedSquare = square;

      if (square) {
        const moves = state.game.moves({ square, verbose: true });
        state.possibleMoves = moves.map((move) => move.to);
      } else {
        state.possibleMoves = [];
      }
    },

    clearSelection: (state) => {
      state.selectedSquare = null;
      state.possibleMoves = [];
    },

    // AI actions
    setAiThinking: (state, action) => {
      state.aiThinking = action.payload;
    },

    // Game control
    resetGame: (state) => {
      state.game = new Chess();
      state.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      state.history = [];
      state.currentMove = 0;
      state.isGameOver = false;
      state.result = null;
      state.winner = null;
      state.selectedSquare = null;
      state.possibleMoves = [];
      state.lastMove = null;
      state.capturedWhite = [];
      state.capturedBlack = [];
      state.whiteTime = state.timeControl.initial;
      state.blackTime = state.timeControl.initial;
      state.activeClock = "w";
      state.gameStarted = false;
    },

    // Settings
    setAiEnabled: (state, action) => {
      state.aiEnabled = action.payload;
    },

    setAiColor: (state, action) => {
      state.aiColor = action.payload;
    },

    setAiDifficulty: (state, action) => {
      state.aiDifficulty = action.payload;
    },

    setFlipped: (state, action) => {
      state.flipped = action.payload;
    },

    setTimeControl: (state, action) => {
      state.timeControl = action.payload;
      state.whiteTime = action.payload.initial;
      state.blackTime = action.payload.initial;
    },

    // Clock
    updateClock: (state, action) => {
      const { color, time } = action.payload;
      if (color === "w") {
        state.whiteTime = time;
      } else {
        state.blackTime = time;
      }
    },

    switchClock: (state, action) => {
      state.activeClock = action.payload;
    },

    startGame: (state) => {
      state.gameStarted = true;
    },

    // Navigation
    goToMove: (state, action) => {
      const moveIndex = action.payload;
      if (moveIndex >= 0 && moveIndex <= state.history.length) {
        state.currentMove = moveIndex;
        // Recreate game state up to this move
        const tempGame = new Chess();
        for (let i = 0; i < moveIndex; i++) {
          tempGame.move(state.history[i]);
        }
        state.game = tempGame;
        state.fen = tempGame.fen();
      }
    },
  },
});

export const {
  makeMove,
  selectSquare,
  clearSelection,
  setAiThinking,
  resetGame,
  setAiEnabled,
  setAiColor,
  setAiDifficulty,
  setFlipped,
  setTimeControl,
  updateClock,
  switchClock,
  startGame,
  goToMove,
} = chessGameSlice.actions;

export default chessGameSlice.reducer;
