import { useState } from "react";
import { useChessGame } from "../hooks/useChessGame";
import { useSettings } from "../../../hooks/useSettings";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import Board from "./Board";
import AIThinkingIndicator from "./AIThinkingIndicator";
import SettingsPanel from "./SettingsPanel";
import { ClockBar } from "./MobileGameDrawer";
import ErrorBoundary from "../../../components/ErrorBoundary";
import MaterialBalanceBar from "./MaterialBalanceBar";
import MoveListPanel from "./MoveListPanel";
import PlayerClockPlate from "./PlayerClockPlate";
import {
  DRAW_STATUSES,
  formatClockTime,
  getCapturedMaterialBalance,
  getGameOverMessage,
  pairMoveHistory,
  sortCapturedPieces,
} from "../utils/gamePresentation";

const TIME_CONTROL_INDEX_BY_LABEL = {
  "1+0": 0,
  "2+1": 1,
  "3+0": 2,
  "5+3": 3,
  "10+0": 4,
  "10+5": 5,
  "30+0": 6,
};

export default function GameScreen({
  onBack,
  initialAiEnabled = false,
  timeControl = "3+0",
}) {
  const settings = useSettings();
  const { user } = useCurrentUser();
  const currentUsername = user?.username || "You";
  const currentRating = user?.rating;

  const timeControlIdx =
    settings.getSetting("game", "defaultTimeControl") ||
    TIME_CONTROL_INDEX_BY_LABEL[timeControl] ||
    2;

  const chessGame = useChessGame({
    initialAiEnabled,
    initialTimeControlIdx: timeControlIdx,
    initialAiDifficulty: settings.getSetting("game", "aiDifficulty"),
    initialSoundEnabled: settings.getSetting("game", "soundEnabled"),
  });

  const [showSettings, setShowSettings] = useState(false);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);

  const isOver =
    chessGame.status === "checkmate" || DRAW_STATUSES.has(chessGame.status);
  const isAnalysisMode = !chessGame.aiEnabled && chessGame.history.length > 0;
  const materialAdvantage = getCapturedMaterialBalance(
    chessGame.capturedW,
    chessGame.capturedB,
  );

  const getPlayerInfo = (color) => {
    if (chessGame.aiEnabled) {
      if (color === chessGame.aiColor) {
        return {
          name: `Stockfish Lv${chessGame.aiDifficulty}`,
          rating: null,
          avatar: "🤖",
          isAI: true,
        };
      } else {
        return {
          name: currentUsername,
          rating: currentRating,
          avatar: "👤",
          isAI: false,
        };
      }
    } else {
      return {
        name: color === "w" ? currentUsername : "Black",
        rating: color === "w" ? currentRating : null,
        avatar: color === "w" ? "👤" : "👤",
        isAI: false,
      };
    }
  };

  const topPlayerColor = chessGame.flipped ? "b" : "w";
  const bottomPlayerColor = chessGame.flipped ? "w" : "b";
  const topPlayer = getPlayerInfo(topPlayerColor);
  const bottomPlayer = getPlayerInfo(bottomPlayerColor);
  const topCapturedPieces = sortCapturedPieces(
    chessGame.flipped ? chessGame.capturedW : chessGame.capturedB,
  );
  const bottomCapturedPieces = sortCapturedPieces(
    chessGame.flipped ? chessGame.capturedB : chessGame.capturedW,
  );
  const topMaterialBonus =
    (chessGame.flipped && materialAdvantage > 0) ||
    (!chessGame.flipped && materialAdvantage < 0)
      ? Math.abs(materialAdvantage)
      : 0;
  const bottomMaterialBonus =
    (!chessGame.flipped && materialAdvantage > 0) ||
    (chessGame.flipped && materialAdvantage < 0)
      ? Math.abs(materialAdvantage)
      : 0;
  const moves = pairMoveHistory(chessGame.history);

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-[#e0e0e0] font-['Inter'] flex flex-col">
      <div className="md:hidden">
        <ClockBar
          whiteTime={formatClockTime(chessGame.clock?.times?.w)}
          blackTime={formatClockTime(chessGame.clock?.times?.b)}
          whiteName={bottomPlayer.name}
          blackName={topPlayer.name}
          isWhiteTurn={chessGame.turn === "w"}
        />
      </div>

      <header className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-[#7a7a7a] hover:text-[#e0e0e0] transition-colors text-sm md:text-base"
          >
            <span>←</span>
            <span className="font-['Inter']">Back to Dashboard</span>
          </button>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-[#7a7a7a] font-['Inter']">
              {chessGame.aiEnabled ? `vs ${topPlayer.name}` : "Analysis Mode"}
            </div>
            <div
              className={`w-3 h-3 rounded-full ${chessGame.turn === "w" ? "bg-white" : "bg-gray-600"}`}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center p-4 md:p-6 gap-6 max-w-7xl mx-auto">
        <div className="flex items-stretch justify-center w-full max-w-[800px]">
          <MaterialBalanceBar materialAdvantage={materialAdvantage} />

          <div className="flex flex-col w-full max-w-[650px] z-10">
            <PlayerClockPlate
              player={topPlayer}
              capturedPieces={topCapturedPieces}
              materialBonus={topMaterialBonus}
              timeLabel={formatClockTime(chessGame.clock?.times?.[topPlayerColor])}
              isClockActive={chessGame.turn === topPlayerColor}
            />

            <div className="relative my-1">
              <ErrorBoundary>
                <Board
                  board={chessGame.board}
                  flipped={chessGame.flipped}
                  isSelected={chessGame.isSelected}
                  isLegalDest={
                    settings.getSetting("game", "showLegalMoves")
                      ? chessGame.isLegalDest
                      : () => false
                  }
                  isLastMove={
                    settings.getSetting("game", "showLastMove")
                      ? chessGame.isLastMove
                      : () => false
                  }
                  isInCheck={
                    chessGame.status === "check" &&
                    chessGame.turn === (chessGame.flipped ? "b" : "w")
                  }
                  onSquareClick={chessGame.handleSquareClick}
                  promotion={chessGame.promotion}
                  handlePromotion={chessGame.handlePromotion}
                />
              </ErrorBoundary>

              {chessGame.aiEnabled && (
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                  <AIThinkingIndicator
                    enabled={chessGame.aiEnabled}
                    ready={chessGame.sfReady}
                    thinking={chessGame.sfThinking}
                  />
                </div>
              )}
            </div>

            <PlayerClockPlate
              player={bottomPlayer}
              capturedPieces={bottomCapturedPieces}
              materialBonus={bottomMaterialBonus}
              timeLabel={formatClockTime(
                chessGame.clock?.times?.[bottomPlayerColor],
              )}
              isClockActive={chessGame.turn === bottomPlayerColor}
            />
          </div>
        </div>

        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden flex flex-col h-full max-h-[500px]">
            <div className="p-4 border-b border-[#2a2a2a]">
              <h3 className="font-bold text-[#e0e0e0] font-['Montserrat']">
                Moves
              </h3>
            </div>
            <MoveListPanel moves={moves} emptyMessage="Moves will appear here." />
          </div>

          {chessGame.currentOpening && (
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
              <div className="text-[#7a7a7a] text-xs uppercase tracking-wide font-['Inter'] mb-1">
                Opening
              </div>
              <div className="text-[#e0e0e0] text-sm font-semibold font-['Montserrat']">
                {chessGame.currentOpening.name}
              </div>
            </div>
          )}

          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a] space-y-3">
            {chessGame.drawPending && (
              <div className="space-y-3 bg-[#1f3b2a] border border-[#81b64c]/20 p-3 rounded">
                <div className="text-[#81b64c] text-sm font-semibold">
                  Draw offer pending
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={chessGame.acceptDraw}
                    className="flex-1 py-2 bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] rounded-lg text-sm font-semibold transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={chessGame.declineDraw}
                    className="flex-1 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg text-sm transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={chessGame.confirmReset}
              className="w-full py-2 px-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg transition-colors font-['Inter']"
            >
              New Game
            </button>

            {chessGame.aiEnabled && (
              <>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full py-2 px-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg transition-colors font-['Inter']"
                >
                  Settings
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={chessGame.resignGame}
                    className="flex-1 py-2 px-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg transition-colors text-sm font-['Inter']"
                  >
                    Resign
                  </button>
                  <button
                    onClick={chessGame.drawGame}
                    className="flex-1 py-2 px-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg transition-colors text-sm font-['Inter']"
                  >
                    Draw
                  </button>
                  <button
                    onClick={() => chessGame.setAiEnabled(false)}
                    className="flex-1 py-2 px-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg transition-colors text-sm font-['Inter']"
                  >
                    Analyze
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] p-4 md:hidden">
        <div className="flex items-center justify-center space-x-6">
          <button
            onClick={() =>
              setCurrentMoveIndex(Math.max(-1, currentMoveIndex - 1))
            }
            disabled={!isAnalysisMode || currentMoveIndex <= -1}
            className="p-2 text-[#7a7a7a] hover:text-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>

          <button
            onClick={chessGame.toggleFlip}
            className="p-2 text-[#7a7a7a] hover:text-[#e0e0e0]"
          >
            🔄
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-[#7a7a7a] hover:text-[#e0e0e0]"
          >
            ⚙️
          </button>

          <button
            onClick={() =>
              setCurrentMoveIndex(
                Math.min(chessGame.history.length - 1, currentMoveIndex + 1),
              )
            }
            disabled={
              !isAnalysisMode ||
              currentMoveIndex >= chessGame.history.length - 1
            }
            className="p-2 text-[#7a7a7a] hover:text-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </div>

      {isOver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg p-8 border border-[#2a2a2a] max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">
                {chessGame.status === "checkmate" ? "♛" : "½"}
              </div>
              <h2 className="text-2xl font-bold text-[#e0e0e0] mb-4 font-['Montserrat']">
                {getGameOverMessage(chessGame.status, chessGame.turn)}
              </h2>
              <div className="flex space-x-3">
                <button
                  onClick={chessGame.confirmReset}
                  className="flex-1 py-3 px-4 bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] font-bold rounded-lg transition-colors font-['Montserrat']"
                >
                  New Game
                </button>
                <button
                  onClick={chessGame.handleExportPGN}
                  className="flex-1 py-3 px-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg transition-colors font-['Inter']"
                >
                  Export PGN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="max-w-md w-full mx-4">
            <SettingsPanel
              onClose={() => setShowSettings(false)}
              aiEnabled={chessGame.aiEnabled}
              setAiEnabled={chessGame.setAiEnabled}
              aiColor={chessGame.aiColor}
              setAiColor={chessGame.setAiColor}
              aiDifficulty={chessGame.aiDifficulty}
              setAiDifficulty={chessGame.setAiDifficulty}
              soundEnabled={chessGame.soundEnabled}
              setSoundEnabled={chessGame.setSoundEnabled}
              timeControlIdx={chessGame.timeControlIdx}
              setTimeControlIdx={chessGame.setTimeControlIdx}
              onReset={chessGame.confirmReset}
            />
          </div>
        </div>
      )}
    </div>
  );
}
