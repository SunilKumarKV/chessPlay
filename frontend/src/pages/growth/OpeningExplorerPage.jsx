const ECO_SAMPLE = [
  { eco: "C20", name: "King's Pawn Game", moves: "1. e4 e5" },
  { eco: "B20", name: "Sicilian Defense", moves: "1. e4 c5" },
  { eco: "D00", name: "Queen's Pawn Game", moves: "1. d4 d5" },
];

export default function OpeningExplorerPage({ onBack }) {
  return (
    <div className="min-h-screen bg-[#07100d] p-4 text-white sm:p-6 lg:p-8">
      <main className="mx-auto max-w-6xl">
        <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15">Back</button>
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b8f28f]">Foundation</p>
          <h1 className="mt-3 font-['Montserrat'] text-4xl font-black">Opening Explorer</h1>
          <p className="mt-4 max-w-3xl text-slate-300">A safe ECO sample for the future opening explorer. No external opening database is bundled yet.</p>
          <div className="mt-6 grid gap-3">
            {ECO_SAMPLE.map((item) => (
              <article key={item.eco} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-black text-[#b8f28f]">{item.eco}</div>
                <h2 className="mt-1 text-xl font-black">{item.name}</h2>
                <p className="mt-1 font-mono text-sm text-slate-300">{item.moves}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
