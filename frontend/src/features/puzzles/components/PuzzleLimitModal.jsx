export default function PuzzleLimitModal({ limit, onClose, onUpgrade }) {
  if (!limit) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-[2rem] border border-amber-300/20 bg-[#17140d] p-6 text-white shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100">Daily limit</p>
        <h2 className="mt-2 font-['Montserrat'] text-2xl font-black">Puzzle limit reached</h2>
        <p className="mt-3 text-sm leading-6 text-amber-100/85">{limit.message || "Upgrade to unlock more puzzles today."}</p>
        <div className="mt-5 rounded-2xl bg-black/20 p-4 text-sm text-slate-200">
          {limit.limits?.used ?? 0}/{limit.limits?.limit ?? 0} puzzles used today
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15">Close</button>
          <button type="button" onClick={onUpgrade} className="rounded-xl bg-amber-200 px-4 py-3 text-sm font-black text-[#2a1a00] transition hover:bg-amber-100">Upgrade</button>
        </div>
      </div>
    </div>
  );
}
