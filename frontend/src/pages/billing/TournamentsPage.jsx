import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";

export default function TournamentsPage({ onBack, onNavigate }) {
  const [tournaments, setTournaments] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = () => apiClient("/api/billing/tournaments").then((data) => setTournaments(data.tournaments || [])).catch((err) => setError(err.message || "Could not load tournaments"));
  useEffect(() => { load(); }, []);

  const join = async (id) => {
    setError(""); setStatus("Joining tournament...");
    try {
      const result = await apiClient(`/api/billing/tournaments/${id}/join`, { method: "POST" });
      setStatus(result.message || "Joined tournament");
      load();
    } catch (err) { setStatus(""); setError(err.message || "Could not join tournament"); }
  };

  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">Paid / free events</p>
          <h1 className="text-3xl font-black sm:text-4xl">Tournament Mode</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Run free events for growth or paid tournaments with entry-fee revenue.</p>
        </div>
        <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 font-bold text-slate-200 hover:bg-white/10">← Back</button>
      </div>

      {status && <p className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{status}</p>}
      {error && <p className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        {tournaments.map((t) => (
          <article key={t._id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-black text-white">{t.title}</h2><p className="mt-1 text-sm text-slate-400">{new Date(t.startsAt).toLocaleString()}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${t.mode === "paid" ? "bg-amber-300/15 text-amber-200" : "bg-emerald-300/15 text-emerald-200"}`}>{t.mode === "paid" ? `₹${t.entryFee}` : "Free"}</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">{t.description || "Swiss-style event foundation. Brackets and auto pairing can be extended in the next phase."}</p>
            <div className="mt-4 text-sm text-slate-300">Players: {t.participants?.length || 0}/{t.maxPlayers}</div>
            <button onClick={() => join(t._id)} className="mt-5 w-full rounded-xl bg-[#81b64c] px-4 py-3 font-black text-black hover:bg-[#93c85f]">Join tournament</button>
          </article>
        ))}
        {tournaments.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center lg:col-span-3">
            <div className="text-5xl">🏆</div>
            <h2 className="mt-4 text-2xl font-black text-white">No live tournaments yet</h2>
            <p className="mt-2 text-slate-400">Admin can create free or paid tournaments from backend API. Use this page as the user-facing tournament lobby.</p>
            <button onClick={() => onNavigate?.("pricing")} className="mt-5 rounded-xl bg-amber-300 px-5 py-3 font-black text-black">View premium tournament access</button>
          </div>
        )}
      </div>
    </div>
  );
}
