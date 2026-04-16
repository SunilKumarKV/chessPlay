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
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-blue-400">ChessPlay</h1>
              <span className="text-sm text-gray-400">Welcome back, {user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* User Stats */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Your Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-2xl font-bold text-blue-400">{user.rating || 1200}</div>
                <div className="text-sm text-gray-400">Rating</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-2xl font-bold text-green-400">{user.gamesWon || 0}</div>
                <div className="text-sm text-gray-400">Wins</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-2xl font-bold text-purple-400">{user.gamesPlayed || 0}</div>
                <div className="text-sm text-gray-400">Games Played</div>
              </div>
            </div>
          </div>

          {/* Game Modes */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Play Chess</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Play vs AI */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer group" onClick={() => setGameMode("ai")}>
                <div className="text-center">
                  <div className="text-4xl mb-4">🤖</div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition-colors">Play vs AI</h3>
                  <p className="text-sm text-gray-400 mb-4">Challenge Stockfish with adjustable difficulty</p>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    Play Now
                  </button>
                </div>
              </div>

              {/* Multiplayer */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors cursor-pointer group" onClick={() => setGameMode("multi")}>
                <div className="text-center">
                  <div className="text-4xl mb-4">👥</div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-green-400 transition-colors">Multiplayer</h3>
                  <p className="text-sm text-gray-400 mb-4">Real-time games with other players</p>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    Find Game
                  </button>
                </div>
              </div>

              {/* Game History */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer group" onClick={() => setGameMode("history")}>
                <div className="text-center">
                  <div className="text-4xl mb-4">📜</div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-purple-400 transition-colors">Game History</h3>
                  <p className="text-sm text-gray-400 mb-4">Review and replay your past games</p>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    View Games
                  </button>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 transition-colors cursor-pointer group" onClick={() => setGameMode("leaderboard")}>
                <div className="text-center">
                  <div className="text-4xl mb-4">🏆</div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-yellow-400 transition-colors">Leaderboard</h3>
                  <p className="text-sm text-gray-400 mb-4">See top players and rankings</p>
                  <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    View Rankings
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">Getting Started</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <h4 className="font-medium text-blue-400 mb-2">🎯 Play vs AI</h4>
                <p>Jump straight into a match against our chess engine. Choose from different difficulty levels and time controls.</p>
              </div>
              <div>
                <h4 className="font-medium text-green-400 mb-2">🌐 Multiplayer</h4>
                <p>Create or join rooms for real-time chess games. Connect with players worldwide using your local network.</p>
              </div>
            </div>
          </div>
        </main>
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
