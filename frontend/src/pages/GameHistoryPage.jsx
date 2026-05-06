import { useEffect, useMemo, useState } from "react";
import GoldButton from "../components/GoldButton";
import GameReplay from "../features/chess/components/GameReplay";
import { useTheme } from "../hooks/useTheme";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export default function GameHistory({ onBack }) {
  const { theme } = useTheme();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/games/history?limit=50`,
          {
            credentials: "include",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load history");
        }

        setGames(data.games || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const getOpponentLabel = (game) => {
    if (game.aiOpponent) return `Stockfish Lv${game.aiDifficulty}`;
    const userId = currentUser?.id;
    if (game.whitePlayer?._id === userId) {
      return game.blackPlayer?.username || "Unknown";
    }
    return game.whitePlayer?.username || "Unknown";
  };

  const getResultLabel = (game) => {
    if (game.result === "draw") return "Draw";
    if (game.winner?.username) {
      if (game.winner._id === currentUser?.id) return "Win";
      return "Loss";
    }
    return game.result === "white" || game.result === "black"
      ? "Outcome"
      : "Completed";
  };

  if (selectedGame) {
    return (
      <GameReplay game={selectedGame} onClose={() => setSelectedGame(null)} />
    );
  }

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
            <h1
              className="text-xl font-semibold"
              style={{ color: theme.primary }}
            >
              Game History
            </h1>
          </div>
          <div className="text-sm" style={{ color: theme.text.tertiary }}>
            Review and replay your past games
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* History Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="grid grid-cols-[200px_1fr_120px_100px_120px] gap-0 bg-gray-700 px-6 py-4 text-sm font-medium text-gray-300">
            <div>Date</div>
            <div>Opponent</div>
            <div className="text-center">Result</div>
            <div className="text-center">Moves</div>
            <div className="text-center">Action</div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400">
              Loading game history...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-400">{error}</div>
          ) : games.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No completed games yet.
            </div>
          ) : (
            games.map((game) => (
              <div
                key={game._id}
                className="grid grid-cols-[200px_1fr_120px_100px_120px] gap-0 px-6 py-4 border-t border-gray-700 hover:bg-gray-700/50 transition-colors"
              >
                <div className="text-sm text-gray-400">
                  {new Date(
                    game.endTime || game.startTime,
                  ).toLocaleDateString()}
                  <br />
                  <span className="text-xs">
                    {new Date(
                      game.endTime || game.startTime,
                    ).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-medium">{getOpponentLabel(game)}</div>
                <div className="text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getResultLabel(game) === "Win"
                        ? "bg-green-900/30 text-green-400"
                        : getResultLabel(game) === "Loss"
                          ? "bg-red-900/30 text-red-400"
                          : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {getResultLabel(game)}
                  </span>
                </div>
                <div className="text-center text-gray-400">
                  {game.moves?.length ?? 0}
                </div>
                <div className="text-center">
                  <button
                    onClick={() => setSelectedGame(game)}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Replay
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
