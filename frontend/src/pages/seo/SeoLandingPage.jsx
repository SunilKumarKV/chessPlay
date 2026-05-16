const CONTENT = {
  "chess-puzzles": {
    title: "Chess Puzzles",
    copy: "Practice tactical puzzles with daily limits, hints, and learning explanations powered by the Lichess open puzzle database.",
    cta: "Open puzzles",
    route: "puzzles",
  },
  "play-chess-online": {
    title: "Play Chess Online",
    copy: "Play live chess with real-time rooms, friends, chat, timers, and server-validated moves.",
    cta: "Play online",
    route: "multi",
  },
  "chess-ai": {
    title: "Chess AI",
    copy: "Train against ChessPlay AI with Stockfish-backed practice and safe fallback gameplay.",
    cta: "Play vs AI",
    route: "ai",
  },
  "chess-analysis": {
    title: "Chess Analysis",
    copy: "Review games, save notes, and follow the roadmap toward richer premium analysis reports.",
    cta: "Open analysis",
    route: "analysis",
  },
};

export default function SeoLandingPage({ page, onBack, onNavigate }) {
  const content = CONTENT[page] || CONTENT["play-chess-online"];
  return (
    <div className="min-h-screen bg-[#07100d] p-4 text-white sm:p-6 lg:p-8">
      <main className="mx-auto max-w-6xl">
        <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15">Back</button>
        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b8f28f]">ChessPlay</p>
            <h1 className="mt-4 font-['Montserrat'] text-4xl font-black md:text-6xl">{content.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{content.copy}</p>
            <button type="button" onClick={() => onNavigate?.(content.route)} className="mt-6 rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a] hover:bg-[#93c85f]">{content.cta}</button>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5">
            <div className="grid aspect-square place-items-center rounded-2xl bg-black/30 text-8xl">♞</div>
            <p className="mt-4 text-sm leading-6 text-slate-400">SEO page for discovery. Core gameplay remains inside the app experience.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
