import { useEffect, useMemo, useState } from "react";
import GoldButton from "./GoldButton";
import GameReplay from "./GameReplay";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export default function GameHistory({ onBack }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${BACKEND_URL}/api/games/history?limit=50`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
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
      className="min-h-screen flex flex-col items-center justify-start p-5"
      style={{
        background:
          "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        color: "#e8dcc8",
        fontFamily: "'Crimson Text', Georgia, serif",
      }}
    >
      <div className="w-full max-w-6xl mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-widest">Game History</h1>
          <p className="text-sm opacity-70 mt-2">
            Review your completed games and replay move-by-move.
          </p>
        </div>
        <div className="flex gap-2">
          <GoldButton onClick={onBack}>← Back</GoldButton>
        </div>
      </div>

      <div className="w-full max-w-6xl rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="grid grid-cols-[1fr_1.4fr_1fr_1fr_1fr] gap-0 bg-white/10 px-5 py-4 text-xs uppercase tracking-widest text-white/60">
          <div>Completed</div>
          <div>Opponent</div>
          <div>Result</div>
          <div>Moves</div>
          <div>Replay</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-white/70">
            Loading game history…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-300">{error}</div>
        ) : games.length === 0 ? (
          <div className="p-8 text-center text-white/70">
            No completed games yet.
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game._id}
              className="grid grid-cols-[1fr_1.4fr_1fr_1fr_1fr] gap-0 px-5 py-4 border-t border-white/10 items-center"
            >
              <div>
                {new Date(game.endTime || game.startTime).toLocaleString()}
              </div>
              <div>{getOpponentLabel(game)}</div>
              <div>{getResultLabel(game)}</div>
              <div>{game.moves?.length ?? 0}</div>
              <div>
                <GoldButton onClick={() => setSelectedGame(game)}>
                  Replay
                </GoldButton>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
