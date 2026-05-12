import { useState, useEffect, useCallback } from "react";
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

  const fetchWithAuth = useCallback(async (url) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      return await apiClient(url, { signal: controller.signal });
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Dashboard request timed out. Please check backend URL.");
      }
      if (error.status === 401 || error.status === 403) {
        if (typeof onAuthError === "function") onAuthError();
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }, [onAuthError]);

  const timeControls = [
    { id: "1+0", label: "1+0 Bullet", icon: "⚡" },
    { id: "3+0", label: "3+0 Blitz", icon: "🚀" },
    { id: "5+3", label: "5+3 Blitz", icon: "🏃" },
    { id: "10+0", label: "10+0 Rapid", icon: "⏱️" },
    { id: "30+0", label: "30+0 Classical", icon: "👑" },
  ];

  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (user.isGuest) {
      setStats(user);
      setRecentGames([]);
      setLeaderboard([]);
      setLoading(false);
      return;
    }

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
  }, [fetchWithAuth, user]);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const userId = user.id || user._id;
  const wins = stats?.wins || stats?.gamesWon || 0;
  const losses = stats?.losses || Math.max((stats?.gamesPlayed || 0) - wins, 0);
  const gamesPlayed = stats?.gamesPlayed || 0;
  const winRate = Math.round((wins / Math.max(gamesPlayed, 1)) * 100);
  const rating = stats?.rating || user?.rating || 1200;
  const displayName = stats?.username || user?.username || "Player";

  const statCards = [
    { label: "Rating", value: rating, accent: "#81b64c" },
    { label: "Win Rate", value: `${winRate}%`, accent: "#38bdf8" },
    { label: "Games", value: gamesPlayed, accent: "#f59e0b" },
    { label: "Record", value: `${wins}-${losses}`, accent: "#f472b6" },
  ];

  const modeCards = [
    {
      id: "ai",
      title: "Play AI",
      meta: `Stockfish · ${selectedTimeControl}`,
      accent: "#81b64c",
      action: () => onStartGame("ai", selectedTimeControl),
      button: "Start",
    },
    {
      id: "multi",
      title: "Play Online",
      meta: user?.isGuest ? "Login required for live rooms" : "Live room matchmaking",
      accent: "#38bdf8",
      action: () => user?.isGuest ? onNavigate("settings") : onStartGame("multi", selectedTimeControl),
      button: user?.isGuest ? "Login Required" : "Find Game",
    },
    {
      id: "local",
      title: "Play vs Player",
      meta: "Offline pass-and-play",
      accent: "#a78bfa",
      action: () => onNavigate("local"),
      button: "Start Local",
    },
    {
      id: "lan",
      title: "Same WiFi",
      meta: "LAN setup guide",
      accent: "#22c55e",
      action: () => onNavigate("lan"),
      button: "Open LAN",
    },
    {
      id: "puzzles",
      title: "Puzzles",
      meta: "Tactics training",
      accent: "#f59e0b",
      action: () => onNavigate("puzzles"),
      button: "Open",
    },
    {
      id: "analysis",
      title: "Analysis",
      meta: "Review lines",
      accent: "#f472b6",
      action: () => onNavigate("analysis"),
      button: "Analyze",
    },
  ];

  return (
    <div
      className="relative w-full max-w-7xl mx-auto p-4 md:p-6 xl:p-8 space-y-6"
      style={{ color: theme.text.primary }}
    >
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl md:p-7">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(45deg, rgba(129,182,76,.22) 25%, transparent 25%, transparent 75%, rgba(129,182,76,.22) 75%), linear-gradient(45deg, rgba(56,189,248,.16) 25%, transparent 25%, transparent 75%, rgba(56,189,248,.16) 75%)",
              backgroundPosition: "0 0, 18px 18px",
              backgroundSize: "36px 36px",
            }}
          />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#81b64c]">
                v1.1.0-beta
              </div>
              <h1 className="font-['Montserrat'] text-3xl font-black tracking-normal text-white md:text-5xl">
                {displayName}'s Chess Hub
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Rating {rating} · {gamesPlayed} games · {winRate}% win rate
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {timeControls.map((control) => (
                  <button
                    key={control.id}
                    type="button"
                    onClick={() => setSelectedTimeControl(control.id)}
                    className={`rounded-full border px-3 py-2 text-sm font-bold transition-all hover:-translate-y-0.5 ${
                      selectedTimeControl === control.id
                        ? "border-[#81b64c] bg-[#81b64c] text-[#07100a]"
                        : "border-white/10 bg-white/10 text-slate-300 hover:bg-white/15"
                    }`}
                  >
                    {control.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={handleQuickPlay}
                className="rounded-xl bg-[#81b64c] px-5 py-4 text-left font-['Montserrat'] text-lg font-black text-[#07100a] shadow-lg shadow-[#81b64c]/20 transition-all hover:-translate-y-1 hover:bg-[#93c85f]"
              >
                Play AI
              </button>
              <button
                type="button"
                onClick={() => user?.isGuest ? onNavigate("settings") : onStartGame("multi", selectedTimeControl)}
                className="rounded-xl border border-white/10 bg-white/10 px-5 py-4 text-left font-bold text-white transition-all hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-300/10"
              >
                {user?.isGuest ? "Login for Online" : "Play Online"}
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-['Montserrat'] text-lg font-black text-white">
                Control Room
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {selectedTimeControl} selected
              </p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#81b64c] font-black text-[#07100a]">
              {String(displayName).charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate("analysis")}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              Analysis
            </button>
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              Settings
            </button>
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Top Table
            </div>
            <div className="space-y-2">
              {leaderboard.slice(0, 4).map((player, index) => (
                <button
                  key={player._id || player.username || index}
                  type="button"
                  onClick={() => onNavigate("leaderboard")}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-white/10"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-xs font-black text-slate-300">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-bold text-slate-100">
                      {player.username || "Unknown"}
                    </span>
                  </span>
                  <span className="text-sm font-black text-[#81b64c]">
                    {player.rating || 1200}
                  </span>
                </button>
              ))}
              {leaderboard.length === 0 && (
                <div className="rounded-lg bg-white/5 px-3 py-4 text-sm text-slate-400">
                  Leaderboard is empty.
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-white/10 p-4 shadow-lg shadow-black/10 backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white/15"
          >
            <div
              className="mb-4 h-1.5 w-12 rounded-full"
              style={{ backgroundColor: card.accent }}
            />
            <div className="font-['Montserrat'] text-2xl font-black text-white">
              {card.value}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-400">
              {card.label}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {modeCards.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={mode.action}
                className="group rounded-xl border border-white/10 bg-white/10 p-4 text-left shadow-lg shadow-black/10 backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white/15"
              >
                <div
                  className="mb-4 grid h-10 w-10 place-items-center rounded-lg text-lg font-black text-[#07100a]"
                  style={{ backgroundColor: mode.accent }}
                >
                  {mode.title.charAt(0)}
                </div>
                <h3 className="font-['Montserrat'] text-lg font-black text-white">
                  {mode.title}
                </h3>
                <div className="mt-1 text-sm text-slate-400">{mode.meta}</div>
                <div
                  className="mt-4 text-sm font-black transition group-hover:translate-x-1"
                  style={{ color: mode.accent }}
                >
                  {mode.button}
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 shadow-xl shadow-black/10 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="font-['Montserrat'] text-lg font-black text-white">
                Recent Games
              </h2>
              <button
                type="button"
                onClick={() => onNavigate("history")}
                className="text-sm font-bold text-[#81b64c]"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-white/10">
              {recentGames.slice(0, 5).map((game) => {
                const opponent = getOpponent(game, userId);
                const result = formatResult(game, userId);
                return (
                  <button
                    key={game._id}
                    type="button"
                    onClick={() => onNavigate("history")}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 text-left transition hover:bg-white/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-slate-100">
                        {opponent.username}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {game.aiOpponent ? "AI" : "Online"} ·{" "}
                        {game.moves?.length || 0} moves ·{" "}
                        {new Date(game.endTime || game.startTime).toLocaleDateString()}
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        result === "Win"
                          ? "bg-emerald-400/15 text-emerald-300"
                          : result === "Draw"
                            ? "bg-amber-400/15 text-amber-300"
                            : "bg-rose-400/15 text-rose-300"
                      }`}
                    >
                      {result}
                    </span>
                  </button>
                );
              })}
              {recentGames.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-slate-400">
                  No recent games yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
            <h2 className="font-['Montserrat'] text-lg font-black text-white">
              Session Setup
            </h2>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handlePlayVsComputer}
                className="w-full rounded-lg bg-[#81b64c] px-4 py-3 text-left font-black text-[#07100a] transition hover:bg-[#93c85f]"
              >
                Start vs Computer
              </button>
              <button
                type="button"
                onClick={() => onNavigate("history")}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-left font-bold text-slate-200 transition hover:bg-white/10"
              >
                Game History
              </button>
              <button
                type="button"
                onClick={() => onNavigate("leaderboard")}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-left font-bold text-slate-200 transition hover:bg-white/10"
              >
                Leaderboard
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Player
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#81b64c] to-cyan-300 font-black text-[#07100a]">
                {String(displayName).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate font-black text-white">{displayName}</div>
                <div className="text-sm text-slate-400">{rating} ELO</div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <div className="fixed bottom-5 right-5 z-20 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onStartGame("ai", selectedTimeControl)}
          className="grid h-12 w-12 place-items-center rounded-full bg-[#81b64c] font-black text-[#07100a] shadow-2xl shadow-[#81b64c]/25 transition hover:-translate-y-1"
          aria-label="Start AI game"
        >
          AI
        </button>
        <button
          type="button"
          onClick={() => onStartGame("multi", selectedTimeControl)}
          className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-slate-950/80 font-black text-cyan-200 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-1"
          aria-label="Start online game"
        >
          ON
        </button>
      </div>
    </div>
  );
}
