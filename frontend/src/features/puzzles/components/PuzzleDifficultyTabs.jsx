const DIFFICULTIES = [
  { id: "beginner", label: "Beginner", copy: "600-1100" },
  { id: "intermediate", label: "Intermediate", copy: "1101-1700" },
  { id: "advanced", label: "Advanced", copy: "1701-2400", premium: true },
  { id: "master", label: "Master", copy: "2401+", premium: true },
];

export default function PuzzleDifficultyTabs({ value, limits, onChange }) {
  const premium = Boolean(limits?.isPremium);
  return (
    <section className="grid gap-3 md:grid-cols-4" aria-label="Puzzle difficulty">
      {DIFFICULTIES.map((difficulty) => {
        const locked = difficulty.premium && !premium;
        return (
          <button
            key={difficulty.id}
            type="button"
            onClick={() => onChange(difficulty.id)}
            className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
              value === difficulty.id
                ? "border-[#81b64c]/60 bg-[#81b64c]/15"
                : "border-white/10 bg-white/[0.06] hover:bg-white/[0.09]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-['Montserrat'] text-sm font-black text-white">{difficulty.label}</span>
              {locked ? <span className="rounded-full bg-amber-300/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">Premium</span> : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-400">{difficulty.copy}</p>
          </button>
        );
      })}
    </section>
  );
}
