export default function TermsPage({ onBack }) {
  return (
    <main className="min-h-screen bg-[var(--bg-primary,#0b0f14)] px-6 py-10 text-[var(--text-primary,#f8fafc)]">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <button onClick={onBack} className="mb-6 rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/10">← Back</button>
        <h1 className="mb-3 text-3xl font-black">Terms & Conditions</h1>
        <p className="mb-6 text-sm text-slate-400">Last updated: May 2026</p>
        <div className="space-y-4 text-slate-300">
          <p>Use ChessPlay fairly. Do not spam rooms, abuse chat, exploit bugs, attempt unauthorized access, or manipulate game results.</p>
          <p>Multiplayer move validation is performed on the server. Attempts to bypass server validation may result in account restriction.</p>
          <p>ChessPlay is provided as-is during production rollout. Features may be updated, restricted, or removed to protect users and platform stability.</p>
        </div>
      </div>
    </main>
  );
}
