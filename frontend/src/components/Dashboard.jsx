import { useState, useEffect } from "react";
import { StatCard, GameCard } from "./ui";

const API_BASE = "http://localhost:3001/api";

export default function Dashboard({
  user,
  onStartGame,
  onNavigate,
  onAuthError,
}) {
  const [stats, setStats] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedTimeControl, setSelectedTimeControl] = useState("3+0");
  const [loading, setLoading] = useState(true);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-[#e0e0e0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#81b64c] mx-auto mb-4"></div>
          <p className="text-[#7a7a7a]">Loading...</p>
        </div>
      </div>
    );
  }

  const fetchWithAuth = async (url) => {
    const token = localStorage.getItem("token");
    if (!token) {
      if (typeof onAuthError === "function") onAuthError();
      throw new Error("Unauthorized");
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        if (typeof onAuthError === "function") onAuthError();
      }
      throw new Error(data.message || "Failed to fetch dashboard data");
    }

    return data;
  };

  const timeControls = [
    { id: "1+0", label: "1+0 Bullet", icon: "⚡" },
    { id: "3+0", label: "3+0 Blitz", icon: "🚀" },
    { id: "5+3", label: "5+3 Blitz", icon: "🏃" },
    { id: "10+0", label: "10+0 Rapid", icon: "⏱️" },
    { id: "30+0", label: "30+0 Classical", icon: "👑" },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const statsData = await fetchWithAuth(`${API_BASE}/auth/profile`);
      setStats(statsData.user || null);

      const gamesData = await fetchWithAuth(
        `${API_BASE}/games/history?page=1&limit=5`,
      );
      setRecentGames(gamesData.games || []);

      const leaderboardData = await fetchWithAuth(
        `${API_BASE}/auth/leaderboard?limit=5`,
      );
      const leaderboardItems = Array.isArray(leaderboardData)
        ? leaderboardData
        : leaderboardData.leaderboard || [];
      setLeaderboard(leaderboardItems);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setRecentGames([]);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPlay = () => {
    onStartGame("ai", selectedTimeControl);
  };

  const handlePlayVsComputer = () => {
    onStartGame("ai", selectedTimeControl);
  };

  const formatResult = (game, userId) => {
    if (game.result === "draw") return "Draw";
    if (game.winner?._id === userId) return "Win";
    return "Loss";
  };

  const getResultColor = (result) => {
    switch (result) {
      case "Win":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Loss":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Draw":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getOpponent = (game, userId) => {
    if (game.aiOpponent) {
      return { username: `Stockfish Lv${game.aiDifficulty || 10}`, _id: null };
    }
    if (!game.whitePlayer || !game.blackPlayer) {
      return { username: "Unknown", _id: null };
    }
    if (game.whitePlayer._id === userId) {
      return game.blackPlayer;
    }
    return game.whitePlayer;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-64 bg-[#1a1a1a] rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-[#1a1a1a] rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-96 bg-[#1a1a1a] rounded-lg"></div>
            <div className="h-96 bg-[#1a1a1a] rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* QUICK PLAY HERO CARD */}
      <div className="relative bg-[#1a1a1a] rounded-xl p-8 md:p-12 overflow-hidden border border-[#2a2a2a]">
        {/* Chess board pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #f0d9b5 25%, transparent 25%),
              linear-gradient(-45deg, #f0d9b5 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #f0d9b5 75%),
              linear-gradient(-45deg, transparent 75%, #f0d9b5 75%)
            `,
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          }}
        />

        <div className="relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#e0e0e0] mb-8 font-['Montserrat']">
            Ready to Play Chess?
          </h1>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8">
            <button
              onClick={handleQuickPlay}
              className="bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] font-bold text-xl py-4 px-10 rounded-xl transition-all duration-200 transform hover:scale-105 font-['Montserrat']"
            >
              Play
            </button>

            <button
              onClick={handlePlayVsComputer}
              className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] font-medium py-3 px-6 rounded-lg transition-colors border border-[#2a2a2a] font-['Inter']"
            >
              Play vs Computer
            </button>
          </div>

          {/* Time Control Chips */}
          <div className="flex flex-wrap justify-center gap-3">
            {timeControls.map((control) => (
              <button
                key={control.id}
                onClick={() => setSelectedTimeControl(control.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 font-['Inter'] ${
                  selectedTimeControl === control.id
                    ? "bg-[#81b64c] text-[#0e0e0e]"
                    : "bg-[#2a2a2a] text-[#7a7a7a] hover:bg-[#3a3a3a] hover:text-[#e0e0e0]"
                }`}
              >
                <span>{control.icon}</span>
                {control.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="📊"
          value={stats?.rating || 1200}
          label="Current Rating"
          delta="+12"
          deltaType="positive"
        />
        <StatCard
          icon="🎯"
          value={`${Math.round(((stats?.wins || 0) / (stats?.gamesPlayed || 1)) * 100)}%`}
          label="Win Rate"
          delta="+5%"
          deltaType="positive"
        />
        <StatCard
          icon="🎮"
          value={stats?.gamesPlayed || 0}
          label="Games Played"
        />
        <StatCard icon="🔥" value="7" label="Win Streak" />
      </div>

      {/* GAME MODE CARDS */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 text-[#e0e0e0] font-['Montserrat']">
          Quick Play
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Play vs AI */}
          <div
            className="bg-[#1a1a1a] rounded-lg p-6 border border-[#2a2a2a] hover:border-[#81b64c] transition-colors cursor-pointer group"
            onClick={() => onStartGame("ai", selectedTimeControl)}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-[#81b64c] transition-colors font-['Montserrat']">
                Play vs AI
              </h3>
              <p className="text-sm text-[#7a7a7a] mb-4 font-['Inter']">
                Challenge Stockfish with adjustable difficulty
              </p>
              <button className="w-full bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] font-bold py-3 px-4 rounded-lg transition-colors font-['Montserrat']">
                Play Now
              </button>
            </div>
          </div>

          {/* Multiplayer */}
          <div
            className="bg-[#1a1a1a] rounded-lg p-6 border border-[#2a2a2a] hover:border-[#81b64c] transition-colors cursor-pointer group"
            onClick={() => onStartGame("multi")}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-[#81b64c] transition-colors font-['Montserrat']">
                Multiplayer
              </h3>
              <p className="text-sm text-[#7a7a7a] mb-4 font-['Inter']">
                Real-time games with other players
              </p>
              <button className="w-full bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] font-bold py-3 px-4 rounded-lg transition-colors font-['Montserrat']">
                Find Game
              </button>
            </div>
          </div>

          {/* Game History */}
          <div
            className="bg-[#1a1a1a] rounded-lg p-6 border border-[#2a2a2a] hover:border-[#81b64c] transition-colors cursor-pointer group"
            onClick={() => onNavigate("history")}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">📜</div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-[#81b64c] transition-colors font-['Montserrat']">
                Game History
              </h3>
              <p className="text-sm text-[#7a7a7a] mb-4 font-['Inter']">
                Review and replay your past games
              </p>
              <button className="w-full bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] font-bold py-3 px-4 rounded-lg transition-colors font-['Montserrat']">
                View Games
              </button>
            </div>
          </div>

          {/* Leaderboard */}
          <div
            className="bg-[#1a1a1a] rounded-lg p-6 border border-[#2a2a2a] hover:border-[#81b64c] transition-colors cursor-pointer group"
            onClick={() => onNavigate("leaderboard")}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-[#81b64c] transition-colors font-['Montserrat']">
                Leaderboard
              </h3>
              <p className="text-sm text-[#7a7a7a] mb-4 font-['Inter']">
                See top players and rankings
              </p>
              <button className="w-full bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] font-bold py-3 px-4 rounded-lg transition-colors font-['Montserrat']">
                View Rankings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT GAMES TABLE & LEADERBOARD MINI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Games */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#e0e0e0] font-['Montserrat']">
              Recent Games
            </h2>
            <button
              onClick={() => onNavigate("history")}
              className="text-[#81b64c] hover:text-[#6ba03d] text-sm font-medium font-['Inter']"
            >
              View all →
            </button>
          </div>

          <div className="space-y-3">
            {recentGames.slice(0, 5).map((game) => {
              const opponent = getOpponent(game, user.id);
              const result = formatResult(game, user.id);
              return (
                <GameCard
                  key={game._id}
                  opponent={opponent.username}
                  result={result.toLowerCase()}
                  timeControl={game.aiOpponent ? "AI" : "10+0"}
                  moves={game.moves?.length || 0}
                  date={new Date(
                    game.endTime || game.startTime,
                  ).toLocaleDateString()}
                  onClick={() => onNavigate("history")}
                />
              );
            })}
          </div>
        </div>

        {/* Leaderboard Mini */}
        <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
          <div className="p-6 border-b border-[#2a2a2a]">
            <h2 className="text-xl font-bold text-[#e0e0e0] font-['Montserrat']">
              Leaderboard
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {leaderboard.map((player, index) => (
              <div
                key={player._id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player._id === user.id
                    ? "bg-yellow-500/10 border border-yellow-500/30"
                    : "hover:bg-[#2a2a2a]"
                } transition-colors`}
              >
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2a2a2a] text-[#7a7a7a] font-bold text-sm mr-3">
                    {index + 1}
                  </div>
                  <div className="w-8 h-8 bg-[#81b64c] rounded-full flex items-center justify-center text-[#0e0e0e] font-bold text-sm mr-3">
                    {(player.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`font-medium font-['Inter'] ${
                      player._id === user.id
                        ? "text-yellow-400"
                        : "text-[#e0e0e0]"
                    }`}
                  >
                    {player.username || "Unknown"}
                  </span>
                </div>
                <span
                  className={`font-bold font-['Montserrat'] ${
                    player._id === user.id
                      ? "text-yellow-400"
                      : "text-[#e0e0e0]"
                  }`}
                >
                  {player.rating}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#2a2a2a] text-center">
            <button
              onClick={() => onNavigate("leaderboard")}
              className="text-[#81b64c] hover:text-[#6ba03d] text-sm font-medium font-['Inter']"
            >
              View full leaderboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
