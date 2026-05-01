import { useEffect, useState } from "react";
import GoldButton from "../components/GoldButton";
import { useTheme } from "../hooks/useTheme";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export default function Leaderboard({ onBack }) {
  const { theme } = useTheme();
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${BACKEND_URL}/api/games/leaderboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to load leaderboard");
        }

        setLeaderboard(data.leaderboard || []);
        setCurrentUser(data.currentUser || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}
    >
      {/* Header */}
      <header
        className="border-b px-6 py-4"
        style={{
          backgroundColor: theme.bg.secondary,
          borderColor: theme.border.primary,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="transition-colors"
              style={{ color: theme.text.secondary }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = theme.text.primary)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = theme.text.secondary)
              }
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-xl font-semibold text-yellow-400">
              Leaderboard
            </h1>
          </div>
          <div className="text-sm text-gray-400">
            Rankings by wins, then rating
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* User Stats */}
        {currentUser && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">
              Your Ranking
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-2xl font-bold text-blue-400">
                  #{currentUser.rank}
                </div>
                <div className="text-sm text-gray-400">Rank</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-2xl font-bold text-purple-400">
                  {currentUser.rating}
                </div>
                <div className="text-sm text-gray-400">Rating</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-2xl font-bold text-green-400">
                  {currentUser.gamesWon}
                </div>
                <div className="text-sm text-gray-400">Wins</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-2xl font-bold text-yellow-400">
                  {currentUser.gamesPlayed}
                </div>
                <div className="text-sm text-gray-400">Games Played</div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_120px_120px_120px] gap-0 bg-gray-700 px-6 py-4 text-sm font-medium text-gray-300">
            <div>Rank</div>
            <div>Player</div>
            <div className="text-center">Wins</div>
            <div className="text-center">Rating</div>
            <div className="text-center">Games</div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400">
              Loading leaderboard...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-400">{error}</div>
          ) : leaderboard.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No leaderboard data yet.
            </div>
          ) : (
            leaderboard.map((player, index) => {
              const isCurrent = currentUser?.username === player.username;
              return (
                <div
                  key={player.username}
                  className={`grid grid-cols-[80px_1fr_120px_120px_120px] gap-0 px-6 py-4 border-t border-gray-700 ${
                    isCurrent ? "bg-blue-900/20" : ""
                  }`}
                >
                  <div className="font-semibold text-lg">
                    {index === 0 && "🥇"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && `#${index + 1}`}
                  </div>
                  <div
                    className={`font-medium ${isCurrent ? "text-blue-400" : "text-white"}`}
                  >
                    {player.username}
                    {isCurrent && (
                      <span className="ml-2 text-xs text-blue-400">(You)</span>
                    )}
                  </div>
                  <div className="text-center text-green-400 font-semibold">
                    {player.gamesWon}
                  </div>
                  <div className="text-center text-purple-400 font-semibold">
                    {player.rating}
                  </div>
                  <div className="text-center text-gray-400">
                    {player.gamesPlayed}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
