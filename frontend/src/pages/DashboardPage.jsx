import { useState, useEffect, useCallback, useMemo } from "react";
import { BACKEND_URL } from "../config/runtime";
import { apiClient } from "../services/apiClient";
import { useTheme } from "../hooks/useTheme";
import PlanBadge from "../components/billing/PlanBadge";
import UpgradeModal from "../components/billing/UpgradeModal";

const timeControls = [
  { id: "1+0", label: "1+0 Bullet" },
  { id: "3+0", label: "3+0 Blitz" },
  { id: "5+3", label: "5+3 Blitz" },
  { id: "10+0", label: "10+0 Rapid" },
  { id: "30+0", label: "30+0 Classical" },
];

function normalizeList(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getUserId(user) {
  return String(user?.id || user?._id || "");
}

function getGameResult(game, userId) {
  const result = String(game?.result || game?.status || "").toLowerCase();
  if (result === "draw" || game?.isDraw) return "Draw";
  const winnerId = String(game?.winner?._id || game?.winner || "");
  if (winnerId && winnerId === userId) return "Win";
  if (game?.winner) return "Loss";
  if (result === "completed") return "Completed";
  if (result === "active") return "Active";
  if (result === "abandoned") return "Abandoned";
  return "Recorded";
}

function getOpponent(game, userId) {
  if (game?.aiOpponent) return `Stockfish Lv${game.aiDifficulty || 10}`;
  const white = game?.whitePlayer || game?.white;
  const black = game?.blackPlayer || game?.black;
  const whiteId = String(white?._id || white?.id || white || "");
  const blackName = black?.username || "Black";
  const whiteName = white?.username || "White";
  if (whiteId && whiteId === userId) return blackName;
  return whiteName;
}

function DashboardSkeleton({ theme }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 xl:p-8" aria-label="Loading dashboard">
      <div className="animate-pulse space-y-6">
        <div className="h-72 rounded-2xl border" style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.primary }} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {["a", "b", "c", "d"].map((item) => (
            <div key={item} className="h-28 rounded-2xl border" style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.primary }} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-80 rounded-2xl border" style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.primary }} />
          <div className="h-80 rounded-2xl border" style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.primary }} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-xl" aria-hidden="true">♙</div>
      <h3 className="font-['Montserrat'] text-base font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-4 rounded-lg bg-[#81b64c] px-4 py-2 text-sm font-black text-[#07100a] transition hover:bg-[#93c85f]">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-white/10 bg-[#111827] p-4 text-sm text-white shadow-2xl" role={isError ? "alert" : "status"}>
      <div className="flex items-start gap-3">
        <span className={isError ? "text-red-300" : "text-[#81b64c]"}>{isError ? "⚠" : "✓"}</span>
        <p className="leading-6">{toast.message}</p>
        <button type="button" onClick={onClose} className="ml-2 text-slate-400 hover:text-white" aria-label="Close message">×</button>
      </div>
    </div>
  );
}

export default function Dashboard({ user, onStartGame, onNavigate, onAuthError }) {
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState(null);
  const [selectedTimeControl, setSelectedTimeControl] = useState(() => localStorage.getItem("selectedTimeControl") || "3+0");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const showDebugStatus = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("debug") === "true" || localStorage.getItem("chessplay-debug") === "true";
  }, []);

  const userId = getUserId(user);
  const isGuest = Boolean(user?.isGuest);

  const fetchWithTimeout = useCallback(async (endpoint, options = {}) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 9000);
    try {
      return await apiClient(endpoint, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setErrorMessage("");

    if (isGuest) {
      setStats(user);
      setRecentGames([]);
      try {
        const publicBoard = await fetchWithTimeout("/api/games/leaderboard?limit=5", { skipAuthRefresh: true });
        setLeaderboard(normalizeList(publicBoard, "leaderboard"));
      } catch {
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const [profileResult, historyResult, leaderboardResult] = await Promise.allSettled([
        fetchWithTimeout("/api/auth/profile"),
        fetchWithTimeout("/api/games/history?page=1&limit=5"),
        fetchWithTimeout("/api/games/leaderboard?limit=5", { skipAuthRefresh: true }),
      ]);

      if (profileResult.status === "fulfilled") {
        setStats(profileResult.value.user || profileResult.value.profile || null);
      } else if (profileResult.reason?.status === 401 || profileResult.reason?.status === 403) {
        onAuthError?.();
        return;
      } else {
        setStats(user);
      }

      if (historyResult.status === "fulfilled") {
        setRecentGames(normalizeList(historyResult.value, "games"));
      } else if (historyResult.reason?.status === 401 || historyResult.reason?.status === 403) {
        setRecentGames([]);
      }

      if (leaderboardResult.status === "fulfilled") {
        setLeaderboard(normalizeList(leaderboardResult.value, "leaderboard"));
      } else {
        setLeaderboard([]);
      }

      const failedCritical = [profileResult, historyResult].some((result) => result.status === "rejected" && ![401, 403, 404].includes(result.reason?.status));
      if (failedCritical) {
        setErrorMessage("Some dashboard data could not be loaded. You can still play and retry the dashboard data.");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        setErrorMessage("Dashboard request timed out. Please check your connection and try again.");
      } else if (error?.status === 401 || error?.status === 403) {
        onAuthError?.();
      } else {
        setErrorMessage("Unable to load dashboard data. Please try again.");
      }
      setStats(user);
      setRecentGames([]);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [fetchWithTimeout, isGuest, onAuthError, user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!showDebugStatus) return undefined;
    const controller = new AbortController();
    fetch(`${BACKEND_URL}/healthz`, { signal: controller.signal })
      .then((response) => setBackendStatus(response.ok ? "connected" : `http-${response.status}`))
      .catch(() => setBackendStatus("offline"));
    return () => controller.abort();
  }, [showDebugStatus]);

  const safeStats = stats || user || {};
  const displayName = safeStats.username || user?.username || "Player";
  const rating = safeStats.rating || user?.rating || 1200;
  const gamesPlayed = safeStats.gamesPlayed || 0;
  const wins = safeStats.gamesWon || safeStats.wins || 0;
  const losses = safeStats.gamesLost || 0;
  const draws = safeStats.gamesDrawn || 0;
  const winRate = Math.round((wins / Math.max(gamesPlayed, 1)) * 100);
  const isAdmin = Boolean(user?.isAdmin || safeStats.isAdmin);
  const badges = [
    isAdmin && "Admin",
    (user?.isSupporter || user?.isPremium || safeStats.isSupporter || safeStats.isPremium) && "Supporter",
    safeStats.emailVerified && "Verified",
    gamesPlayed >= 1 && "First game",
    wins >= 1 && "Winner",
  ].filter(Boolean);

  const statCards = [
    { label: "Games Played", value: gamesPlayed, accent: "#81b64c" },
    { label: "Wins", value: wins, accent: "#38bdf8" },
    { label: "Losses", value: losses, accent: "#f59e0b" },
    { label: "Draws", value: draws, accent: "#f472b6" },
    { label: "Current Rating", value: rating, accent: "#a78bfa" },
    { label: "Win Rate", value: `${winRate}%`, accent: "#22c55e" },
  ];

  const setTimeControl = (value) => {
    setSelectedTimeControl(value);
    localStorage.setItem("selectedTimeControl", value);
  };

  const startGame = (type) => {
    localStorage.setItem("selectedTimeControl", selectedTimeControl);
    onStartGame?.(type, selectedTimeControl);
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin} — join me on ChessPlay`);
      setInviteCopied(true);
      setToast({ type: "success", message: "Invite link copied." });
      window.setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      setToast({ type: "error", message: "Unable to copy invite. Please copy the site link manually." });
    }
  };

  if (!user) {
    return <DashboardSkeleton theme={theme} />;
  }

  if (loading) {
    return <DashboardSkeleton theme={theme} />;
  }

  return (
    <div className="relative mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 xl:p-8" style={{ color: theme.text.primary }}>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onNavigate={onNavigate} />

      {errorMessage && (
        <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100" role="alert">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{errorMessage}</span>
            <button type="button" onClick={loadDashboard} className="rounded-lg bg-amber-200 px-3 py-2 font-bold text-amber-950">
              Retry
            </button>
          </div>
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl md:p-7">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(45deg, rgba(129,182,76,.22) 25%, transparent 25%, transparent 75%, rgba(129,182,76,.22) 75%), linear-gradient(45deg, rgba(56,189,248,.16) 25%, transparent 25%, transparent 75%, rgba(56,189,248,.16) 75%)", backgroundPosition: "0 0, 18px 18px", backgroundSize: "36px 36px" }} aria-hidden="true" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#81b64c]">Player Dashboard</span>
                <PlanBadge user={user} />
                {badges.map((badge) => (
                  <span key={badge} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">{badge}</span>
                ))}
              </div>
              <h1 className="font-['Montserrat'] text-3xl font-black tracking-normal text-white md:text-5xl">
                Welcome back, {displayName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Rating {rating} · {gamesPlayed} games · {winRate}% win rate. Choose a time control and start your next game.
              </p>
              {showDebugStatus && (
                <div className="mt-3 inline-flex rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs font-bold text-slate-300">
                  Backend {backendStatus || "checking"} · {BACKEND_URL}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-2" aria-label="Select time control">
                {timeControls.map((control) => (
                  <button key={control.id} type="button" onClick={() => setTimeControl(control.id)} className={`rounded-full border px-3 py-2 text-sm font-bold transition-all hover:-translate-y-0.5 ${selectedTimeControl === control.id ? "border-[#81b64c] bg-[#81b64c] text-[#07100a]" : "border-white/10 bg-white/10 text-slate-300 hover:bg-white/15"}`} aria-pressed={selectedTimeControl === control.id}>
                    {control.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              <button type="button" onClick={() => startGame("ai")} className="rounded-xl bg-[#81b64c] px-5 py-4 text-left font-['Montserrat'] text-lg font-black text-[#07100a] shadow-lg shadow-[#81b64c]/20 transition-all hover:-translate-y-1 hover:bg-[#93c85f]" aria-label="Play against AI">
                Play vs AI
                <span className="block text-xs font-semibold opacity-80">Stockfish · {selectedTimeControl}</span>
              </button>
              <button type="button" onClick={() => (isGuest ? onNavigate?.("settings") : startGame("multi"))} className="rounded-xl border border-white/10 bg-white/10 px-5 py-4 text-left font-bold text-white transition-all hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-300/10" aria-label="Play online multiplayer">
                {isGuest ? "Login for Online" : "Play Online"}
                <span className="block text-xs font-semibold text-slate-400">Real-time multiplayer rooms</span>
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-['Montserrat'] text-lg font-black text-white">Profile Summary</h2>
              <p className="mt-1 text-xs text-slate-400">{safeStats.email || "Secure ChessPlay account"}</p>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#81b64c] font-black text-[#07100a]" aria-hidden="true">
              {String(displayName).charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onNavigate?.("profile")} className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10">View Profile</button>
            <button type="button" onClick={() => onNavigate?.("history")} className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10">Game History</button>
            <button type="button" onClick={copyInvite} className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10">{inviteCopied ? "Copied" : "Invite"}</button>
            <button type="button" onClick={() => onNavigate?.("leaderboard")} className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10">Leaderboard</button>
            {isAdmin && (
              <button type="button" onClick={() => onNavigate?.("admin")} className="col-span-2 rounded-lg border border-[#81b64c]/40 bg-[#81b64c]/15 px-3 py-3 text-left text-sm font-black text-[#dcf8c6] transition hover:bg-[#81b64c]/20">Open Admin Panel</button>
            )}
            <button type="button" onClick={() => setShowUpgradeModal(true)} className="col-span-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-3 text-left text-sm font-black text-amber-100 transition hover:bg-amber-300/15">Support ChessPlay</button>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6" aria-label="Dashboard statistics">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg shadow-black/10 backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white/15">
            <div className="mb-4 h-1.5 w-12 rounded-full" style={{ backgroundColor: card.accent }} />
            <div className="font-['Montserrat'] text-2xl font-black text-white">{card.value}</div>
            <div className="mt-1 text-sm font-semibold text-slate-400">{card.label}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-['Montserrat'] text-xl font-black text-white">Quick Actions</h2>
                <p className="mt-1 text-sm text-slate-400">Every visible action is connected to a real route.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { title: "Play vs AI", meta: "Practice instantly", action: () => startGame("ai"), accent: "#81b64c" },
                { title: "Play Online", meta: isGuest ? "Login required" : "Live rooms", action: () => (isGuest ? onNavigate?.("settings") : startGame("multi")), accent: "#38bdf8" },
                { title: "View Profile", meta: "Account and rating", action: () => onNavigate?.("profile"), accent: "#a78bfa" },
                { title: "Game History", meta: "Recent results", action: () => onNavigate?.("history"), accent: "#f59e0b" },
              ].map((item) => (
                <button key={item.title} type="button" onClick={item.action} className="group rounded-xl border border-white/10 bg-black/20 p-4 text-left transition-all hover:-translate-y-1 hover:bg-white/10">
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg text-lg font-black text-[#07100a]" style={{ backgroundColor: item.accent }}>{item.title.charAt(0)}</div>
                  <h3 className="font-['Montserrat'] text-base font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{item.meta}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-['Montserrat'] text-xl font-black text-white">Recent Games</h2>
                <p className="mt-1 text-sm text-slate-400">Your latest completed and active games.</p>
              </div>
              <button type="button" onClick={() => onNavigate?.("history")} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10">View all</button>
            </div>
            {recentGames.length === 0 ? (
              <EmptyState title="No games yet" message="Start your first match to build your game history and rating profile." actionLabel="Play vs AI" onAction={() => startGame("ai")} />
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <div className="hidden grid-cols-[1fr_120px_120px_100px] gap-3 bg-black/30 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 md:grid">
                  <span>Opponent</span><span>Result</span><span>Mode</span><span>Date</span>
                </div>
                <div className="divide-y divide-white/10">
                  {recentGames.map((game) => {
                    const result = getGameResult(game, userId);
                    return (
                      <button key={game._id || game.id || `${game.createdAt}-${game.result}`} type="button" onClick={() => onNavigate?.("history")} className="grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/5 md:grid-cols-[1fr_120px_120px_100px] md:items-center">
                        <div className="min-w-0">
                          <div className="truncate font-bold text-white">vs {getOpponent(game, userId)}</div>
                          <div className="text-xs text-slate-500 md:hidden">{game.aiOpponent ? "AI" : "Online"} · {formatDate(game.createdAt)}</div>
                        </div>
                        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-black ${result === "Win" ? "bg-[#81b64c]/20 text-[#b9f28f]" : result === "Loss" ? "bg-red-500/15 text-red-200" : "bg-white/10 text-slate-200"}`}>{result}</span>
                        <span className="hidden text-sm text-slate-300 md:block">{game.aiOpponent ? "AI" : "Online"}</span>
                        <span className="hidden text-sm text-slate-400 md:block">{formatDate(game.createdAt)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-['Montserrat'] text-xl font-black text-white">Leaderboard</h2>
                <p className="mt-1 text-sm text-slate-400">Top active players.</p>
              </div>
              <button type="button" onClick={() => onNavigate?.("leaderboard")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">Open</button>
            </div>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((player, index) => (
                <button key={player._id || player.id || player.username || index} type="button" onClick={() => onNavigate?.("leaderboard")} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-white/10">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-xs font-black text-slate-300">{index + 1}</span>
                    <span className="truncate text-sm font-bold text-slate-100">{player.username || "Player"}</span>
                  </span>
                  <span className="text-sm font-black text-[#81b64c]">{player.rating || 1200}</span>
                </button>
              ))}
              {leaderboard.length === 0 && <EmptyState title="No leaderboard yet" message="Leaderboard appears after players complete ranked games." />}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <h2 className="font-['Montserrat'] text-xl font-black text-white">Recent Activity</h2>
            <div className="mt-4 space-y-3">
              {recentGames.slice(0, 3).map((game) => (
                <div key={`activity-${game._id || game.id || game.createdAt}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-sm font-bold text-white">{getGameResult(game, userId)} against {getOpponent(game, userId)}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDate(game.createdAt)}</div>
                </div>
              ))}
              {recentGames.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">No recent activity yet. Play a game to see updates here.</div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
