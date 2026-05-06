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
  hint: null,

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

const TIME_CONTROLS = {
  none: { label: "No timer", initial: null, increment: 0 },
  bullet: { label: "Bullet", initial: 60, increment: 0 },
  blitz: { label: "Blitz", initial: 300, increment: 0 },
  rapid: { label: "Rapid", initial: 600, increment: 0 },
};

const DEFAULT_TIME_CONTROL = TIME_CONTROLS.blitz;

function buildGameFromHistory(history) {
  const game = new Chess();
  history.forEach((move) => {
    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || undefined,
    });
  });
  return game;
}

function rebuildPosition(state, history) {
  const game = buildGameFromHistory(history);
  state.game = game;
  state.fen = game.fen();
  state.history = history;
  state.currentMove = history.length;
  state.lastMove = history.length
    ? {
        from: history[history.length - 1].from,
        to: history[history.length - 1].to,
      }
    : null;
  state.selectedSquare = null;
  state.possibleMoves = [];
  state.isGameOver = game.isGameOver();
  state.result = null;
  state.winner = null;
  state.hint = null;

  if (game.isGameOver()) {
    if (game.isCheckmate()) {
      state.result = "checkmate";
      state.winner = game.turn() === "w" ? "b" : "w";
    } else if (game.isStalemate()) {
      state.result = "stalemate";
    } else if (game.isDraw()) {
      state.result = "draw";
    }
  }

  state.capturedWhite = [];
  state.capturedBlack = [];
  history.forEach((move) => {
    if (!move.captured) return;
    const capturedPiece =
      move.color === "w"
        ? move.captured.toUpperCase()
        : move.captured.toLowerCase();
    if (move.color === "w") {
      state.capturedBlack.push(capturedPiece);
    } else {
      state.capturedWhite.push(capturedPiece);
    }
  });
}

function serializeMove(move) {
  return {
    color: move.color,
    from: move.from,
    to: move.to,
    piece: move.piece,
    captured: move.captured || null,
    promotion: move.promotion || null,
    flags: move.flags,
    san: move.san,
    lan: move.lan,
  };
}

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
          state.history.push(serializeMove(move));
          state.currentMove = state.history.length;
          state.lastMove = { from, to };
          state.selectedSquare = null;
          state.possibleMoves = [];
          state.hint = null;
          state.gameStarted = true;
          if (state.timeControl.initial !== null) {
            const movedColor = move.color;
            const nextColor = state.game.turn();
            const increment = state.timeControl.increment || 0;
            if (movedColor === "w") {
              state.whiteTime += increment;
            } else {
              state.blackTime += increment;
            }
            state.activeClock = nextColor;
          }

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
      state.hint = null;
    },

    undoLastTurn: (state) => {
      if (state.history.length === 0 || state.isGameOver) return;
      const humanColor = state.aiColor === "w" ? "b" : "w";
      const movesToRemove =
        state.history.at(-1)?.color === humanColor || state.history.length === 1
          ? 1
          : 2;
      const nextHistory = state.history.slice(0, -movesToRemove);
      rebuildPosition(state, nextHistory);
      state.gameStarted = nextHistory.length > 0;
      state.activeClock = state.game.turn();
    },

    resignGame: (state) => {
      if (state.isGameOver) return;
      const humanColor = state.aiColor === "w" ? "b" : "w";
      state.isGameOver = true;
      state.result = "resigned";
      state.winner = state.aiColor;
      state.activeClock = humanColor;
      state.hint = null;
    },

    // Settings
    setAiEnabled: (state, action) => {
      state.aiEnabled = action.payload;
    },

    setAiColor: (state, action) => {
      state.aiColor = action.payload;
      state.flipped = action.payload === "w";
      const history = [];
      rebuildPosition(state, history);
      state.whiteTime = state.timeControl.initial;
      state.blackTime = state.timeControl.initial;
      state.gameStarted = false;
    },

    setAiDifficulty: (state, action) => {
      state.aiDifficulty = action.payload;
    },

    setFlipped: (state, action) => {
      state.flipped = action.payload;
    },

    setTimeControl: (state, action) => {
      const nextControl =
        typeof action.payload === "string"
          ? TIME_CONTROLS[action.payload]
          : action.payload;
      state.timeControl = nextControl || DEFAULT_TIME_CONTROL;
      state.whiteTime = state.timeControl.initial;
      state.blackTime = state.timeControl.initial;
      state.activeClock = state.game.turn();
    },

    // Clock
    updateClock: (state, action) => {
      const { color, time } = action.payload;
      if (color === "w") {
        state.whiteTime = time;
      } else {
        state.blackTime = time;
      }
      if (time <= 0) {
        state.isGameOver = true;
        state.result = "timeout";
        state.winner = color === "w" ? "b" : "w";
      }
    },

    switchClock: (state, action) => {
      state.activeClock = action.payload;
    },

    startGame: (state) => {
      state.gameStarted = true;
    },

    setHint: (state, action) => {
      state.hint = action.payload;
    },

    // Navigation
    goToMove: (state, action) => {
      const moveIndex = action.payload;
      if (moveIndex >= 0 && moveIndex <= state.history.length) {
        state.currentMove = moveIndex;
        // Recreate game state up to this move
        const tempGame = new Chess();
        for (let i = 0; i < moveIndex; i++) {
          const move = state.history[i];
          tempGame.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion || undefined,
          });
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
  undoLastTurn,
  resignGame,
  updateClock,
  switchClock,
  startGame,
  setHint,
  goToMove,
} = chessGameSlice.actions;

export { TIME_CONTROLS };
export default chessGameSlice.reducer;
