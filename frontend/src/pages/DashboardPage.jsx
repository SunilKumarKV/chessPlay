import { useState, useEffect } from "react";
import { StatCard, GameCard } from "../components/ui";
import { apiClient } from "../services/apiClient";
import { useTheme } from "../hooks/useTheme";

export default function Dashboard({
  user,
  onStartGame,
  onNavigate,
  onAuthError,
}) {
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedTimeControl, setSelectedTimeControl] = useState("3+0");
  const [loading, setLoading] = useState(true);

  if (!user) {
    return (
      <div
        className="flex-1 flex items-center justify-center h-full min-h-[50vh] w-full"
        style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#81b64c] mx-auto mb-4"></div>
          <p style={{ color: theme.text.secondary }}>Loading...</p>
        </div>
      </div>
    );
  }

  const fetchWithAuth = async (url) => {
    try {
      return await apiClient(url);
    } catch (error) {
      if (error.message.includes("401") || error.message.includes("403")) {
        if (typeof onAuthError === "function") onAuthError();
      }
      throw error;
    }
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
      const statsData = await fetchWithAuth("/api/auth/profile");
      setStats(statsData.user || null);

      const gamesData = await fetchWithAuth(
        "/api/games/history?page=1&limit=5",
      );
      setRecentGames(gamesData.games || []);

      const leaderboardData = await fetchWithAuth(
        "/api/auth/leaderboard?limit=5",
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
      <div
        className="max-w-6xl mx-auto p-4 md:p-8 w-full"
        style={{ backgroundColor: theme.bg.primary }}
      >
        <div className="animate-pulse space-y-8">
          <div
            className="h-64 rounded-xl border"
            style={{
              backgroundColor: theme.bg.tertiary,
              borderColor: theme.border.primary,
            }}
          ></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-xl border"
                style={{
                  backgroundColor: theme.bg.tertiary,
                  borderColor: theme.border.primary,
                }}
              ></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div
              className="lg:col-span-2 h-96 rounded-xl border"
              style={{
                backgroundColor: theme.bg.tertiary,
                borderColor: theme.border.primary,
              }}
            ></div>
            <div
              className="h-96 rounded-xl border"
              style={{
                backgroundColor: theme.bg.tertiary,
                borderColor: theme.border.primary,
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 w-full"
      style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}
    >
      {/* QUICK PLAY HERO CARD */}
      <div
        className="relative rounded-xl p-8 md:p-12 overflow-hidden border shadow-lg"
        style={{
          backgroundColor: theme.bg.tertiary,
          borderColor: theme.border.primary,
        }}
      >
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
          <h1
            className="text-4xl md:text-5xl font-bold mb-8 font-['Montserrat']"
            style={{ color: theme.text.primary }}
          >
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
              className="font-medium py-3 px-6 rounded-lg transition-colors border shadow-sm font-['Inter']"
              style={{
                backgroundColor: theme.bg.secondary,
                color: theme.text.primary,
                borderColor: theme.border.primary,
              }}
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
                  selectedTimeControl === control.id ? "text-[#0e0e0e]" : ""
                }`}
                style={{
                  backgroundColor:
                    selectedTimeControl === control.id
                      ? theme.primary
                      : theme.bg.secondary,
                  color:
                    selectedTimeControl === control.id
                      ? "#0e0e0e"
                      : theme.text.secondary,
                }}
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
        <h2
          className="text-2xl font-bold mb-6 font-['Montserrat']"
          style={{ color: theme.text.primary }}
        >
          Quick Play
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Play vs AI */}
          <div
            className="rounded-xl p-6 border hover:border-[#81b64c] transition-colors cursor-pointer group shadow-md"
            style={{
              backgroundColor: theme.bg.tertiary,
              borderColor: theme.border.primary,
            }}
            onClick={() => onStartGame("ai", selectedTimeControl)}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">🤖</div>
              <h3
                className="text-xl font-bold mb-3 group-hover:text-[#81b64c] transition-colors font-['Montserrat']"
                style={{ color: theme.text.primary }}
              >
                Play vs AI
              </h3>
              <p
                className="text-sm mb-4 font-['Inter']"
                style={{ color: theme.text.tertiary }}
              >
                Challenge Stockfish with adjustable difficulty
              </p>
              <button className="w-full bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] font-bold py-3 px-4 rounded-lg transition-colors font-['Montserrat']">
                Play Now
              </button>
            </div>
          </div>

          {/* Multiplayer */}
          <div
            className="rounded-xl p-6 border hover:border-[#81b64c] transition-colors cursor-pointer group shadow-md"
            style={{
              backgroundColor: theme.bg.tertiary,
              borderColor: theme.border.primary,
            }}
            onClick={() => onStartGame("multi")}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">👥</div>
              <h3
                className="text-xl font-bold mb-3 group-hover:text-[#81b64c] transition-colors font-['Montserrat']"
                style={{ color: theme.text.primary }}
              >
                Multiplayer
              </h3>
              <p
                className="text-sm mb-4 font-['Inter']"
                style={{ color: theme.text.tertiary }}
              >
                Real-time games with other players
              </p>
              <button className="w-full bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] font-bold py-3 px-4 rounded-lg transition-colors font-['Montserrat']">
                Find Game
              </button>
            </div>
          </div>

          {/* Game History */}
          <div
            className="rounded-xl p-6 border hover:border-[#81b64c] transition-colors cursor-pointer group shadow-md"
            style={{
              backgroundColor: theme.bg.tertiary,
              borderColor: theme.border.primary,
            }}
            onClick={() => onNavigate("history")}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">📜</div>
              <h3
                className="text-xl font-bold mb-3 group-hover:text-[#81b64c] transition-colors font-['Montserrat']"
                style={{ color: theme.text.primary }}
              >
                Game History
              </h3>
              <p
                className="text-sm mb-4 font-['Inter']"
                style={{ color: theme.text.tertiary }}
              >
                Review and replay your past games
              </p>
              <button className="w-full bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] font-bold py-3 px-4 rounded-lg transition-colors font-['Montserrat']">
                View Games
              </button>
            </div>
          </div>

          {/* Leaderboard */}
          <div
            className="rounded-xl p-6 border hover:border-[#81b64c] transition-colors cursor-pointer group shadow-md"
            style={{
              backgroundColor: theme.bg.tertiary,
              borderColor: theme.border.primary,
            }}
            onClick={() => onNavigate("leaderboard")}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">🏆</div>
              <h3
                className="text-xl font-bold mb-3 group-hover:text-[#81b64c] transition-colors font-['Montserrat']"
                style={{ color: theme.text.primary }}
              >
                Leaderboard
              </h3>
              <p
                className="text-sm mb-4 font-['Inter']"
                style={{ color: theme.text.tertiary }}
              >
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
            <h2
              className="text-xl font-bold font-['Montserrat']"
              style={{ color: theme.text.primary }}
            >
              Recent Games
            </h2>
            <button
              onClick={() => onNavigate("history")}
              className="text-sm font-medium font-['Inter']"
              style={{ color: theme.primary }}
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
        <div
          className="rounded-xl border overflow-hidden shadow-lg"
          style={{
            backgroundColor: theme.bg.secondary,
            borderColor: theme.border.primary,
          }}
        >
          <div
            className="p-6 border-b"
            style={{ borderColor: theme.border.primary }}
          >
            <h2
              className="text-xl font-bold font-['Montserrat']"
              style={{ color: theme.text.primary }}
            >
              Leaderboard
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {leaderboard.map((player, index) => (
              <div
                key={player._id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors`}
                style={{
                  backgroundColor:
                    player._id === user.id ? theme.active : "transparent",
                  border:
                    player._id === user.id
                      ? `1px solid ${theme.primary}30`
                      : "none",
                }}
                onMouseEnter={(e) => {
                  if (player._id !== user.id) {
                    e.currentTarget.style.backgroundColor = theme.hover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (player._id !== user.id) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <div className="flex items-center">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-full text-[#c2c1c0] font-bold text-sm mr-3"
                    style={{ backgroundColor: theme.bg.tertiary }}
                  >
                    {index + 1}
                  </div>
                  <div className="w-8 h-8 bg-[#81b64c] rounded-full flex items-center justify-center text-[#0e0e0e] font-bold text-sm mr-3">
                    {(player.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`font-medium font-['Inter']`}
                    style={{
                      color:
                        player._id === user.id
                          ? theme.primary
                          : theme.text.primary,
                    }}
                  >
                    {player.username || "Unknown"}
                  </span>
                </div>
                <span
                  className={`font-bold font-['Montserrat']`}
                  style={{
                    color:
                      player._id === user.id
                        ? theme.primary
                        : theme.text.primary,
                  }}
                >
                  {player.rating}
                </span>
              </div>
            ))}
          </div>

          <div
            className="p-4 border-t text-center"
            style={{ borderColor: theme.border.primary }}
          >
            <button
              onClick={() => onNavigate("leaderboard")}
              className="text-sm font-medium font-['Inter']"
              style={{ color: theme.primary }}
            >
              View full leaderboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
