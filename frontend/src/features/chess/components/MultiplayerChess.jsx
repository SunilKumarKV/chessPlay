import { useEffect, useState } from "react";
import { useMultiplayerChess } from "../hooks/useMultiplayerChess";
import { TIME_CONTROLS } from "../hooks/useChessClock";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import MultiplayerGameScreen from "./MultiplayerGameScreen";

export default function MultiplayerChess({ onBack }) {
  const { user } = useCurrentUser();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [serverUrl, setServerUrl] = useState(
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3001",
  );
  const [selectedTimeControlIndex, setSelectedTimeControlIndex] = useState(3);
  const [connectionCheck, setConnectionCheck] = useState(null);

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
    spectateRoom,
    makeMove,
    leaveRoom,
    resign,
    chatMessages,
    sendMessage,
    drawOffered,
    drawOfferedBy,
    offerDraw,
    acceptDraw,
    declineDraw,
    isSearching,
    queueSize,
    joinQueue,
    leaveQueue,
    rooms,
    isSpectating,
    spectatorCount,
    getRooms,
  } = useMultiplayerChess(serverUrl);

  const displayName = playerName.trim() || user?.username || "Player";
  const showRoomSetup = !gameState;
  const playerNameForRoom = playerName.trim();
  const roomCodeForJoin = roomCode.trim();

  useEffect(() => {
    if (!isConnected || gameState) return;

    getRooms();
    const interval = setInterval(getRooms, 4000);
    return () => clearInterval(interval);
  }, [getRooms, isConnected, gameState]);

  const testServerConnection = async () => {
    setConnectionCheck({ tone: "info", message: "Checking server..." });

    try {
      const response = await fetch(`${serverUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check returned ${response.status}`);
      }

      const health = await response.json();
      setConnectionCheck({
        tone: "success",
        message: health.port
          ? `Server responded on port ${health.port}.`
          : "Server is responding.",
      });
    } catch (connectionError) {
      setConnectionCheck({
        tone: "error",
        message:
          connectionError.message ||
          "Could not reach the server. Check the URL and try again.",
      });
    }
  };

  if (showRoomSetup && !gameState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold text-green-400">
                Multiplayer Chess
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">Real-time Chess Games</h2>
            <p className="text-gray-400">
              Connect with other players and compete in live matches
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-green-400">
                Quick Match
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Find a public match near your rating without sharing a room code.
                </p>
                {isSearching ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3 rounded-lg bg-gray-700 px-4 py-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
                      <span className="text-sm text-gray-200">
                        Searching... {queueSize} players waiting
                      </span>
                    </div>
                    <button
                      onClick={leaveQueue}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Cancel Search
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => joinQueue(displayName)}
                    disabled={!isConnected}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Quick Match
                  </button>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">
                Server Connection
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Server URL
                  </label>
                  <input
                    type="text"
                    placeholder="http://192.168.1.100:3001"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={testServerConnection}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Test Connection
                </button>
                <div className="text-center">
                  <div
                    className={`text-sm ${isConnected ? "text-green-400" : "text-red-400"}`}
                  >
                    {isConnected
                      ? "🟢 Connected to server"
                      : "🔴 Connecting to server..."}
                  </div>
                  {error && (
                    <div className="text-red-400 text-sm mt-2">{error}</div>
                  )}
                  {connectionCheck && (
                    <div
                      className={`mt-2 text-sm ${
                        connectionCheck.tone === "success"
                          ? "text-green-300"
                          : connectionCheck.tone === "error"
                            ? "text-red-300"
                            : "text-blue-300"
                      }`}
                    >
                      {connectionCheck.message}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-purple-400">
                Time Control
              </h3>
              <div className="space-y-4">
                <select
                  value={selectedTimeControlIndex}
                  onChange={(e) =>
                    setSelectedTimeControlIndex(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  {TIME_CONTROLS.map((timeControl, timeControlIndex) => (
                    <option
                      key={timeControl.label}
                      value={timeControlIndex}
                      className="bg-gray-700"
                    >
                      {timeControl.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-400">
                  Choose blitz, rapid, or unlimited timing for your games
                </p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-green-400">
                Create New Room
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Your Name
                  </label>
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
                    if (playerNameForRoom) {
                      createRoom(playerNameForRoom);
                    }
                  }}
                  disabled={!isConnected || !playerNameForRoom}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Create Room
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-yellow-400">
                Join Existing Room
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Room ID
                  </label>
                  <input
                    type="text"
                    placeholder="Enter room ID"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <button
                  onClick={() => {
                    if (roomCodeForJoin && playerNameForRoom) {
                      joinRoom(roomCodeForJoin, playerNameForRoom);
                    }
                  }}
                  disabled={!isConnected || !roomCodeForJoin || !playerNameForRoom}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Join Room
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-cyan-400">
                  Public Rooms
                </h3>
                <button
                  onClick={getRooms}
                  disabled={!isConnected}
                  className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-md transition-colors"
                >
                  Refresh
                </button>
              </div>
              {rooms.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No public rooms are open right now. Create one or try Quick
                  Match.
                </p>
              ) : (
                <div className="space-y-2">
                  {rooms.map((room) => {
                    const actionLabel = room.isFull ? "Watch" : "Join";
                    const actionClass = room.isFull
                      ? "bg-cyan-600 hover:bg-cyan-700"
                      : "bg-yellow-600 hover:bg-yellow-700";

                    return (
                      <div
                        key={room.id}
                        className="flex items-center justify-between bg-gray-700/60 rounded-lg px-3 py-2"
                      >
                        <div className="text-sm">
                          <div className="font-semibold text-white">
                            {room.id}
                          </div>
                          <div className="text-gray-300 text-xs">
                            {room.players.w} vs {room.players.b}
                          </div>
                          <div className="text-gray-400 text-xs">
                            Spectators: {room.spectatorCount || 0}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            room.isFull
                              ? spectateRoom(room.id)
                              : joinRoom(room.id, displayName)
                          }
                          disabled={!isConnected}
                          className={`text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors disabled:bg-gray-600 ${actionClass}`}
                        >
                          {actionLabel}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (gameState) {
    return (
      <MultiplayerGameScreen
        onBack={onBack}
        timeControlIdx={selectedTimeControlIndex}
        playerName={playerName}
        roomId={roomId}
        playerColor={playerColor}
        opponentName={opponentName}
        gameState={gameState}
        isMyTurn={isMyTurn}
        makeMove={makeMove}
        leaveRoom={leaveRoom}
        resign={resign}
        chatMessages={chatMessages}
        sendMessage={sendMessage}
        drawOffered={drawOffered}
        drawOfferedBy={drawOfferedBy}
        offerDraw={offerDraw}
        acceptDraw={acceptDraw}
        declineDraw={declineDraw}
        isConnected={isConnected}
        error={error}
        isSpectating={isSpectating}
        spectatorCount={spectatorCount}
      />
    );
  }
}
