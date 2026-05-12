import { useEffect, useState } from "react";

export default function AppSplash() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(true), 3500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary,#0e0e0e)] text-[var(--color-text-primary,#e0e0e0)] grid place-items-center px-6">
      <section className="w-full max-w-md rounded-3xl border border-[var(--color-border-primary,#2a2a2a)] bg-[var(--color-bg-secondary,#1a1a1a)]/95 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[#81b64c] text-4xl text-[#07100a] shadow-lg shadow-[#81b64c]/25">
          ♟
        </div>
        <h1 className="font-['Montserrat'] text-3xl font-black">ChessPlay</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary,#a0a0a0)]">
          Preparing your board, session, and game settings…
        </p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[loadingBar_1.2s_ease-in-out_infinite] rounded-full bg-[#81b64c]" />
        </div>
        {showHint && (
          <p className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-xs text-yellow-100">
            Network looks slow. You can still continue when the session check completes.
          </p>
        )}
      </section>
    </main>
  );
}
