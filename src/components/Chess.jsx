import { useChessGame } from "../hooks/useChessGame";
import Panel from "./Panel";
import CapturedPieces from "./CapturedPieces";
import MoveHistory from "./MoveHistory";

export default function Chess() {
  const { capturedB, capturedW, history } = useChessGame();
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
      </div>
    </div>
  );
}
