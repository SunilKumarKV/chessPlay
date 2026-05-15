import { useCallback, useEffect, useState } from "react";
import { BACKEND_URL } from "../config/runtime";
import { useTheme } from "../hooks/useTheme";
import { getBadgeLabel } from "../config/customization";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "rating", label: "Rating" },
  { id: "wins", label: "Wins" },
  { id: "gamesPlayed", label: "Games Played" },
];

function safeNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function winRate(player) {
  const games = safeNumber(player.gamesPlayed);
  if (!games) return "—";
  return `${Math.round((safeNumber(player.wins) / games) * 100)}%`;
}

function rankMedal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function SupporterBadge() {
  return (
    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-200">
      Supporter
    </span>
  );
}

function PlayerStatus({ player }) {
  if (player.selectedBadge) return <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-200">{getBadgeLabel(player.selectedBadge)}</span>;
  if (player.isSupporter) return <SupporterBadge />;
  if (safeNumber(player.gamesPlayed) === 0) {
    return <span className="rounded-full bg-slate-700/70 px-2 py-0.5 text-[11px] font-bold text-slate-300">New Player</span>;
  }
  return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-200">Active Player</span>;
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-label="Loading leaderboard">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/[0.06]" />
      ))}
    </div>
  );
}

export default function Leaderboard({ user, onBack, onNavigate }) {
  const { theme } = useTheme();
  const [leaderboard, setLeaderboard] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadLeaderboard = useCallback(async () => {
    const params = new URLSearchParams({ limit: "50", mode: filter });
    if (search.trim()) params.set("search", search.trim());

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${BACKEND_URL}/api/games/leaderboard?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to load leaderboard. Please try again.");
      }
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
    } catch (err) {
      setError(err.message || "Unable to reach server. Please try again.");
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = window.setTimeout(loadLeaderboard, 200);
    return () => window.clearTimeout(timer);
  }, [loadLeaderboard, refreshKey]);

  const podium = leaderboard.slice(0, 3);
  const currentUsername = user?.username || "";
  const currentUserRank = currentUsername
    ? leaderboard.find((player) => player.username === currentUsername) || null
    : null;

  const pageTitle = "Leaderboard";

  return (
    <div className="min-h-screen bg-[#050806] text-white" style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}>
      <header className="border-b border-white/10 bg-black/20 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 rounded-lg text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-[#81b64c]"
            >
              ← Back
            </button>
            <h1 className="font-['Montserrat'] text-3xl font-black text-white sm:text-4xl">{pageTitle}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              See top ChessPlay players based on real game activity. Supporter status adds a badge only and never affects ranking.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate?.("multi")} className="rounded-xl bg-[#81b64c] px-4 py-2 text-sm font-black text-[#07100d] transition hover:bg-[#93c85f]">
              Play Online
            </button>
            <button type="button" onClick={() => onNavigate?.("ai")} className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10">
              Play vs AI
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <section className="grid gap-4 md:grid-cols-3" aria-label="Top players podium">
          {podium.length > 0 ? podium.map((player) => (
            <article key={player.username} className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <span className="text-3xl" aria-label={`Rank ${player.rank}`}>{rankMedal(player.rank)}</span>
                <PlayerStatus player={player} />
              </div>
              <h2 className="mt-4 truncate text-xl font-black text-white">{player.username}</h2>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-2xl bg-black/20 p-3"><b>{player.rating || "Unrated"}</b><span className="block text-xs text-slate-400">Rating</span></div>
                <div className="rounded-2xl bg-black/20 p-3"><b>{safeNumber(player.wins)}</b><span className="block text-xs text-slate-400">Wins</span></div>
                <div className="rounded-2xl bg-black/20 p-3"><b>{safeNumber(player.gamesPlayed)}</b><span className="block text-xs text-slate-400">Games</span></div>
              </div>
            </article>
          )) : (
            <div className="md:col-span-3 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-slate-300">
              Top players will appear after completed games are recorded.
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/20">
            <div className="border-b border-white/10 p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Player rankings</h2>
                  <p className="mt-1 text-sm text-slate-400">Public read-only leaderboard. No login required.</p>
                </div>
                <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10">
                  Refresh
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="sr-only" htmlFor="leaderboard-search">Search by username</label>
                <input
                  id="leaderboard-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by username"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/20"
                />
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Leaderboard filters">
                  {FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFilter(item.id)}
                      className={`rounded-xl px-3 py-2 text-xs font-black transition ${filter === item.id ? "bg-[#81b64c] text-[#07100d]" : "border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/10"}`}
                      aria-pressed={filter === item.id}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <LeaderboardSkeleton />
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-sm font-bold text-red-300">{error}</p>
                <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="mt-4 rounded-xl bg-[#81b64c] px-4 py-2 text-sm font-black text-[#07100d]">
                  Try again
                </button>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-300">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.06] text-2xl">🏆</div>
                <h3 className="text-lg font-black text-white">No leaderboard data yet.</h3>
                <p className="mt-2 text-sm text-slate-400">Play completed games to start building real rankings.</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm" aria-label="ChessPlay leaderboard table">
                    <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th scope="col" className="px-5 py-3">Rank</th>
                        <th scope="col" className="px-5 py-3">Player</th>
                        <th scope="col" className="px-5 py-3 text-center">Rating</th>
                        <th scope="col" className="px-5 py-3 text-center">Wins</th>
                        <th scope="col" className="px-5 py-3 text-center">Losses</th>
                        <th scope="col" className="px-5 py-3 text-center">Draws</th>
                        <th scope="col" className="px-5 py-3 text-center">Games</th>
                        <th scope="col" className="px-5 py-3 text-center">Win rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((player) => {
                        const isCurrent = user?.username === player.username;
                        return (
                          <tr key={player.username} className={`border-t border-white/10 ${isCurrent ? "bg-[#81b64c]/10" : "hover:bg-white/[0.03]"}`}>
                            <td className="px-5 py-4 font-black text-white">{rankMedal(player.rank)}</td>
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-white">{player.username}</span>
                                {isCurrent ? <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[11px] font-bold text-sky-200">You</span> : null}
                                <PlayerStatus player={player} />
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center font-bold text-purple-200">{player.rating || "Unrated"}</td>
                            <td className="px-5 py-4 text-center font-bold text-emerald-200">{safeNumber(player.wins)}</td>
                            <td className="px-5 py-4 text-center text-slate-300">{safeNumber(player.losses)}</td>
                            <td className="px-5 py-4 text-center text-slate-300">{safeNumber(player.draws)}</td>
                            <td className="px-5 py-4 text-center text-slate-300">{safeNumber(player.gamesPlayed)}</td>
                            <td className="px-5 py-4 text-center text-slate-300">{winRate(player)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 p-4 md:hidden">
                  {leaderboard.map((player) => {
                    const isCurrent = user?.username === player.username;
                    return (
                      <article key={player.username} className={`rounded-2xl border border-white/10 p-4 ${isCurrent ? "bg-[#81b64c]/10" : "bg-black/20"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-black text-white">{rankMedal(player.rank)} {player.username}</div>
                            <div className="mt-2 flex flex-wrap gap-2">{isCurrent ? <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[11px] font-bold text-sky-200">You</span> : null}<PlayerStatus player={player} /></div>
                          </div>
                          <div className="text-right text-sm text-slate-300">{player.rating || "Unrated"}<span className="block text-xs text-slate-500">Rating</span></div>
                        </div>
                        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-slate-400">
                          <div className="rounded-xl bg-white/[0.04] p-2"><b className="block text-sm text-white">{safeNumber(player.wins)}</b>Wins</div>
                          <div className="rounded-xl bg-white/[0.04] p-2"><b className="block text-sm text-white">{safeNumber(player.losses)}</b>Losses</div>
                          <div className="rounded-xl bg-white/[0.04] p-2"><b className="block text-sm text-white">{safeNumber(player.draws)}</b>Draws</div>
                          <div className="rounded-xl bg-white/[0.04] p-2"><b className="block text-sm text-white">{safeNumber(player.gamesPlayed)}</b>Games</div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <aside className="space-y-4">
            {currentUserRank ? (
              <div className="rounded-3xl border border-[#81b64c]/30 bg-[#81b64c]/10 p-5">
                <h2 className="text-lg font-black text-white">Your rank</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <StatPill label="Rank" value={`#${currentUserRank.rank}`} />
                  <StatPill label="Rating" value={currentUserRank.rating || "Unrated"} />
                  <StatPill label="Wins" value={safeNumber(currentUserRank.wins)} />
                  <StatPill label="Games" value={safeNumber(currentUserRank.gamesPlayed)} />
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-lg font-black text-white">Track your rank</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Sign in and complete games to track your leaderboard progress.</p>
                <button type="button" onClick={() => onNavigate?.("dashboard")} className="mt-4 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white hover:bg-white/10">
                  Go to ChessPlay
                </button>
              </div>
            )}

            <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
              <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-200">Supporter badge</span>
              <h2 className="mt-4 text-lg font-black text-white">Support ChessPlay</h2>
              <p className="mt-2 text-sm leading-6 text-amber-50/80">Supporters can show a badge beside their name. Supporter status never changes ranking, wins, rating, or matchmaking.</p>
              <button type="button" onClick={() => onNavigate?.("monetization")} className="mt-4 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-200">
                View Premium
              </button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-lg font-black text-white">Coming later</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>• Seasonal rankings</li>
                <li>• Tournament standings</li>
                <li>• Friends leaderboard</li>
                <li>• Puzzle leaderboard</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
