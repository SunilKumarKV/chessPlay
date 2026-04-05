import { useState, useEffect } from "react";
import Chess from "./components/Chess";
import MultiplayerChess from "./components/MultiplayerChess";
import Auth from "./components/Auth";
import GoldButton from "./components/GoldButton";

export default function App() {
  const [user, setUser] = useState(null);
  const [gameMode, setGameMode] = useState(null); // null, 'single', 'multi'

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

          <div className="flex gap-4">
            <GoldButton onClick={() => setGameMode("single")}>
              🎯 Single Player
            </GoldButton>
            <GoldButton onClick={() => setGameMode("multi")}>
              👥 Multiplayer
            </GoldButton>
          </div>

          <p className="text-sm opacity-60 text-center max-w-md">
            Single Player: Play against AI with customizable difficulty
            <br />
            Multiplayer: Real-time games with other players online
          </p>
        </div>
      </div>
    );
  }

  if (gameMode === "single") {
    return <Chess onBack={() => setGameMode(null)} />;
  }

  if (gameMode === "multi") {
    return <MultiplayerChess onBack={() => setGameMode(null)} />;
  }

  return null;
}
