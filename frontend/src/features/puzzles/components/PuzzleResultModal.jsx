export default function PuzzleResultModal({ result, onClose, onNext }) {
  if (!result?.completed) return null;
  const learning = result.learning || {};
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#101816] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#b8f28f]">Puzzle completed</p>
            <h2 className="mt-2 font-['Montserrat'] text-2xl font-black">What you learned</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-black text-slate-300 hover:bg-white/15" aria-label="Close result">×</button>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#81b64c]/15 px-3 py-1 font-black text-[#b8f28f]">{learning.themeName || "tactic"}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-bold text-slate-200">{learning.difficulty || "beginner"}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-bold text-slate-200">Rating {learning.rating || 1200}</span>
          </div>
          <p className="rounded-2xl bg-black/20 p-4">{learning.whatYouLearned || "Follow forcing moves and verify the full line."}</p>
          <p className="rounded-2xl bg-black/20 p-4">{learning.explanation || "This puzzle rewards checking candidate moves before committing."}</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15">Review board</button>
          <button type="button" onClick={onNext} className="rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a] transition hover:bg-[#93c85f]">Next Puzzle</button>
        </div>
      </div>
    </div>
  );
}
