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
    <div
      className="min-h-screen flex flex-col items-center justify-center p-5"
      style={{
        background:
          "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        fontFamily: "'Crimson Text', Georgia, serif",
        color: "#e8dcc8",
      }}
    >
      {/* Back Button */}
      <div className="w-full max-w-6xl mb-4">
        <GoldButton onClick={onBack} className="text-sm">
          ← Back to Menu
        </GoldButton>
      </div>

      {/* Title */}
      <h1
        className="font-black tracking-widest mb-0"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(1.8rem,4vw,3rem)",
          background: "linear-gradient(90deg,#f5d78e,#c8943a,#f5d78e)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        CHESS
      </h1>
      <p className="text-xs tracking-widest opacity-40 mb-5">ROYAL GAME</p>

      {/* Main 3-column layout */}
      <div className="flex gap-4 items-start flex-wrap justify-center">
        {/* ── LEFT: Settings */}
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

        {/* ── CENTER: Clock + Board + Controls */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Clock */}
          <ChessClock
            clock={g.clock}
            turn={g.turn}
            status={g.status}
            flipped={g.flipped}
          />

          {/* AI thinking */}
          <AIThinkingIndicator
            enabled={g.aiEnabled}
            ready={g.sfReady}
            thinking={g.sfThinking}
          />

          {/* Player Info */}
          <PlayerInfo
            turn={g.turn}
            aiEnabled={g.aiEnabled}
            aiColor={g.aiColor}
            aiDifficulty={g.aiDifficulty}
            status={g.status}
          />

          {/* Status */}
          <StatusBar status={g.status} turn={g.turn} />

          {/* Board */}
          <Board
            board={g.board}
            flipped={g.flipped}
            isSelected={g.isSelected}
            isLegalDest={g.isLegalDest}
            isLastMove={g.isLastMove}
            onSquareClick={g.handleSquareClick}
          />

          {/* Controls */}
          <div className="flex gap-2 mt-4 flex-wrap justify-center">
            <GoldButton onClick={g.resetGame}>New Game</GoldButton>
            <GoldButton onClick={g.toggleFlip}>Flip Board</GoldButton>
            <GoldButton onClick={g.handleExportPGN}>Export PGN</GoldButton>
            <GoldButton onClick={() => window.location.reload()}>
              Back to Player Mode
            </GoldButton>
          </div>

          {/* Game-over banner */}
          {isOver && (
            <div
              className="mt-4 px-6 py-3 rounded-xl text-center"
              style={{
                background: "rgba(200,148,58,0.15)",
                border: "1px solid rgba(200,148,58,0.4)",
                maxWidth: "min(480px,90vw)",
                width: "100%",
              }}
            >
              <p
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: "1.1rem",
                  color: "#f5d78e",
                }}
              >
                {g.status === "checkmate"
                  ? `♛ ${g.turn === "w" ? "Black" : "White"} wins by checkmate!`
                  : "½ Stalemate — draw!"}
              </p>
              <p className="text-xs opacity-50 mt-1">
                Export the game or start a new one
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Captured + History */}
        <div
          className="flex flex-col gap-3"
          style={{ minWidth: 155, maxWidth: 175 }}
        >
          <Panel title="Captured by White">
            <CapturedPieces pieces={g.capturedB} label="" />
          </Panel>

          <Panel title="Captured by Black">
            <CapturedPieces pieces={g.capturedW} label="" />
          </Panel>

          <Panel title="Move History">
            <MoveHistory history={g.history} />
          </Panel>

          {/* Legend */}
          <Panel title="Legend">
            <div className="text-xs leading-loose opacity-65">
              <div>🟡 Last move</div>
              <div>🟢 Selected</div>
              <div>⚫ Legal move</div>
              <div>🔴 Check / Mate</div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Promotion modal */}
      {g.promotion && (
        <PromotionModal turn={g.turn} onSelect={g.handlePromotion} />
      )}
    </div>
  );
}
