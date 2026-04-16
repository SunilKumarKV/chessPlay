import { useChessGame } from "../hooks/useChessGame";
import Board from "./Board";
import StatusBar from "./StatusBar";
import PromotionModal from "./PromotionModal";
import MoveHistory from "./MoveHistory";
import CapturedPieces from "./CapturedPieces";
import Panel from "./Panel";
import GoldButton from "./GoldButton";
import ChessClock from "./ChessClock";
import AIThinkingIndicator from "./AIThinkingIndicator";
import SettingsPanel from "./SettingsPanel";
import PlayerInfo from "./PlayerInfo";

export default function Chess({ onBack, initialAiEnabled = false }) {
  const g = useChessGame({ initialAiEnabled });

  const isOver = g.status === "checkmate" || g.status === "stalemate";

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-xl font-semibold text-blue-400">Play vs AI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">
              {g.aiEnabled ? `vs Stockfish Lv${g.aiDifficulty}` : 'Analysis Mode'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Game Status Bar */}
        <div className="mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  g.turn === 'w' ? 'bg-white text-black' : 'bg-gray-600 text-white'
                }`}>
                  {g.turn === 'w' ? 'White to move' : 'Black to move'}
                </div>
                <div className="text-sm text-gray-400">
                  {g.status === 'checkmate' && `Checkmate! ${g.turn === 'w' ? 'Black' : 'White'} wins`}
                  {g.status === 'stalemate' && 'Stalemate - Draw'}
                  {g.status === 'check' && 'Check!'}
                  {g.status === 'normal' && 'Game in progress'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={g.resetGame}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  New Game
                </button>
                <button
                  onClick={g.toggleFlip}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Flip Board
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Game Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Settings */}
          <div className="lg:w-80">
            <SettingsPanel
              aiEnabled={g.aiEnabled}
              setAiEnabled={g.setAiEnabled}
              aiColor={g.aiColor}
              setAiColor={g.setAiColor}
              aiDifficulty={g.aiDifficulty}
              setAiDifficulty={g.setAiDifficulty}
              soundEnabled={g.soundEnabled}
              setSoundEnabled={g.setSoundEnabled}
              timeControlIdx={g.timeControlIdx}
              setTimeControlIdx={g.setTimeControlIdx}
              onReset={g.resetGame}
            />
          </div>

          {/* Center - Board and Clock */}
          <div className="flex-1 flex flex-col items-center">
            {/* Clock */}
            <div className="mb-4">
              <ChessClock
                clock={g.clock}
                turn={g.turn}
                status={g.status}
                flipped={g.flipped}
              />
            </div>

            {/* AI Thinking Indicator */}
            <div className="mb-4">
              <AIThinkingIndicator
                enabled={g.aiEnabled}
                ready={g.sfReady}
                thinking={g.sfThinking}
              />
            </div>

            {/* Player Info */}
            <div className="mb-4">
              <PlayerInfo
                turn={g.turn}
                aiEnabled={g.aiEnabled}
                aiColor={g.aiColor}
                aiDifficulty={g.aiDifficulty}
                status={g.status}
              />
            </div>

            {/* Board */}
            <div className="mb-4">
              <Board
                board={g.board}
                flipped={g.flipped}
                isSelected={g.isSelected}
                isLegalDest={g.isLegalDest}
                isLastMove={g.isLastMove}
                onSquareClick={g.handleSquareClick}
              />
            </div>

            {/* Game Over Banner */}
            {isOver && (
              <div className="mb-4 max-w-md">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
                  <div className="text-lg font-semibold mb-2 text-blue-400">
                    {g.status === "checkmate"
                      ? `♛ ${g.turn === "w" ? "Black" : "White"} wins by checkmate!`
                      : "½ Stalemate — draw!"}
                  </div>
                  <div className="text-sm text-gray-400 mb-4">
                    Export the game or start a new one
                  </div>
                  <button
                    onClick={g.handleExportPGN}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Export PGN
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Captured Pieces and History */}
          <div className="lg:w-80 space-y-6">
            {/* Captured Pieces */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">Captured by White</h3>
              <CapturedPieces pieces={g.capturedB} label="" />
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">Captured by Black</h3>
              <CapturedPieces pieces={g.capturedW} label="" />
            </div>

            {/* Move History */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">Move History</h3>
              <MoveHistory history={g.history} />
            </div>

            {/* Legend */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">Legend</h3>
              <div className="text-sm text-gray-400 space-y-1">
                <div>🟡 Last move</div>
                <div>🟢 Selected square</div>
                <div>⚫ Legal move</div>
                <div>🔴 Check / Checkmate</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Promotion Modal */}
      {g.promotion && (
        <PromotionModal turn={g.turn} onSelect={g.handlePromotion} />
      )}
    </div>
  );
}
