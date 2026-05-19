import { useEffect } from "react";

const BENEFITS = [
  ["More puzzles", "Pro starts at 25 puzzles/day; Premium raises that to 100/day"],
  ["Extra hints", "Premium training gets more guided hints per puzzle"],
  ["Analysis", "Current free analysis tools remain available; deeper reports are not sold until released"],
  ["Themes", "Premium board/theme unlock logic without changing the default board"],
];

export default function UpgradeModal({ open, onClose, onNavigate, feature = "premium training" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const goToPlan = (plan) => {
    sessionStorage.setItem("chessplay_selected_plan", plan);
    onClose?.();
    onNavigate?.("pricing");
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-amber-300/25 bg-[#0b1110]/95 p-6 text-white shadow-2xl shadow-amber-500/10 md:p-8">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-[#81b64c]/20 blur-3xl" />
        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-black text-slate-200 hover:bg-white/15"
          >
            ✕
          </button>
          <div className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-200">
            Support ChessPlay
          </div>
          <h2 className="mt-4 max-w-2xl font-['Montserrat'] text-3xl font-black leading-tight md:text-5xl">
            Unlock a cleaner, faster and more premium chess experience.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Continue free anytime, or upgrade when you want {feature}, richer puzzle limits, and released supporter benefits.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {BENEFITS.map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                <div className="mt-2 text-sm font-black text-white">{title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">{copy}</div>
              </div>
            ))}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 font-black text-slate-100 transition hover:bg-white/10"
            >
              Free continue
            </button>
            <button
              type="button"
              onClick={() => goToPlan("pro")}
              className="rounded-2xl bg-[#81b64c] px-5 py-4 font-black text-[#07100a] shadow-xl shadow-[#81b64c]/20 transition hover:-translate-y-0.5 hover:bg-[#93c85f]"
            >
              View Pro
            </button>
            <button
              type="button"
              onClick={() => goToPlan("premium")}
              className="rounded-2xl bg-amber-300 px-5 py-4 font-black text-black shadow-xl shadow-amber-300/20 transition hover:-translate-y-0.5 hover:bg-amber-200"
            >
              View Premium
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
