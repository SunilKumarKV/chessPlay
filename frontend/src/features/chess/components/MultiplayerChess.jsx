import { useEffect, useMemo, useState } from "react";
import { useMultiplayerChess } from "../hooks/useMultiplayerChess";
import { TIME_CONTROLS } from "../hooks/useChessClock";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { BACKEND_URL, SOCKET_URL } from "../../../config/runtime";
import MultiplayerGameScreen from "./MultiplayerGameScreen";

const MATCH_MODES = [
  { id: "casual", label: "Casual", icon: "♟", ratingRange: "open", copy: "Friendly auto match" },
  { id: "ranked", label: "Ranked", icon: "★", ratingRange: "rated", copy: "Rating focused pairing" },
  { id: "blitz", label: "Blitz", icon: "⚡", timeIndex: 3, copy: "Fast online game" },
  { id: "rapid", label: "Rapid", icon: "⏱", timeIndex: 4, copy: "More thinking time" },
  { id: "beginner", label: "Beginner", icon: "🌱", ratingRange: "beginner", copy: "New player friendly" },
  { id: "intermediate", label: "Intermediate", icon: "♞", ratingRange: "intermediate", copy: "Balanced opponents" },
  { id: "advanced", label: "Advanced", icon: "♛", ratingRange: "advanced", copy: "Stronger players" },
];

export default function MultiplayerChess({ onBack, onNavigate }) {
  const { user, isLoggedIn } = useCurrentUser();
  const [playerName, setPlayerName] = useState(user?.username || "");
  const [roomCode, setRoomCode] = useState("");
  const [serverUrl] = useState(SOCKET_URL || BACKEND_URL);
  const [selectedTimeControlIndex, setSelectedTimeControlIndex] = useState(3);
  const [selectedMode, setSelectedMode] = useState("casual");
  const [connectionCheck, setConnectionCheck] = useState(null);
  const [uiNotice, setUiNotice] = useState(null);
  const [searchStartedAt, setSearchStartedAt] = useState(null);
  const [searchSeconds, setSearchSeconds] = useState(0);

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
    connectionStatus,
    retryConnection,
  } = useMultiplayerChess(serverUrl, true, { enabled: isLoggedIn && !user?.isGuest });

  const displayName = playerName.trim() || user?.username || "Player";
  const showRoomSetup = !gameState;
  const playerNameForRoom = playerName.trim() || user?.username || "Player";
  const roomCodeForJoin = roomCode.trim();
  const activeMode = useMemo(() => MATCH_MODES.find((mode) => mode.id === selectedMode) || MATCH_MODES[0], [selectedMode]);

  useEffect(() => {
    if (!isConnected || gameState) return undefined;
    getRooms();
    const interval = setInterval(getRooms, 4000);
    return () => clearInterval(interval);
  }, [getRooms, isConnected, gameState]);

  useEffect(() => {
    if (!isSearching || !searchStartedAt) return undefined;
    const interval = window.setInterval(() => {
      setSearchSeconds(Math.floor((Date.now() - searchStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isSearching, searchStartedAt]);

  useEffect(() => {
    if (!isSearching) {
      setSearchStartedAt(null);
      setSearchSeconds(0);
    }
  }, [isSearching]);

  if (!isLoggedIn || user?.isGuest) {
    return (
      <div className="min-h-screen bg-[#07100d] px-4 py-10 text-white">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-amber-300/30 bg-amber-300/10 p-6 text-center shadow-2xl">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-200">Login required</p>
          <h1 className="mt-3 text-3xl font-black">Play Online needs a secure account</h1>
          <p className="mt-3 text-sm leading-6 text-amber-50/80">Online games use authenticated sockets to protect rooms, ratings, game history, chat, and opponent matching.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => onNavigate?.("dashboard")} className="rounded-xl border border-white/15 px-5 py-3 font-bold text-white hover:bg-white/10">Back</button>
            <button onClick={() => onNavigate?.("pricing")} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200">Support ChessPlay</button>
          </div>
        </div>
      </div>
    );
  }

  const testServerConnection = async () => {
    setConnectionCheck({ tone: "info", message: "Checking multiplayer server..." });
    try {
      const response = await fetch(`${serverUrl}/healthz`, { credentials: "include" });
      if (!response.ok) throw new Error(`Health check returned ${response.status}`);
      setConnectionCheck({ tone: "success", message: "Server is responding. Multiplayer is ready." });
    } catch (connectionError) {
      setConnectionCheck({ tone: "error", message: connectionError.message || "Connection lost. Refresh and retry." });
    }
  };

  const startMatchmaking = () => {
    if (!isConnected) {
      setUiNotice({ tone: "error", message: "Multiplayer is not connected yet. Try Retry connection." });
      return;
    }
    const nextTimeIndex = typeof activeMode.timeIndex === "number" ? activeMode.timeIndex : selectedTimeControlIndex;
    setSelectedTimeControlIndex(nextTimeIndex);
    setSearchStartedAt(Date.now());
    joinQueue(displayName, {
      mode: activeMode.id,
      ratingRange: activeMode.ratingRange,
      timeControlIndex: nextTimeIndex,
    });
  };

  const cancelSearch = () => {
    leaveQueue();
    setSearchStartedAt(null);
    setSearchSeconds(0);
  };

  if (showRoomSetup && !gameState) {
    return (
      <div className="min-h-screen bg-[#07100d] text-white">
        <header className="border-b border-white/10 bg-white/[0.04] px-6 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <button onClick={onBack} className="text-sm font-bold text-slate-400 transition hover:text-white">← Back to Dashboard</button>
            <div className={`rounded-full px-3 py-1 text-xs font-black ${isConnected ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>{isConnected ? "🟢 Connected" : connectionStatus === "reconnecting" ? "🟡 Reconnecting" : connectionStatus === "login-required" ? "🔒 Login required" : "🔴 Disconnected"}</div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#81b64c]">Play Online</p>
            <h1 className="mt-2 font-['Montserrat'] text-3xl font-black md:text-5xl">Find an opponent automatically or invite a friend.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Choose a mode, start searching, or create a private room. Connection is protected by your ChessPlay session. If multiplayer disconnects, use Retry connection without refreshing the page.</p>
          </section>

          <section className="mb-6 grid gap-3 md:grid-cols-3">
            {[
              ["Play vs AI", "Practice safely against the engine.", "ai"],
              ["Play Online", "Create or join real-time rooms.", "multi"],
              ["Support ChessPlay", "Pay with PayPal, UPI, or Bank and get supporter benefits after admin verification.", "pricing"],
            ].map(([title, text, page]) => (
              <button key={title} type="button" onClick={() => onNavigate?.(page)} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left hover:bg-white/[0.08]">
                <div className="font-black text-white">{title}</div>
                <p className="mt-1 text-sm text-slate-400">{text}</p>
              </button>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">Online Matchmaking</h2>
                  <p className="mt-1 text-sm text-slate-400">Chess.com-style auto searching players.</p>
                </div>
                <select value={selectedTimeControlIndex} onChange={(e) => setSelectedTimeControlIndex(Number(e.target.value))} className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#81b64c]">
                  {TIME_CONTROLS.map((timeControl, timeControlIndex) => <option key={timeControl.label} value={timeControlIndex} className="bg-[#111827]">{timeControl.label}</option>)}
                </select>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {MATCH_MODES.map((mode) => {
                  const active = selectedMode === mode.id;
                  return (
                    <button key={mode.id} type="button" onClick={() => setSelectedMode(mode.id)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${active ? "border-[#81b64c] bg-[#81b64c]/15" : "border-white/10 bg-black/20 hover:bg-white/10"}`}>
                      <div className="text-3xl">{mode.icon}</div>
                      <div className="mt-2 font-black text-white">{mode.label}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-400">{mode.copy}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
                {isSearching ? (
                  <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#81b64c] border-t-transparent" />
                    <h3 className="mt-4 text-2xl font-black">Searching for opponent...</h3>
                    <p className="mt-2 text-sm text-slate-400">Mode: {activeMode.label} · Queue: {queueSize} · {searchSeconds}s elapsed</p>
                    <div className="mt-5 flex justify-center gap-3">
                      <button onClick={cancelSearch} className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 font-bold text-white hover:bg-white/15">Cancel search</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <h3 className="text-xl font-black">Ready for {activeMode.label}</h3>
                      <p className="mt-1 text-sm text-slate-400">Auto pairing uses your rating and selected mode. Timeout fallback keeps you in queue until you cancel.</p>
                    </div>
                    <button onClick={startMatchmaking} disabled={!isConnected} aria-label="Find an online chess opponent" className="rounded-xl bg-[#81b64c] px-6 py-4 font-black text-[#07100a] hover:bg-[#93c85f] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Find Opponent</button>
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                <h3 className="text-lg font-black text-cyan-300">Multiplayer Server</h3>
                <p className="mt-2 text-sm text-slate-400">Server URL is protected by environment variables and hidden from players.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={testServerConnection} className="rounded-xl bg-cyan-500 px-4 py-3 font-black text-[#07100a] hover:bg-cyan-400">Test Server</button><button onClick={retryConnection} className="rounded-xl border border-white/10 px-4 py-3 font-black text-white hover:bg-white/10">Retry connection</button></div>
                {error && <div role="alert" className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
                {uiNotice && <div role="status" className={`mt-3 rounded-xl border p-3 text-sm ${uiNotice.tone === "error" ? "border-red-400/20 bg-red-400/10 text-red-200" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"}`}>{uiNotice.message}</div>}
                {connectionCheck && <div className={`mt-3 rounded-xl border p-3 text-sm ${connectionCheck.tone === "success" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : connectionCheck.tone === "error" ? "border-red-400/20 bg-red-400/10 text-red-200" : "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"}`}>{connectionCheck.message}</div>}
              </section>

              <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                <h3 className="text-lg font-black text-[#81b64c]">Create / Join Room</h3>
                <label className="mt-4 block text-sm font-bold text-slate-300">Your Name
                  <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter your name" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-[#81b64c]" />
                </label>
                <button onClick={() => { createRoom(playerNameForRoom); setUiNotice({ tone: "success", message: "Room request sent. Share the room code after it appears." }); }} disabled={!isConnected || !playerNameForRoom} className="mt-4 w-full rounded-xl bg-[#81b64c] px-4 py-3 font-black text-[#07100a] hover:bg-[#93c85f] disabled:bg-slate-700 disabled:text-slate-400">Host Private Room</button>
                <label className="mt-4 block text-sm font-bold text-slate-300">Room Code
                  <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-amber-300" />
                </label>
                <button onClick={() => joinRoom(roomCodeForJoin, playerNameForRoom)} disabled={!isConnected || !roomCodeForJoin || !playerNameForRoom} className="mt-4 w-full rounded-xl bg-amber-300 px-4 py-3 font-black text-black hover:bg-amber-200 disabled:bg-slate-700 disabled:text-slate-400">Join Room</button>
              </section>
            </aside>
          </div>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-cyan-300">Public Rooms</h3>
              <button onClick={getRooms} disabled={!isConnected} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-50">Refresh</button>
            </div>
            {rooms.length === 0 ? <p className="text-sm text-slate-400">No public rooms are open right now. Create one or try online matchmaking.</p> : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {rooms.map((room) => {
                  const actionLabel = room.isFull ? "Watch" : "Join";
                  return (
                    <div key={room.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <div className="text-sm"><div className="font-black text-white">{room.id}</div><div className="text-xs text-slate-300">{room.players.w} vs {room.players.b}</div><div className="text-xs text-slate-500">Spectators: {room.spectatorCount || 0}</div></div>
                      <button onClick={() => room.isFull ? spectateRoom(room.id) : joinRoom(room.id, displayName)} disabled={!isConnected} className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-black text-[#07100a] hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400">{actionLabel}</button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
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
        onNavigate={onNavigate}
      />
    );
  }

  return null;
}
