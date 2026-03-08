import { useChessGame } from "../hooks/useChessGame";
import Board from "./Board";
import StatusBar from "./StatusBar";
import PromotionModal from "./PromotionModal";
import MoveHistory from "./MoveHistory";
import CapturedPieces from "./CapturedPieces";
import Panel from "./Panel";
import GoldButton from "./GoldButton";

export default function Chess() {
  const {
    board,
    turn,
    status,
    capturedB,
    capturedW,
    history,
    promotion,
    flipped,
    isSelected,
    isLegalDest,
    isLastMove,
    handleSquareClick,
    resetGame,
    toggleFlip,
  } = useChessGame();
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
      {/* __ Title  */}
      <h1
        className="text-5xl font-black tracking-widest mb-0"
        style={{
          fontFamily: "'Playfair Display', serif",
          background: "linear-gradient(90deg,#f5d78e, #c8943a, #f5d78e)",
          webkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        CHESS
      </h1>
      <p className="text-xs tracking-widest opacity-50 mb-5">GAME Play</p>

      <div className="flex gap-5 item-start flex-wrap justify-center">
        {/* __ LEFT PANEL  */}
        <div
          className="flex flex-col gap-3"
          style={{ minWidth: 140, maxWidth: 160 }}
        >
          <Panel title="White captured">
            <CapturedPieces pieces={capturedB} label="" />
          </Panel>
          <Panel title="Black captured">
            <CapturedPieces pieces={capturedW} label="" />
          </Panel>
          <Panel title="Move history">
            <MoveHistory history={history} />
          </Panel>
        </div>

        {/* __ BOARD COLUMN  */}
        <div>
          <StatusBar status={status} turn={turn} />

          <Board
            board={board}
            flipped={flipped}
            isSelected={isSelected}
            isLegalDest={isLegalDest}
            isLastMove={isLastMove}
            onSquareClick={handleSquareClick}
          />

          {/* Controls */}
          <div className="flex gap-3 mt-4 justify-center">
            <GoldButton onClick={resetGame}>New Game</GoldButton>
            <GoldButton onClick={toggleFlip}>Flip Board</GoldButton>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div
          className="flex flex-col gap-3"
          style={{ minWidth: 140, maxWidth: 160 }}
        >
          <Panel title="Turn">
            <div className="flex gap-3 items-center justify-center py-2">
              <div
                className="rounded-full transition-all duration-300"
                style={{
                  width: 28,
                  height: 28,
                  background: turn === "w" ? "#f0d9b5" : "#2a2a2a",
                  border: `3px solid ${turn === "w" ? "#c8943a" : "#7a8bb5"}`,
                  boxShadow: `0 0 10px ${turn === "w" ? "rgba(200,148,58,0.5)" : "rgba(122,139,181,0.5)"}`,
                }}
              />
              <span className="text-sm">
                {turn === "w" ? "White" : "Black"}
              </span>
            </div>
          </Panel>

          <Panel title="Legend">
            <div className="text-xs leading-loose opacity-70">
              <div>🟡 Last move</div>
              <div>🟢 Selected</div>
              <div>⚫ Legal move</div>
              <div>🔴 Check / Mate</div>
            </div>
          </Panel>

          <Panel title="Features">
            <div className="text-xs leading-loose opacity-65">
              <div>✓ Castling</div>
              <div>✓ En passant</div>
              <div>✓ Promotion</div>
              <div>✓ Check detect</div>
              <div>✓ Stalemate</div>
              <div>✓ Move history</div>
            </div>
          </Panel>
        </div>
      </div>

      {promotion && <PromotionModal turn={turn} onSelect={handlePromotion} />}
    </div>
  );
}
