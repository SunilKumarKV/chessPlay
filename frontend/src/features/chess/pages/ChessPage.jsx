import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import {
  resetGame,
  setAiEnabled,
  setAiColor,
  setAiDifficulty,
  setFlipped,
  setTimeControl,
  startGame,
} from "../../../store/slices/chessGameSlice";
import Board from "../components/Board";
import ChessClock from "../components/ChessClock";
import PlayerInfo from "../components/PlayerInfo";
import MoveHistory from "../components/MoveHistory";
import SettingsPanel from "../components/SettingsPanel";
import ChessSettingsModal from "../../../components/ChessSettingsModal";
import EvaluationBar from "../../../components/EvaluationBar";
import { useStockfish } from "../../../hooks/useStockfish";
import { soundManager } from "../../../utils/sounds/soundManager";
import { loadSettings } from "../../../utils/settingsPersistence";

export default function Chess() {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.chessGame);
  const settings = useAppSelector((state) => state.chessSettings);

  const [activeTab, setActiveTab] = useState("moves");
  const [showSettings, setShowSettings] = useState(false);

  // Initialize Stockfish
  const stockfish = useStockfish({
    enabled: gameState.aiEnabled,
    onMove: (bestMove) => {
      if (
        bestMove &&
        gameState.aiEnabled &&
        gameState.game.turn() === gameState.aiColor
      ) {
        try {
          const move = gameState.game.move(bestMove);
          if (move) {
            dispatch(
              makeMove({
                from: move.from,
                to: move.to,
                promotion: move.promotion,
              }),
            );

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
      }
    },
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

  // Handle AI moves
  useEffect(() => {
    if (
      gameState.aiEnabled &&
      gameState.game.turn() === gameState.aiColor &&
      !gameState.isGameOver &&
      !gameState.aiThinking
    ) {
      // Get best move from Stockfish
      stockfish.getBestMove(gameState.fen, gameState.aiDifficulty);
    }
  }, [
    gameState.fen,
    gameState.aiEnabled,
    gameState.aiColor,
    gameState.isGameOver,
    gameState.aiDifficulty,
    stockfish,
  ]);

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

  const handleSettingsChange = (newSettings) => {
    // Update game settings that affect gameplay
    if (newSettings.aiEnabled !== undefined) {
      dispatch(setAiEnabled(newSettings.aiEnabled));
    }
    if (newSettings.aiColor !== undefined) {
      dispatch(setAiColor(newSettings.aiColor));
    }
    if (newSettings.aiDifficulty !== undefined) {
      dispatch(setAiDifficulty(newSettings.aiDifficulty));
    }
    if (newSettings.flipped !== undefined) {
      dispatch(setFlipped(newSettings.flipped));
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
                evaluation={stockfish.evaluation}
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
                      : "Game Over"}
              </span>
            ) : gameState.aiThinking ? (
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
              onClick={() => dispatch(resetGame())}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Move History */}
        <div className="bg-[#262421] rounded-lg border border-white/5">
          <div className="p-4 border-b border-white/5">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("moves")}
                className={`px-3 py-1 rounded text-sm ${
                  activeTab === "moves"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Moves
              </button>
              <button
                onClick={() => setActiveTab("analysis")}
                className={`px-3 py-1 rounded text-sm ${
                  activeTab === "analysis"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Analysis
              </button>
            </div>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            {activeTab === "moves" ? (
              <MoveHistory
                movePairs={movePairs}
                currentMove={gameState.currentMove}
                pieceNotation={settings.pieceNotation}
              />
            ) : (
              <div className="text-sm text-gray-400">
                Analysis features coming soon...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <ChessSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
