export default function MatchResultModal({ open, result, title, subtitle, onClose, onRematch, onReview, onShare }) {
  if (!open) return null;

  const icon = result === "win" ? "🏆" : result === "draw" ? "🤝" : "😢";
  const heading = title || (result === "win" ? "Victory!" : result === "draw" ? "Draw Game" : "Game Over");

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#101614]/95 p-6 text-center text-white shadow-2xl">
        <div className="text-6xl">{icon}</div>
        <h2 className="mt-4 font-['Montserrat'] text-3xl font-black">{heading}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle || "Review your match, try a rematch, or share your result."}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button onClick={onRematch} className="rounded-xl bg-[#81b64c] px-4 py-3 font-black text-[#07100a] hover:bg-[#93c85f]">Rematch</button>
          <button onClick={onReview} className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 font-bold text-cyan-100 hover:bg-cyan-300/15">Review game</button>
          <button onClick={onShare} className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 font-bold text-amber-100 hover:bg-amber-300/15">Share result</button>
          <button onClick={onClose} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-bold text-slate-100 hover:bg-white/15">Play again</button>
        </div>
      </div>
    </div>
  );
}
