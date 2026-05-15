import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/apiClient";

const FILTERS = ["all", "open", "upcoming", "active", "completed"];

const STATUS_STYLES = {
  open: "bg-emerald-400/15 text-emerald-200 border-emerald-300/25",
  upcoming: "bg-sky-400/15 text-sky-200 border-sky-300/25",
  active: "bg-amber-400/15 text-amber-200 border-amber-300/25",
  completed: "bg-slate-400/15 text-slate-200 border-slate-300/25",
  cancelled: "bg-red-400/15 text-red-200 border-red-300/25",
};

const FORMAT_LABELS = {
  rapid: "Rapid",
  blitz: "Blitz",
  bullet: "Bullet",
  classical: "Classical",
  casual: "Casual",
};

function formatDate(value) {
  if (!value) return "Schedule will be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Schedule will be announced";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ children, status = "open" }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${STATUS_STYLES[status] || STATUS_STYLES.completed}`}>
      {children}
    </span>
  );
}

function TournamentCard({ tournament, onJoin, onLeave, onDetails, busyId }) {
  const isBusy = busyId === tournament._id;
  const canJoin = tournament.status === "open" && !tournament.isJoined && tournament.playerCount < tournament.maxPlayers;
  const canLeave = tournament.isJoined && ["open", "upcoming"].includes(tournament.status);

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 transition hover:border-amber-300/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">{FORMAT_LABELS[tournament.format] || "Tournament"}</p>
          <h2 className="mt-2 text-2xl font-black text-white">{tournament.title}</h2>
        </div>
        <StatusBadge status={tournament.status}>{tournament.status}</StatusBadge>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-300">
        {tournament.description || "Community tournament registration is open. Pairings and live tournament rooms will roll out in a later phase."}
      </p>

      <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
        <div className="rounded-2xl bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Starts</p>
          <p className="mt-1 font-bold text-slate-100">{formatDate(tournament.startsAt)}</p>
        </div>
        <div className="rounded-2xl bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Players</p>
          <p className="mt-1 font-bold text-slate-100">{tournament.playerCount || 0} / {tournament.maxPlayers}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onDetails(tournament)}
          className="rounded-xl border border-white/10 px-4 py-3 font-black text-slate-100 hover:bg-white/10"
        >
          View details
        </button>
        {canJoin && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onJoin(tournament)}
            className="rounded-xl bg-[#81b64c] px-4 py-3 font-black text-black hover:bg-[#93c85f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Joining..." : "Join tournament"}
          </button>
        )}
        {canLeave && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onLeave(tournament)}
            className="rounded-xl bg-red-400 px-4 py-3 font-black text-black hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Leaving..." : "Leave"}
          </button>
        )}
        {tournament.isJoined && !canLeave && <span className="rounded-xl bg-emerald-400/10 px-4 py-3 text-center font-bold text-emerald-200">Registered</span>}
      </div>
    </article>
  );
}

export default function TournamentsPage({ user, onBack, onNavigate }) {
  const [tournaments, setTournaments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const query = filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
      const data = await apiClient(`/api/tournaments${query}`, { skipAuthRefresh: !user });
      setTournaments(Array.isArray(data.tournaments) ? data.tournaments : []);
    } catch (err) {
      setError(err.message || "Unable to load tournaments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, user]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredTournaments = useMemo(() => tournaments, [tournaments]);

  const requireLogin = () => {
    setError("Please sign in to join tournaments.");
    setMessage("");
  };

  const join = async (tournament) => {
    if (!user) return requireLogin();
    const confirmed = window.confirm(`Join ${tournament.title}?`);
    if (!confirmed) return undefined;
    setBusyId(tournament._id);
    setError("");
    setMessage("");
    try {
      const result = await apiClient(`/api/tournaments/${tournament._id}/join`, { method: "POST" });
      setMessage(result.message || "Joined tournament successfully.");
      await load();
    } catch (err) {
      setError(err.message || "Unable to update tournament registration.");
    } finally {
      setBusyId("");
    }
    return undefined;
  };

  const leave = async (tournament) => {
    if (!user) return requireLogin();
    const confirmed = window.confirm(`Leave ${tournament.title}?`);
    if (!confirmed) return undefined;
    setBusyId(tournament._id);
    setError("");
    setMessage("");
    try {
      const result = await apiClient(`/api/tournaments/${tournament._id}/leave`, { method: "POST" });
      setMessage(result.message || "Left tournament successfully.");
      await load();
    } catch (err) {
      setError(err.message || "Unable to update tournament registration.");
    } finally {
      setBusyId("");
    }
    return undefined;
  };

  return (
    <main className="min-h-full bg-[#0b0f14] p-4 text-slate-100 sm:p-6 lg:p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">Community events</p>
            <h1 className="text-3xl font-black sm:text-5xl">Chess Tournaments</h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Join upcoming ChessPlay tournaments, track registration, and compete with the community. Casual chess stays free; prizes or paid events will never be shown unless they are officially configured.
            </p>
          </div>
          <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold text-slate-200 hover:bg-white/10">← Back</button>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-black text-white">How tournaments work</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {["Register", "Practice", "Pairings", "Results"].map((item, index) => (
                <div key={item} className="rounded-2xl bg-black/20 p-4">
                  <span className="text-2xl font-black text-amber-300">0{index + 1}</span>
                  <p className="mt-2 font-bold text-white">{item}</p>
                  <p className="mt-1 text-xs text-slate-400">{index < 2 ? "Available now" : "Coming soon"}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-200">Supporter touchpoint</p>
            <h2 className="mt-2 text-2xl font-black text-white">Support better events</h2>
            <p className="mt-2 text-sm text-amber-50/80">Supporters get profile highlights and early feedback access. Tournament gameplay remains fair and free.</p>
            <button onClick={() => onNavigate?.("monetization")} className="mt-4 rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200">View Premium</button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2" aria-label="Tournament filters">
          {FILTERS.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.16em] ${filter === item ? "bg-[#81b64c] text-black" : "border border-white/10 text-slate-300 hover:bg-white/10"}`}
            >
              {item}
            </button>
          ))}
        </div>

        {message && <p className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}
        {error && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-3xl bg-white/[0.06]" />)}
          </div>
        ) : filteredTournaments.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {filteredTournaments.map((tournament) => (
              <TournamentCard
                key={tournament._id}
                tournament={tournament}
                busyId={busyId}
                onJoin={join}
                onLeave={leave}
                onDetails={setSelected}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <div className="text-5xl">🏆</div>
            <h2 className="mt-4 text-2xl font-black text-white">No tournaments are open right now.</h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-400">When real ChessPlay events are published, they will appear here. No fake participants, prizes, or limited offers are shown.</p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button onClick={() => onNavigate?.("multi")} className="rounded-xl bg-[#81b64c] px-5 py-3 font-black text-black">Play Online</button>
              <button onClick={() => onNavigate?.("puzzles")} className="rounded-xl border border-white/10 px-5 py-3 font-black text-white hover:bg-white/10">Train with Puzzles</button>
            </div>
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black text-white">Tournament roadmap</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {["Phase 1: Registration", "Phase 2: Pairings", "Phase 3: Live rooms", "Phase 4: Results and rankings"].map((item, index) => (
              <div key={item} className="rounded-2xl bg-black/20 p-4 text-sm text-slate-300">
                <span className="font-black text-amber-300">{index === 0 ? "Available" : "Planned"}</span>
                <p className="mt-2 font-bold text-white">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Tournament details">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <StatusBadge status={selected.status}>{selected.status}</StatusBadge>
                <h2 className="mt-3 text-3xl font-black text-white">{selected.title}</h2>
                <p className="mt-2 text-slate-300">{selected.description || "Tournament details will be updated by the ChessPlay team."}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-xl border border-white/10 px-3 py-2 font-bold text-white hover:bg-white/10">Close</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Format</p><p className="mt-1 font-black text-white">{FORMAT_LABELS[selected.format] || "Rapid"}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Starts</p><p className="mt-1 font-black text-white">{formatDate(selected.startsAt)}</p></div>
              <div className="rounded-2xl bg-black/20 p-4"><p className="text-xs uppercase text-slate-500">Players</p><p className="mt-1 font-black text-white">{selected.playerCount || 0}/{selected.maxPlayers}</p></div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="font-black text-white">Participants</h3>
                <div className="mt-3 space-y-2">
                  {selected.players?.length ? selected.players.map((player, index) => (
                    <div key={`${player.username}-${index}`} className="flex items-center justify-between rounded-2xl bg-black/20 p-3 text-sm">
                      <span className="font-bold text-white">{player.username}</span>
                      <span className="text-slate-400">{player.supporterBadge ? "Supporter" : `Rating ${player.rating || 1200}`}</span>
                    </div>
                  )) : <p className="rounded-2xl bg-black/20 p-4 text-sm text-slate-400">No participants yet.</p>}
                </div>
              </div>
              <div>
                <h3 className="font-black text-white">Rules and schedule</h3>
                <p className="mt-3 rounded-2xl bg-black/20 p-4 text-sm leading-6 text-slate-300">{selected.rules || "Pairings, live tournament rooms, and official results are planned for the next phase. Use Play Online for practice while tournament registration is open."}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
