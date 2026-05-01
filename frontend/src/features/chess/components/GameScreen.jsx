import { useState } from "react";
import { useChessGame } from "../hooks/useChessGame";
import { useSettings } from "../../hooks/useSettings";
import Board from "./Board";
import AIThinkingIndicator from "./AIThinkingIndicator";
import SettingsPanel from "./SettingsPanel";
import { MobileGameDrawer, ClockBar } from "./MobileGameDrawer";

// High-quality SVG URLs for authentic Chess.com / Lichess feel
const PIECE_IMAGES = {
  wP: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wP.svg",
  wN: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wN.svg",
  wB: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wB.svg",
  wR: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wR.svg",
  wQ: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wQ.svg",
  wK: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wK.svg",
  bP: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bP.svg",
  bN: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bN.svg",
  bB: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bB.svg",
  bR: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bR.svg",
  bQ: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bQ.svg",
  bK: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bK.svg",
};

export default function GameScreen({
  onBack,
  initialAiEnabled = false,
  timeControl = "3+0",
}) {
  const settings = useSettings();

  // Map time control string to index
  const timeControlMap = {
    "1+0": 0, // Bullet
    "2+1": 1, // Bullet
    "3+0": 2, // Blitz
    "5+3": 3, // Blitz
    "10+0": 4, // Rapid
    "10+5": 5, // Rapid
    "30+0": 6, // Classical
  };

  const timeControlIdx =
    settings.getSetting("game", "defaultTimeControl") ||
    timeControlMap[timeControl] ||
    2;

  const g = useChessGame({
    initialAiEnabled,
    initialTimeControlIdx: timeControlIdx,
    initialAiDifficulty: settings.getSetting("game", "aiDifficulty"),
    initialSoundEnabled: settings.getSetting("game", "soundEnabled"),
  });

  const [showSettings, setShowSettings] = useState(false);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [showMoveDrawer, setShowMoveDrawer] = useState(false);

  const isOver = g.status === "checkmate" || g.status === "stalemate";
  const isAnalysisMode = !g.aiEnabled && g.history.length > 0;

  // Calculate material advantage
  const calculateMaterialAdvantage = () => {
    const pieceValues = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
    let whiteCapturedValue = 0;
    let blackCapturedValue = 0;

    g.capturedW.forEach((piece) => {
      whiteCapturedValue += pieceValues[piece[1].toUpperCase()] || 0;
    });

    g.capturedB.forEach((piece) => {
      blackCapturedValue += pieceValues[piece[1].toUpperCase()] || 0;
    });

    return whiteCapturedValue - blackCapturedValue;
  };

  const materialAdvantage = calculateMaterialAdvantage();

  // Get player info
  const getPlayerInfo = (color) => {
    if (g.aiEnabled) {
      if (color === g.aiColor) {
        return {
          name: `Stockfish Lv${g.aiDifficulty}`,
          rating: null,
          avatar: "🤖",
          isAI: true,
        };
      } else {
        return {
          name: "You",
          rating: 1200, // This should come from user state
          avatar: "👤",
          isAI: false,
        };
      }
    } else {
      // Multiplayer - this would need to be updated for real multiplayer
      return {
        name: color === "w" ? "White" : "Black",
        rating: 1200,
        avatar: color === "w" ? "👤" : "👤",
        isAI: false,
      };
    }
  };

  const topPlayer = getPlayerInfo(g.flipped ? "b" : "w");
  const bottomPlayer = getPlayerInfo(g.flipped ? "w" : "b");

  // Get captured pieces for display
  const getCapturedPieces = (isWhitePlayer) => {
    const captured = isWhitePlayer ? g.capturedW : g.capturedB;
    return [...captured].sort(
      (a, b) =>
        "PNBRQK".indexOf(b[1].toUpperCase()) -
        "PNBRQK".indexOf(a[1].toUpperCase()),
    );
  };

  const formatTime = (time) => {
    if (time === null || time === undefined) return "∞";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Format moves for display
  const formatMoves = () => {
    const moves = [];
    for (let i = 0; i < g.history.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = g.history[i]?.san || g.history[i]?.text || "-";
      const blackMove = g.history[i + 1]?.san || g.history[i + 1]?.text || "";

      moves.push({
        number: moveNumber,
        white: whiteMove,
        black: blackMove,
        isLatest: i + 1 >= g.history.length - 1,
      });
    }
    return moves;
  };

  const moves = formatMoves();

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-[#e0e0e0] font-['Inter'] flex flex-col">
      {/* Mobile Clock Bar (top on mobile) */}
      <div className="md:hidden">
        <ClockBar
          whiteTime={
            g.clock?.w
              ? `${Math.floor(g.clock.w / 60)}:${String(g.clock.w % 60).padStart(2, "0")}`
              : "∞"
          }
          blackTime={
            g.clock?.b
              ? `${Math.floor(g.clock.b / 60)}:${String(g.clock.b % 60).padStart(2, "0")}`
              : "∞"
          }
          whiteName={bottomPlayer.name}
          blackName={topPlayer.name}
          isWhiteTurn={g.turn === "w"}
        />
      </div>

      {/* Header */}
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
              {g.aiEnabled ? `vs ${topPlayer.name}` : "Analysis Mode"}
            </div>
            <div
              className={`w-3 h-3 rounded-full ${g.turn === "w" ? "bg-white" : "bg-gray-600"}`}
            ></div>
          </div>
        </div>
      </header>

      {/* Main Game Layout */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center p-4 md:p-6 gap-6 max-w-7xl mx-auto">
        {/* Center - Eval Bar & Board */}
        <div className="flex items-stretch justify-center w-full max-w-[800px]">
          {/* Evaluation Bar */}
          <div className="hidden md:flex w-8 flex-shrink-0 bg-[#ffffff] rounded-l-md overflow-hidden relative flex-col border-y-4 border-l-4 border-[#282828] my-[52px] mr-[-4px] z-0">
            <div
              className="w-full bg-[#404040] transition-all duration-500 ease-in-out"
              style={{
                height: `${Math.max(5, Math.min(95, 50 - materialAdvantage * 5))}%`,
              }}
            ></div>
            <span
              className={`absolute left-0 right-0 text-center text-[10px] font-bold ${
                materialAdvantage >= 0
                  ? "bottom-1 text-[#404040]"
                  : "top-1 text-[#ffffff]"
              }`}
            >
              {materialAdvantage === 0
                ? "0.0"
                : materialAdvantage > 0
                  ? `+${materialAdvantage}`
                  : materialAdvantage}
            </span>
          </div>

          {/* Board & Plates Column */}
          <div className="flex flex-col w-full max-w-[650px] z-10">
            {/* Top Player Plate */}
            <div className="flex justify-between items-center py-2 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2a2a2a] rounded-sm flex items-center justify-center text-xl shadow-sm">
                  {topPlayer.avatar}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 leading-tight">
                    <span className="font-bold text-[#e0e0e0] text-sm">
                      {topPlayer.name}
                    </span>
                    {topPlayer.rating && (
                      <span className="text-[#7a7a7a] text-xs">
                        ({topPlayer.rating})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center h-4 mt-0.5">
                    {getCapturedPieces(g.flipped).map((p, i) => (
                      <img
                        key={i}
                        src={PIECE_IMAGES[p]}
                        className="w-4 h-4 -ml-1.5 first:ml-0 drop-shadow-sm"
                        alt={p}
                      />
                    ))}
                    {((g.flipped && materialAdvantage > 0) ||
                      (!g.flipped && materialAdvantage < 0)) && (
                      <span className="text-[#7a7a7a] text-xs ml-1 font-semibold">
                        +{Math.abs(materialAdvantage)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div
                className={`px-3 py-1 font-mono text-2xl font-bold rounded-sm transition-colors ${
                  g.turn === (g.flipped ? "w" : "b")
                    ? "bg-[#ffffff] text-[#212121]"
                    : "bg-[#2a2a2a] text-[#7a7a7a]"
                }`}
              >
                {formatTime(g.clock?.[g.flipped ? "w" : "b"])}
              </div>
            </div>

            {/* Board */}
            <div className="relative my-1">
              <Board
                board={g.board}
                flipped={g.flipped}
                isSelected={g.isSelected}
                isLegalDest={
                  settings.getSetting("game", "showLegalMoves")
                    ? g.isLegalDest
                    : () => false
                }
                isLastMove={
                  settings.getSetting("game", "showLastMove")
                    ? g.isLastMove
                    : () => false
                }
                isInCheck={
                  g.status === "check" && g.turn === (g.flipped ? "b" : "w")
                }
                onSquareClick={g.handleSquareClick}
                promotion={g.promotion}
                handlePromotion={g.handlePromotion}
              />

              {/* AI Thinking Indicator */}
              {g.aiEnabled && (
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                  <AIThinkingIndicator
                    enabled={g.aiEnabled}
                    ready={g.sfReady}
                    thinking={g.sfThinking}
                  />
                </div>
              )}
            </div>

            {/* Bottom Player Plate */}
            <div className="flex justify-between items-center py-2 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2a2a2a] rounded-sm flex items-center justify-center text-xl shadow-sm">
                  {bottomPlayer.avatar}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 leading-tight">
                    <span className="font-bold text-[#e0e0e0] text-sm">
                      {bottomPlayer.name}
                    </span>
                    {bottomPlayer.rating && (
                      <span className="text-[#7a7a7a] text-xs">
                        ({bottomPlayer.rating})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center h-4 mt-0.5">
                    {getCapturedPieces(!g.flipped).map((p, i) => (
                      <img
                        key={i}
                        src={PIECE_IMAGES[p]}
                        className="w-4 h-4 -ml-1.5 first:ml-0 drop-shadow-sm"
                        alt={p}
                      />
                    ))}
                    {((!g.flipped && materialAdvantage > 0) ||
                      (g.flipped && materialAdvantage < 0)) && (
                      <span className="text-[#7a7a7a] text-xs ml-1 font-semibold">
                        +{Math.abs(materialAdvantage)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div
                className={`px-3 py-1 font-mono text-2xl font-bold rounded-sm transition-colors ${
                  g.turn === (!g.flipped ? "w" : "b")
                    ? "bg-[#ffffff] text-[#212121]"
                    : "bg-[#2a2a2a] text-[#7a7a7a]"
                }`}
              >
                {formatTime(g.clock?.[!g.flipped ? "w" : "b"])}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Move History */}
          <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden flex flex-col h-full max-h-[500px]">
            <div className="p-4 border-b border-[#2a2a2a]">
              <h3 className="font-bold text-[#e0e0e0] font-['Montserrat']">
                Moves
              </h3>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto scrollbar-thin">
              <div className="space-y-2 font-['JetBrains Mono'] text-sm">
                {moves.map((move, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-2 rounded ${
                      move.isLatest
                        ? "bg-[#81b64c]/10 border border-[#81b64c]/30"
                        : "hover:bg-[#2a2a2a]"
                    } transition-colors`}
                  >
                    <span className="text-[#7a7a7a] w-6">{move.number}.</span>
                    <span
                      className={`flex-1 ${move.white === "-" ? "text-[#7a7a7a]" : "text-[#e0e0e0]"}`}
                    >
                      {move.white}
                    </span>
                    <span
                      className={`flex-1 ${move.black === "" ? "text-[#7a7a7a]" : "text-[#e0e0e0]"}`}
                    >
                      {move.black}
                    </span>
                  </div>
                ))}
                {moves.length === 0 && (
                  <div className="text-[#7a7a7a] text-center py-4">
                    No moves yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Game Controls */}
          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a] space-y-3">
            <button
              onClick={g.resetGame}
              className="w-full py-2 px-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg transition-colors font-['Inter']"
            >
              New Game
            </button>

            {g.aiEnabled && (
              <>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full py-2 px-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg transition-colors font-['Inter']"
                >
                  Settings
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={g.resignGame}
                    className="flex-1 py-2 px-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg transition-colors text-sm font-['Inter']"
                  >
                    Resign
                  </button>
                  <button
                    onClick={g.drawGame}
                    className="flex-1 py-2 px-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg transition-colors text-sm font-['Inter']"
                  >
                    Draw
                  </button>
                  <button
                    onClick={() => g.setAiEnabled(false)}
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

      {/* Bottom Toolbar */}
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
            onClick={g.toggleFlip}
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
                Math.min(g.history.length - 1, currentMoveIndex + 1),
              )
            }
            disabled={
              !isAnalysisMode || currentMoveIndex >= g.history.length - 1
            }
            className="p-2 text-[#7a7a7a] hover:text-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </div>

      {/* Game Over Modal */}
      {isOver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg p-8 border border-[#2a2a2a] max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">
                {g.status === "checkmate" ? "♛" : "½"}
              </div>
              <h2 className="text-2xl font-bold text-[#e0e0e0] mb-4 font-['Montserrat']">
                {g.status === "checkmate"
                  ? `${g.turn === "w" ? "Black" : "White"} wins by checkmate!`
                  : "Stalemate - Draw!"}
              </h2>
              <div className="flex space-x-3">
                <button
                  onClick={g.resetGame}
                  className="flex-1 py-3 px-4 bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] font-bold rounded-lg transition-colors font-['Montserrat']"
                >
                  New Game
                </button>
                <button
                  onClick={g.handleExportPGN}
                  className="flex-1 py-3 px-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg transition-colors font-['Inter']"
                >
                  Export PGN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="max-w-md w-full mx-4">
            <SettingsPanel
              onClose={() => setShowSettings(false)}
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
        </div>
      )}
    </div>
  );
}
