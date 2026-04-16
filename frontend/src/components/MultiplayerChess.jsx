import { useState, useEffect, useRef } from "react";
import { useMultiplayerChess } from "../hooks/useMultiplayerChess";
import { useChessClock, TIME_CONTROLS } from "../hooks/useChessClock";
import { getLegalMoves } from "../utils/moveValidation";
import Board from "./Board";
import StatusBar from "./StatusBar";
import MoveHistory from "./MoveHistory";
import ChatBox from "./ChatBox";
import CapturedPieces from "./CapturedPieces";
import Panel from "./Panel";
import GoldButton from "./GoldButton";
import ChessClock from "./ChessClock";

export default function MultiplayerChess({ onBack }) {
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [serverUrl, setServerUrl] = useState("http://localhost:3001");
  const [timeControlIdx, setTimeControlIdx] = useState(3);

  const timeControl = TIME_CONTROLS[timeControlIdx];
  const clock = useChessClock({
    initialSeconds: timeControl.initial,
    increment: timeControl.increment,
    enabled: timeControl.initial !== null,
  });

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
    chatMessages,
    sendMessage,
  } = useMultiplayerChess(serverUrl);

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser).username : "";

  const showRoomSetup = !gameState;

  const prevTurnRef = useRef(gameState?.turn);

  useEffect(() => {
    if (gameState) {
      clock.reset();
      prevTurnRef.current = gameState.turn;
    }
  }, [gameState?.roomId, timeControlIdx]);

  useEffect(() => {
    if (!gameState) return;
    const previousTurn = prevTurnRef.current;
    const currentTurn = gameState.turn;

    if (previousTurn && previousTurn !== currentTurn) {
      clock.switchClock(previousTurn);
    }

    prevTurnRef.current = currentTurn;
  }, [gameState?.turn]);

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
        const isLegalMove = legalMoves.some(([r, c]) => r === row && c === col);
        if (isLegalMove) {
          makeMove(selRow, selCol, row, col);
          setSelected(null);
          setLegalMoves([]);
        }
      }
      return;
    }

    const piece = gameState.board[row][col];
    if (piece && piece[0] === playerColor) {
      setSelected([row, col]);
      setLegalMoves(
        getLegalMoves(
          gameState.board,
          row,
          col,
          gameState.enPassant,
          gameState.castling,
        ),
      );
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
        {/* Back Button */}
        <div className="w-full max-w-md mb-4">
          <GoldButton onClick={onBack} className="text-sm">
            ← Back to Menu
          </GoldButton>
        </div>
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
          {/* Server URL Input */}
          <div className="flex flex-col gap-3 items-center">
            <h3 className="text-xl font-semibold">Server Connection</h3>
            <input
              type="text"
              placeholder="Server URL (e.g., http://192.168.1.100:3001)"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="px-4 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 w-80"
            />
            <GoldButton
              onClick={async () => {
                try {
                  const response = await fetch(`${serverUrl}/health`);
                  const data = await response.json();
                  if (data.localIP) {
                    alert(
                      `Server found! Local IP: ${data.localIP}:${data.port}`,
                    );
                  }
                } catch {
                  alert("Could not connect to server. Check the URL.");
                }
              }}
              disabled={!serverUrl}
            >
              Test Connection
            </GoldButton>
            <p className="text-xs opacity-60 text-center">
              Enter the IP address of the host device running the server
              <br />
              Example: http://192.168.1.100:3001
            </p>
          </div>

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

          {/* Time Control */}
          <div className="flex flex-col gap-3 items-center w-full max-w-xs">
            <h3 className="text-xl font-semibold">Time Control</h3>
            <select
              value={timeControlIdx}
              onChange={(e) => setTimeControlIdx(Number(e.target.value))}
              className="px-4 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 w-full"
            >
              {TIME_CONTROLS.map((tc, idx) => (
                <option key={idx} value={idx}>
                  {tc.label}
                </option>
              ))}
            </select>
            <p className="text-xs opacity-60 text-center">
              Choose blitz, rapid, or unlimited timing
            </p>
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
          <GoldButton onClick={onBack}>← Back to Menu</GoldButton>
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
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isConnected
                      ? "bg-green-500/15 text-green-200"
                      : "bg-red-500/15 text-red-200"
                  }`}
                >
                  {isConnected ? "🟢 Connected to server" : "🔴 Disconnected"}
                </span>
              </div>
              <div>Turn: {isMyTurn ? "🎯 Your turn" : "⏳ Waiting"}</div>
              {error && <div className="text-red-400">Error: {error}</div>}
            </div>
          </Panel>

          <GoldButton
            onClick={() => {
              leaveRoom();
            }}
          >
            Leave Game
          </GoldButton>
          <GoldButton onClick={() => window.location.reload()}>
            Back to Player Mode
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
          {/* Clock */}
          <ChessClock
            clock={clock}
            status={gameState.status}
            flipped={flipped}
          />

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
            <GoldButton onClick={() => leaveRoom()}>New Game</GoldButton>
          </div>
        </div>

        {/* ── RIGHT: Captured + History + Chat */}
        <div
          className="flex flex-col gap-3"
          style={{ minWidth: 260, maxWidth: 320 }}
        >
          <Panel title="Captured by White">
            <CapturedPieces pieces={gameState.capturedB || []} label="" />
          </Panel>

          <Panel title="Captured by Black">
            <CapturedPieces pieces={gameState.capturedW || []} label="" />
          </Panel>

          <Panel title="Move History">
            <MoveHistory history={gameState.moveHistory || []} />
          </Panel>

          <ChatBox
            messages={chatMessages}
            onSend={sendMessage}
            currentUser={currentUser}
          />
        </div>
      </div>
    </div>
  );
}
