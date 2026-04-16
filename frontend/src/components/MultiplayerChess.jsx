import { useState } from "react";
import { useMultiplayerChess } from "../hooks/useMultiplayerChess";
import { TIME_CONTROLS } from "../hooks/useChessClock";
import MultiplayerGameScreen from "./MultiplayerGameScreen";
import GoldButton from "./GoldButton";

export default function MultiplayerChess({ onBack }) {
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [serverUrl, setServerUrl] = useState("http://localhost:3001");
  const [timeControlIdx, setTimeControlIdx] = useState(3);

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
              <h1 className="text-xl font-semibold text-green-400">Multiplayer Chess</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">Real-time Chess Games</h2>
            <p className="text-gray-400">Connect with other players and compete in live matches</p>
          </div>

          <div className="space-y-8">
            {/* Server Connection */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">Server Connection</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Server URL</label>
                  <input
                    type="text"
                    placeholder="http://192.168.1.100:3001"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Test Connection
                </button>
                <div className="text-center">
                  <div className={`text-sm ${isConnected ? "text-green-400" : "text-red-400"}`}>
                    {isConnected ? "🟢 Connected to server" : "🔴 Connecting to server..."}
                  </div>
                  {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
                </div>
              </div>
            </div>

            {/* Time Control */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-purple-400">Time Control</h3>
              <div className="space-y-4">
                <select
                  value={timeControlIdx}
                  onChange={(e) => setTimeControlIdx(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  {TIME_CONTROLS.map((tc, idx) => (
                    <option key={idx} value={idx} className="bg-gray-700">
                      {tc.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-400">
                  Choose blitz, rapid, or unlimited timing for your games
                </p>
              </div>
            </div>

            {/* Create Room */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-green-400">Create New Room</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Your Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                  />
                </div>
                <button
                  onClick={() => {
                    if (playerName.trim()) {
                      createRoom(playerName.trim());
                    }
                  }}
                  disabled={!isConnected || !playerName.trim()}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Create Room
                </button>
              </div>
            </div>

            {/* Join Room */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-yellow-400">Join Existing Room</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Room ID</label>
                  <input
                    type="text"
                    placeholder="Enter room ID"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <button
                  onClick={() => {
                    if (joinRoomId.trim() && playerName.trim()) {
                      joinRoom(joinRoomId.trim(), playerName.trim());
                    }
                  }}
                  disabled={!isConnected || !joinRoomId.trim() || !playerName.trim()}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Game in progress - use professional game screen
  if (gameState) {
    return (
      <MultiplayerGameScreen
        onBack={onBack}
        serverUrl={serverUrl}
        timeControlIdx={timeControlIdx}
        playerName={playerName}
        roomId={roomId}
        playerColor={playerColor}
        opponentName={opponentName}
        gameState={gameState}
        isMyTurn={isMyTurn}
        makeMove={makeMove}
        leaveRoom={leaveRoom}
        chatMessages={chatMessages}
        sendMessage={sendMessage}
        isConnected={isConnected}
        error={error}
      />
    );
  }
}
