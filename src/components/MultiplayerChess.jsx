import { useState } from "react";
import { useMultiplayerChess } from "../hooks/useMultiplayerChess";
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

export default function MultiplayerChess() {
  const {
    isConnected,
    error,
    gameState,
    roomId,
    playerColor,
    opponentName,
    isMyTurn,
    createRoom,
    joinRoom,
    makeMove,
    leaveRoom,
  } = useMultiplayerChess();

  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [showRoomSetup, setShowRoomSetup] = useState(true);

  // Handle square click for multiplayer
  const handleSquareClick = (row, col) => {
    if (!gameState || !isMyTurn) return;

    if (selected) {
      const [selRow, selCol] = selected;
      if (selRow === row && selCol === col) {
        // Deselect
        setSelected(null);
        setLegalMoves([]);
      } else {
        // Try to make move
        const isLegalMove = legalMoves.some(([r, c]) => r === row && c === col);
        if (isLegalMove) {
          makeMove(selRow, selCol, row, col);
          setSelected(null);
          setLegalMoves([]);
        }
      }
    } else {
      // Select piece
      const piece = gameState.board[row][col];
      if (piece && piece[0] === playerColor) {
        setSelected([row, col]);
        // For now, allow any square as legal move (simplified)
        setLegalMoves(
          [
            [row + 1, col],
            [row - 1, col],
            [row, col + 1],
            [row, col - 1],
            [row + 1, col + 1],
            [row + 1, col - 1],
            [row - 1, col + 1],
            [row - 1, col - 1],
          ].filter(([r, c]) => r >= 0 && r < 8 && c >= 0 && c < 8),
        );
      }
    }
  };

  // If not connected to game, show room setup
  if (showRoomSetup && !gameState) {
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
          className="font-black tracking-widest mb-8"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2rem,5vw,3rem)",
            background: "linear-gradient(90deg,#f5d78e,#c8943a,#f5d78e)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          MULTIPLAYER CHESS
        </h1>

        <div className="flex flex-col gap-6 items-center">
          {/* Connection Status */}
          <div className="text-center">
            <div
              className={`text-lg ${isConnected ? "text-green-400" : "text-red-400"}`}
            >
              {isConnected
                ? "🟢 Connected to server"
                : "🔴 Connecting to server..."}
            </div>
            {error && <div className="text-red-400 mt-2">{error}</div>}
          </div>

          {/* Create Room */}
          <div className="flex flex-col gap-3 items-center">
            <h3 className="text-xl font-semibold">Create New Room</h3>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="px-4 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50"
            />
            <GoldButton
              onClick={() => {
                if (playerName.trim()) {
                  createRoom(playerName.trim());
                  setShowRoomSetup(false);
                }
              }}
              disabled={!isConnected || !playerName.trim()}
            >
              Create Room
            </GoldButton>
          </div>

          {/* Join Room */}
          <div className="flex flex-col gap-3 items-center">
            <h3 className="text-xl font-semibold">Join Existing Room</h3>
            <input
              type="text"
              placeholder="Room ID"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              className="px-4 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50"
            />
            <GoldButton
              onClick={() => {
                if (joinRoomId.trim() && playerName.trim()) {
                  joinRoom(joinRoomId.trim(), playerName.trim());
                  setShowRoomSetup(false);
                }
              }}
              disabled={
                !isConnected || !joinRoomId.trim() || !playerName.trim()
              }
            >
              Join Room
            </GoldButton>
          </div>

          {/* Back to Single Player */}
          <GoldButton onClick={() => window.location.reload()}>
            ← Back to Single Player
          </GoldButton>
        </div>
      </div>
    );
  }

  // Game in progress
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading game...</div>
      </div>
    );
  }

  const isOver =
    gameState.status === "checkmate" || gameState.status === "stalemate";
  const flipped = playerColor === "b"; // Black player sees board flipped

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
        MULTIPLAYER CHESS
      </h1>
      <p className="text-xs tracking-widest opacity-40 mb-2">
        Room: {roomId} | Playing as {playerColor === "w" ? "White" : "Black"}
      </p>
      {opponentName && (
        <p className="text-xs tracking-widest opacity-40 mb-5">
          vs {opponentName}
        </p>
      )}

      {/* Main 3-column layout */}
      <div className="flex gap-4 items-start flex-wrap justify-center">
        {/* ── LEFT: Game Info */}
        <div className="flex flex-col gap-3">
          <Panel title="Game Info">
            <div className="text-sm space-y-2">
              <div>
                Room ID: <span className="font-mono">{roomId}</span>
              </div>
              <div>
                Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
              </div>
              <div>Turn: {isMyTurn ? "🎯 Your turn" : "⏳ Waiting"}</div>
              {error && <div className="text-red-400">Error: {error}</div>}
            </div>
          </Panel>

          <GoldButton onClick={() => setShowRoomSetup(true)}>
            Leave Game
          </GoldButton>
        </div>

        {/* ── CENTER: Board + Controls */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Status */}
          <StatusBar status={gameState.status} turn={gameState.turn} />

          {/* Board */}
          <Board
            board={gameState.board}
            flipped={flipped}
            isSelected={(r, c) =>
              selected && selected[0] === r && selected[1] === c
            }
            isLegalDest={(r, c) =>
              legalMoves.some(([lr, lc]) => lr === r && lc === c)
            }
            isLastMove={() => false} // TODO: implement last move highlighting
            onSquareClick={handleSquareClick}
          />

          {/* Controls */}
          <div className="flex gap-2 mt-4 flex-wrap justify-center">
            <GoldButton onClick={() => setShowRoomSetup(true)}>
              New Game
            </GoldButton>
          </div>
        </div>

        {/* ── RIGHT: Captured + History */}
        <div
          className="flex flex-col gap-3"
          style={{ minWidth: 155, maxWidth: 175 }}
        >
          <Panel title="Captured by White">
            <CapturedPieces pieces={[]} label="" />
          </Panel>

          <Panel title="Captured by Black">
            <CapturedPieces pieces={[]} label="" />
          </Panel>

          <Panel title="Move History">
            <MoveHistory history={gameState.moveHistory || []} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
