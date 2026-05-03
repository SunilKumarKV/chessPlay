import { formatTime } from "../hooks/useChessClock";

// ChessClock
// Shows both player's remaining time. The active clock pulses.
// Flagged (time-out) clock turns red.
// ─────────────────────────────────────────────────────────────

function ClockFace({ color, label, clock, gameOver }) {
  const isActive = clock.active === color && !gameOver;
  const isFlagged = clock.flagged === color;
  const time = clock.times[color];
  const isLow = time !== null && time < 30;

  return (
    <div
      className="flex flex-col items-center rounded-xl px-5 py-3 transition-all duration-300"
      style={{
        background: isFlagged
          ? "rgba(220,50,50,0.25)"
          : isActive
            ? "rgba(200,148,58,0.18)"
            : "rgba(255,255,255,0.05)",
        border: `2px solid ${
          isFlagged ? "#ef4444" : isActive ? "#c8943a" : "rgba(255,255,255,0.1)"
        }`,
        boxShadow: isActive ? "0 0 18px rgba(200,148,58,0.25)" : "none",
        transform: isActive ? "scale(1.03)" : "scale(1)",
        minWidth: 110,
      }}
    >
      <span
        className="text-xs tracking-widest opacity-50 mb-1 uppercase"
        style={{ color: "#e8dcc8", fontFamily: "'Crimson Text',serif" }}
      >
        {label}
      </span>
      <span
        className="font-mono font-bold tabular-nums leading-none"
        style={{
          fontSize: "1.9rem",
          color: isFlagged ? "#ef4444" : isLow ? "#f97316" : "#f5d78e",
          letterSpacing: "-0.02em",
          animation: isActive && isLow ? "pulse 1s infinite" : "none",
        }}
      >
        {formatTime(time)}
      </span>
      {isFlagged && (
        <span className="text-xs mt-1 text-red-400 font-semibold">FLAG!</span>
      )}
    </div>
  );
}

export default function ChessClock({ time, active, gameOver }) {
  if (time === null || time === undefined) return null;

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "∞";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLow = time < 30;
  const isFlagged = time <= 0;

  return (
    <div
      className={`text-sm font-mono px-3 py-1 rounded transition-all duration-300 ${
        isFlagged
          ? "bg-red-600 text-white"
          : active && !gameOver
            ? "bg-blue-600 text-white animate-pulse"
            : isLow
              ? "bg-yellow-600 text-white"
              : "bg-gray-700 text-gray-200"
      }`}
    >
      {formatTime(time)}
    </div>
  );
}
