import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import {
  resetGame,
  makeMove,
  resignGame,
  setAiColor,
  setHint,
  setTimeControl,
  undoLastTurn,
  updateClock,
  TIME_CONTROLS,
} from "../../../store/slices/chessGameSlice";
import Board from "../components/Board";
import ChessClock from "../components/ChessClock";
import MoveHistory from "../components/MoveHistory";
import ChessSettingsModal from "../../../components/ChessSettingsModal";
import EvaluationBar from "../../../components/EvaluationBar";
import { useStockfish } from "../hooks/useStockfish";
import { soundManager } from "../../../utils/sounds/soundManager";
import { loadSettings } from "../../../utils/settingsPersistence";
import { Chess as ChessEngine } from "chess.js";

export default function Chess() {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.chessGame);
  const settings = useAppSelector((state) => state.chessSettings);

  const [showSettings, setShowSettings] = useState(false);
  const humanColor = gameState.aiColor === "w" ? "b" : "w";
  const isHumanTurn =
    !gameState.isGameOver && gameState.game.turn() === humanColor;
  const currentTimeKey =
    Object.entries(TIME_CONTROLS).find(
      ([, control]) =>
        control.initial === gameState.timeControl.initial &&
        control.increment === gameState.timeControl.increment,
    )?.[0] || "blitz";

  // Initialize Stockfish using the canonical { enabled } interface.
  // AI move triggering is handled in the useEffect below via getBestMove.
  const stockfish = useStockfish({
    enabled: gameState.aiEnabled,
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Initialize sound manager
  useEffect(() => {
    soundManager.init();
    soundManager.setEnabled(settings.playSounds);
    soundManager.setTheme(settings.soundTheme);
    soundManager.setVolume(settings.soundVolume);
  }, [settings.playSounds, settings.soundTheme, settings.soundVolume]);

  useEffect(() => {
    if (
      gameState.isGameOver ||
      !gameState.gameStarted ||
      gameState.timeControl.initial === null
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const color = gameState.activeClock;
      const currentTime = color === "w" ? gameState.whiteTime : gameState.blackTime;
      dispatch(updateClock({ color, time: Math.max(0, currentTime - 1) }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    dispatch,
    gameState.activeClock,
    gameState.blackTime,
    gameState.gameStarted,
    gameState.isGameOver,
    gameState.timeControl.initial,
    gameState.whiteTime,
  ]);

  // Handle AI moves: when it's the AI's turn, request a move from Stockfish
  useEffect(() => {
    if (
      !gameState.aiEnabled ||
      !stockfish.ready ||
      gameState.isGameOver ||
      gameState.game.turn() !== gameState.aiColor
    ) {
      return;
    }

    const thinkingTime = 300 + settings.evaluationDepth * 90;

    stockfish
      .getBestMove(gameState.fen, { movetime: thinkingTime })
      .then((uci) => {
        if (!uci) return;
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci[4] || undefined;

        try {
          // Validate the move against chess.js before dispatching
          const testGame = new ChessEngine(gameState.fen);
          const move = testGame.move({ from, to, promotion });
          if (move) {
            dispatch(makeMove({ from, to, promotion }));

            if (settings.playSounds) {
              if (move.captured) {
                soundManager.playCapture();
              } else {
                soundManager.playMove();
              }
            }
          }
        } catch (error) {
          console.error("AI move failed:", error);
        }
      })
      .catch((err) => {
        // Timeout or cancellation — not a fatal error
        console.warn("Stockfish getBestMove:", err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.fen, gameState.aiEnabled, stockfish.ready]);

  // Helper to pair moves for the history list (e.g., 1. e4 e5)
  const movePairs = [];
  for (let i = 0; i < gameState.history.length; i += 2) {
    movePairs.push({
      white: gameState.history[i],
      black: gameState.history[i + 1] || null,
    });
  }

  // Dynamic player names
  const opponentName = gameState.aiEnabled
    ? `Stockfish Lv ${gameState.aiDifficulty}`
    : "Opponent";
  const playerName = "Guest Player";

  const handleNewGame = () => {
    dispatch(resetGame());
    if (settings.playSounds) {
      soundManager.playGameStart();
    }
  };

  const handleHint = async () => {
    if (!isHumanTurn || !stockfish.ready) return;
    dispatch(setHint(null));

    try {
      const uci = await stockfish.getBestMove(gameState.fen, {
        movetime: 700 + settings.evaluationDepth * 60,
      });
      if (!uci) return;

      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const testGame = new ChessEngine(gameState.fen);
      const move = testGame.move({ from, to, promotion: uci[4] || undefined });
      if (move) {
        dispatch(setHint({ from, to, san: move.san }));
      }
    } catch (error) {
      console.warn("Hint unavailable:", error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#312e2b] text-white flex flex-col md:flex-row items-center justify-center p-4 md:p-8 gap-6 font-sans">
      {/* Left Column: Main Board Area */}
      <div className="flex flex-col gap-3 w-full max-w-[650px]">
        {/* Top Player Plate (Opponent / Black) */}
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-md flex items-center justify-center text-2xl shadow">
              🤖
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-200">
                {gameState.flipped ? playerName : opponentName}
              </span>
              <ChessClock
                time={
                  gameState.flipped ? gameState.whiteTime : gameState.blackTime
                }
                active={
                  gameState.activeClock === (gameState.flipped ? "w" : "b")
                }
                color={gameState.flipped ? "white" : "black"}
              />
            </div>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Chess Board */}
        <div className="relative">
          <Board />

          {/* Evaluation Bar */}
          {settings.showEvaluationBar && (
            <div className="absolute -right-12 top-0 h-full">
              <EvaluationBar
                evaluation={0}
                isThinking={stockfish.thinking}
              />
            </div>
          )}
        </div>

        {/* Bottom Player Plate (Player / White) */}
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-md flex items-center justify-center text-2xl shadow">
              👤
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-200">
                {gameState.flipped ? opponentName : playerName}
              </span>
              <ChessClock
                time={
                  gameState.flipped ? gameState.blackTime : gameState.whiteTime
                }
                active={
                  gameState.activeClock === (gameState.flipped ? "b" : "w")
                }
                color={gameState.flipped ? "black" : "white"}
              />
            </div>
          </div>

          {/* Game Status */}
          <div className="text-sm text-gray-300">
            {gameState.isGameOver ? (
              <span className="text-red-400">
                {gameState.result === "checkmate"
                  ? "Checkmate!"
                  : gameState.result === "stalemate"
                    ? "Stalemate"
                    : gameState.result === "draw"
                      ? "Draw"
                      : gameState.result === "resigned"
                        ? "Resigned"
                        : gameState.result === "timeout"
                          ? "Time out"
                      : "Game Over"}
              </span>
            ) : stockfish.thinking ? (
              <span className="text-blue-400">AI thinking...</span>
            ) : (
              <span>
                {gameState.game.turn() === "w" ? "White" : "Black"} to move
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Game Info & Controls */}
      <div className="w-full max-w-[300px] space-y-4">
        {/* Game Controls */}
        <div className="bg-[#262421] rounded-lg p-4 border border-white/5">
          <h3 className="text-lg font-semibold mb-3">Game Controls</h3>
          <div className="space-y-2">
            <button
              onClick={handleNewGame}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white transition-colors"
            >
              New Game
            </button>
            <button
              onClick={() => dispatch(undoLastTurn())}
              disabled={gameState.history.length === 0 || gameState.isGameOver}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:hover:bg-gray-700 rounded text-white transition-colors"
            >
              Undo
            </button>
            <button
              onClick={handleHint}
              disabled={!isHumanTurn || !stockfish.ready}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 rounded text-white transition-colors"
            >
              Hint
            </button>
            <button
              onClick={() => dispatch(resignGame())}
              disabled={gameState.isGameOver || gameState.history.length === 0}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 rounded text-white transition-colors"
            >
              Resign
            </button>
          </div>
          {gameState.hint && (
            <div className="mt-3 rounded bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
              Hint: {gameState.hint.san} ({gameState.hint.from} → {gameState.hint.to})
            </div>
          )}
        </div>

        <div className="bg-[#262421] rounded-lg p-4 border border-white/5">
          <h3 className="text-lg font-semibold mb-3">Options</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Time Control
              </label>
              <select
                value={currentTimeKey}
                onChange={(e) => dispatch(setTimeControl(e.target.value))}
                className="w-full rounded bg-[#1d1b19] border border-white/10 px-3 py-2 text-sm text-white"
              >
                <option value="none">No timer</option>
                <option value="bullet">Bullet · 1+0</option>
                <option value="blitz">Blitz · 5+0</option>
                <option value="rapid">Rapid · 10+0</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Play As
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => dispatch(setAiColor("b"))}
                  className={`rounded px-3 py-2 text-sm transition-colors ${
                    gameState.aiColor === "b"
                      ? "bg-[#c9a45c] text-[#1d1b19]"
                      : "bg-gray-700 text-white hover:bg-gray-600"
                  }`}
                >
                  White
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(setAiColor("w"))}
                  className={`rounded px-3 py-2 text-sm transition-colors ${
                    gameState.aiColor === "w"
                      ? "bg-[#c9a45c] text-[#1d1b19]"
                      : "bg-gray-700 text-white hover:bg-gray-600"
                  }`}
                >
                  Black
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Move History */}
        {settings.showMoveHistory && (
          <div className="bg-[#262421] rounded-lg border border-white/5">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-gray-200">Moves</h3>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              <MoveHistory
                movePairs={movePairs}
                currentMove={gameState.currentMove}
                pieceNotation={settings.pieceNotation}
              />
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <ChessSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
