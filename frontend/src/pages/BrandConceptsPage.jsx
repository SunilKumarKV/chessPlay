import { CpGrowthPathLogo, CpHiddenKnightLogo, KnightGrowthArrowLogo } from "../components/brand/LogoConcepts";

const LOGO_CONCEPTS = [
  {
    title: "Knight + Growth Arrow",
    subtitle: "Best strategic fit: chess intelligence plus measurable improvement. Premium, clear at app-icon scale, and distinct from generic chess-piece-only marks.",
    mark: <KnightGrowthArrowLogo />,
    recommended: true,
  },
  {
    title: "CP Monogram + Hidden Knight",
    subtitle: "Strongest favicon/app icon direction. The CP reads first, with the knight shape acting as a brand detail rather than an esports-style mascot.",
    mark: <CpHiddenKnightLogo />,
  },
  {
    title: "CP Monogram + Growth Path",
    subtitle: "Simple improvement-journey idea with a path arrow. Scales well and feels product-led, though less chess-specific than the knight option.",
    mark: <CpGrowthPathLogo />,
  },
];

export default function BrandConceptsPage({ onBack }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-[#0B0F19] dark:text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">Internal brand concept preview</p>
            <h1 className="mt-3 font-['Montserrat'] text-4xl font-black md:text-6xl">ChessPlay logo directions</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Internal archive of the approved brand exploration. The production navbar uses Knight + Growth Arrow, while favicon and app icons use the simplified CP + Hidden Knight mark.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-[0_18px_42px_rgba(244,180,0,0.18)] dark:border-white/10 dark:bg-white/10 dark:text-white"
          >
            Back to app
          </button>
        </div>

        <section className="grid gap-6">
          {LOGO_CONCEPTS.map(({ title, subtitle, mark, recommended }) => (
            <ConceptFrame key={title} title={title} subtitle={subtitle} recommended={recommended}>
              {mark}
            </ConceptFrame>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-slate-950/70">
          <h2 className="font-['Montserrat'] text-2xl font-black">Recommendation</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Final direction: use Knight + Growth Arrow for the primary brand mark and CP + Hidden Knight for favicon and app icons. This gives ChessPlay a clear chess-improvement signal without becoming a generic chess-piece logo.
          </p>
        </section>
      </div>
    </main>
  );
}

function ConceptFrame({ title, subtitle, children, recommended }) {
  return (
    <article className="rounded-3xl border border-slate-200/70 bg-white/85 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-amber-400/80 hover:shadow-[0_28px_90px_rgba(244,180,0,0.2)] dark:border-white/10 dark:bg-slate-950/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-['Montserrat'] text-xl font-black text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
        </div>
        {recommended ? (
          <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Recommended</span>
        ) : null}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_120px] md:items-center">
        <div className="grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,#eef2ff)] p-8 dark:border-white/10 dark:bg-[linear-gradient(135deg,#0B0F19,#151B2D)]">
          {children}
        </div>
        <div className="grid gap-3">
          <div className="grid aspect-square place-items-center rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            {children}
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}
