import { useEffect, useState } from "react";
import GoldButton from "./GoldButton";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export default function Leaderboard({ onBack }) {
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
      className="min-h-screen flex flex-col items-center justify-center p-5"
      style={{
        background:
          "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        fontFamily: "'Crimson Text', Georgia, serif",
        color: "#e8dcc8",
      }}
    >
      <div className="w-full max-w-6xl mb-4 flex justify-between items-center">
        <GoldButton onClick={onBack}>← Back</GoldButton>
        <div className="text-right text-sm opacity-70">
          <div>Leaderboard is sorted by wins, then rating.</div>
          <div>Ratings rise after online victories.</div>
        </div>
      </div>

      <h1
        className="font-black tracking-widest mb-6"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(2rem,5vw,3rem)",
          background: "linear-gradient(90deg,#f5d78e,#c8943a,#f5d78e)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        LEADERBOARD
      </h1>

      <div className="w-full max-w-4xl mb-5 rounded-3xl bg-white/10 border border-white/10 p-5 backdrop-blur-sm">
        {currentUser ? (
          <div className="grid grid-cols-4 gap-4 text-sm text-white/80">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-xs uppercase opacity-60">Your rank</div>
              <div className="mt-2 text-2xl font-semibold">
                {currentUser.rank}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-xs uppercase opacity-60">Rating</div>
              <div className="mt-2 text-2xl font-semibold">
                {currentUser.rating}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-xs uppercase opacity-60">Wins</div>
              <div className="mt-2 text-2xl font-semibold">
                {currentUser.gamesWon}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-xs uppercase opacity-60">Games played</div>
              <div className="mt-2 text-2xl font-semibold">
                {currentUser.gamesPlayed}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/70">
            Loading your leaderboard position…
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white/5 border border-white/10">
        <div className="grid grid-cols-[minmax(120px,1fr)_1.5fr_1fr_1fr_1fr] gap-0 bg-white/10 px-5 py-4 text-xs uppercase tracking-widest text-white/60">
          <div>#</div>
          <div>Player</div>
          <div>Wins</div>
          <div>Rating</div>
          <div>Played</div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-white/70">
            Loading leaderboard…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-300">{error}</div>
        ) : leaderboard.length === 0 ? (
          <div className="p-10 text-center text-white/70">
            No leaderboard data yet.
          </div>
        ) : (
          leaderboard.map((player, index) => {
            const isCurrent = currentUser?.username === player.username;
            return (
              <div
                key={player.username}
                className={`grid grid-cols-[minmax(120px,1fr)_1.5fr_1fr_1fr_1fr] gap-0 px-5 py-4 border-t border-white/10 ${
                  isCurrent ? "bg-yellow-400/10" : ""
                }`}
              >
                <div className="font-semibold">{index + 1}</div>
                <div>{player.username}</div>
                <div>{player.gamesWon}</div>
                <div>{player.rating}</div>
                <div>{player.gamesPlayed}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
