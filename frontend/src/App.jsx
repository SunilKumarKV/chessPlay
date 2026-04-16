import { useState, useEffect } from "react";
import Chess from "./components/Chess";
import MultiplayerChess from "./components/MultiplayerChess";
import Leaderboard from "./components/Leaderboard";
import GameHistory from "./components/GameHistory";
import Auth from "./components/Auth";
import GoldButton from "./components/GoldButton";

export default function App() {
  const [user, setUser] = useState(null);
  const [gameMode, setGameMode] = useState(null); // null, 'ai', 'multi'

  useEffect(() => {
    // Check for stored auth
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setGameMode(null);
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  if (gameMode === null) {
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
          className="font-black tracking-widest mb-4"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2.5rem,6vw,4rem)",
            background: "linear-gradient(90deg,#f5d78e,#c8943a,#f5d78e)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          CHESSPLAY
        </h1>

        <div className="text-center mb-8">
          <p className="text-lg">Welcome, {user.username}!</p>
          <button
            onClick={handleLogout}
            className="text-sm text-yellow-400 hover:text-yellow-300 mt-2"
          >
            Logout
          </button>
        </div>

        <div className="flex flex-col gap-6 items-center">
          <h2 className="text-xl opacity-80">Choose Game Mode</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl">
            <div className="rounded-3xl bg-white/5 p-4 text-center">
              <div className="text-xs uppercase opacity-60">Rating</div>
              <div className="mt-2 text-2xl font-semibold">
                {user.rating || 1200}
              </div>
            </div>
            <div className="rounded-3xl bg-white/5 p-4 text-center">
              <div className="text-xs uppercase opacity-60">Wins</div>
              <div className="mt-2 text-2xl font-semibold">
                {user.gamesWon || 0}
              </div>
            </div>
            <div className="rounded-3xl bg-white/5 p-4 text-center">
              <div className="text-xs uppercase opacity-60">Games</div>
              <div className="mt-2 text-2xl font-semibold">
                {user.gamesPlayed || 0}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <GoldButton onClick={() => setGameMode("ai")}>
              🤖 Play vs AI
            </GoldButton>
            <GoldButton onClick={() => setGameMode("multi")}>
              👥 Multiplayer
            </GoldButton>
            <GoldButton onClick={() => setGameMode("history")}>
              📜 Game History
            </GoldButton>
            <GoldButton onClick={() => setGameMode("leaderboard")}>
              🏆 Leaderboard
            </GoldButton>
          </div>

          <p className="text-sm opacity-60 text-center max-w-md">
            Play vs AI: jump straight into an engine match with adjustable
            difficulty
            <br />
            Multiplayer: real-time games with other players online
            <br />
            Leaderboard: compare wins and ratings with top players
          </p>
        </div>
      </div>
    );
  }

  if (gameMode === "ai") {
    return <Chess onBack={() => setGameMode(null)} initialAiEnabled />;
  }

  if (gameMode === "multi") {
    return <MultiplayerChess onBack={() => setGameMode(null)} />;
  }

  if (gameMode === "history") {
    return <GameHistory onBack={() => setGameMode(null)} />;
  }

  if (gameMode === "leaderboard") {
    return <Leaderboard onBack={() => setGameMode(null)} />;
  }

  return null;
}
