export default function PuzzleStatsCard({ stats, limits, history = [] }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20">
      <h2 className="font-['Montserrat'] text-xl font-black text-white">Puzzle stats</h2>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-black/20 p-3">
          <div className="text-xl font-black text-white">{stats?.solved || 0}</div>
          <div className="text-xs text-slate-400">Solved</div>
        </div>
        <div className="rounded-2xl bg-black/20 p-3">
          <div className="text-xl font-black text-white">{stats?.accuracy || 0}%</div>
          <div className="text-xs text-slate-400">Accuracy</div>
        </div>
        <div className="rounded-2xl bg-black/20 p-3">
          <div className="text-xl font-black text-white">{limits?.remaining ?? 0}</div>
          <div className="text-xs text-slate-400">Left today</div>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">Recent puzzles</h3>
        <div className="mt-3 space-y-2">
          {history.length ? history.slice(0, 5).map((item) => (
            <div key={`${item.puzzleId}-${item.updatedAt}`} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-sm">
              <span className="font-bold text-slate-200">{item.difficulty}</span>
              <span className={item.status === "solved" ? "text-[#b8f28f]" : "text-slate-400"}>{item.status}</span>
            </div>
          )) : (
            <p className="rounded-xl bg-black/20 px-3 py-3 text-sm leading-6 text-slate-400">No puzzle history yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
