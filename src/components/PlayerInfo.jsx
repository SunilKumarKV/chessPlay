import React from "react";

export default function PlayerInfo({
  turn,
  aiEnabled,
  aiColor,
  aiDifficulty,
  status,
}) {
  // Determine player names
  const whitePlayer =
    aiEnabled && aiColor === "w" ? `Stockfish Lv${aiDifficulty}` : "Player";

  const blackPlayer =
    aiEnabled && aiColor === "b" ? `Stockfish Lv${aiDifficulty}` : "Player";

  const isWhiteTurn = turn === "w";
  const isBlackTurn = turn === "b";

  const playerStyle = (isActive) => ({
    padding: "8px 16px",
    borderRadius: "8px",
    background: isActive
      ? "rgba(245, 215, 142, 0.15)"
      : "rgba(255, 255, 255, 0.05)",
    border: isActive
      ? "1px solid rgba(245, 215, 142, 0.4)"
      : "1px solid rgba(200, 148, 58, 0.2)",
    color: "#e8dcc8",
    fontFamily: "'Crimson Text', serif",
    fontSize: "0.9rem",
    fontWeight: isActive ? "600" : "400",
    textAlign: "center",
    minWidth: "120px",
    transition: "all 0.3s ease",
    position: "relative",
  });

  const activeIndicatorStyle = {
    position: "absolute",
    top: "-2px",
    right: "-2px",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#f5d78e",
    boxShadow: "0 0 6px rgba(245, 215, 142, 0.6)",
    animation: "playerPulse 2s infinite",
  };

  return (
    <div
      className="flex justify-center items-center gap-4 mb-4"
      style={{
        maxWidth: "min(480px, 90vw)",
        width: "100%",
      }}
    >
      {/* White Player */}
      <div style={playerStyle(isWhiteTurn && status === "playing")}>
        <div style={{ fontSize: "0.75rem", opacity: 0.7, marginBottom: "2px" }}>
          White
        </div>
        <div>{whitePlayer}</div>
        {isWhiteTurn && status === "playing" && (
          <div style={activeIndicatorStyle} />
        )}
      </div>

      {/* VS Indicator */}
      <div
        style={{
          color: "#f5d78e",
          fontSize: "1.2rem",
          fontWeight: "bold",
          opacity: 0.6,
        }}
      >
        VS
      </div>

      {/* Black Player */}
      <div style={playerStyle(isBlackTurn && status === "playing")}>
        <div style={{ fontSize: "0.75rem", opacity: 0.7, marginBottom: "2px" }}>
          Black
        </div>
        <div>{blackPlayer}</div>
        {isBlackTurn && status === "playing" && (
          <div style={activeIndicatorStyle} />
        )}
      </div>
    </div>
  );
}
