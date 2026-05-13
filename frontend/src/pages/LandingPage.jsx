import { useState } from "react";
import { Modal } from "../components/ui";
import Auth from "../features/auth/components/Auth";

const BOARD = [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "", "", "p", "p", "p"],
  ["", "", "", "", "p", "", "", ""],
  ["", "", "", "p", "P", "", "", ""],
  ["", "", "", "", "", "N", "", ""],
  ["", "", "N", "", "", "", "", ""],
  ["P", "P", "P", "P", "", "P", "P", "P"],
  ["R", "", "B", "Q", "K", "B", "", "R"],
];

const PIECES = { r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙" };
const TRUST_BADGES = ["Secure OAuth", "Socket.IO multiplayer", "Stockfish AI", "No-ads supporter plan"];
const TESTIMONIALS = [
  ["Fast multiplayer setup", "The dashboard feels clean and easy to start a game."],
  ["Good for practice", "AI modes and analysis make it useful for daily chess learning."],
  ["Supporter ready", "Premium badge and manual UPI flow are simple for early users."],
];

export default function LandingPage({ onLogin, onGuestPlay }) {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const openSignup = () => { setIsLogin(false); setShowAuth(true); };
  const openLogin = () => { setIsLogin(true); setShowAuth(true); };
  const handleAuthSuccess = (userData) => { setShowAuth(false); onLogin(userData); };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050b09] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-24 h-72 w-72 animate-pulse rounded-full bg-[#81b64c]/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 animate-pulse rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
        {["♔", "♕", "♘", "♜", "♟"].map((piece, index) => (
          <span
            key={piece}
            className="absolute select-none text-5xl text-white/5 md:text-7xl"
            style={{ left: `${12 + index * 18}%`, top: `${18 + (index % 3) * 24}%`, animation: `floatPiece ${8 + index}s ease-in-out infinite` }}
          >
            {piece}
          </span>
        ))}
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <button type="button" onClick={onGuestPlay} className="flex items-center gap-3" aria-label="ChessPlay home">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#81b64c] text-2xl font-black text-[#07100d] shadow-lg shadow-[#81b64c]/25">♘</span>
          <span className="font-['Montserrat'] text-xl font-black">ChessPlay</span>
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openLogin} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 backdrop-blur-xl transition hover:bg-white/10">Log in</button>
          <button type="button" onClick={openSignup} className="rounded-xl bg-[#81b64c] px-4 py-2 text-sm font-black text-[#07100d] shadow-lg shadow-[#81b64c]/20 transition hover:bg-[#93c85f]">Create account</button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-74px)] max-w-7xl items-center gap-8 px-4 pb-10 pt-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,560px)]">
        <section className="max-w-3xl">
          <div className="mb-5 inline-flex rounded-full border border-[#81b64c]/25 bg-[#81b64c]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#a8e36f] backdrop-blur-xl">v1.3 SaaS onboarding</div>
          <h1 className="font-['Montserrat'] text-5xl font-black leading-[1.02] tracking-normal text-white md:text-7xl">Play smarter chess with a premium online experience.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">ChessPlay combines Stockfish AI, real-time multiplayer, analysis, supporter plans and a polished SaaS dashboard for serious practice and friendly matches.</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onGuestPlay} className="rounded-2xl bg-[#81b64c] px-6 py-4 text-base font-black text-[#07100d] shadow-xl shadow-[#81b64c]/20 transition hover:-translate-y-0.5 hover:bg-[#93c85f]">Play as guest</button>
            <button type="button" onClick={openSignup} className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-base font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15">Create account</button>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {TRUST_BADGES.map((badge) => <span key={badge} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300 backdrop-blur-xl">✓ {badge}</span>)}
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {TESTIMONIALS.map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
                <div className="font-['Montserrat'] text-base font-black">{title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-400">“{copy}”</div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-[#81b64c]/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div><div className="text-sm font-black text-white">Live premium board</div><div className="text-xs text-slate-400">Blitz 3+0 · AI ready</div></div>
              <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">Online</div>
            </div>
            <div className="grid grid-cols-8 p-4">
              {BOARD.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
                const light = (rowIndex + colIndex) % 2 === 0;
                return <div key={`${rowIndex}-${colIndex}`} className={`grid aspect-square place-items-center text-2xl md:text-4xl ${light ? "bg-[#e7d8bd]" : "bg-[#527a45]"}`}><span className={piece === piece.toUpperCase() ? "text-[#f7f0df]" : "text-[#172019]"}>{PIECES[piece] || ""}</span></div>;
              }))}
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-white/10 p-4 text-center">
              {[["1200", "Guest ELO"], ["<2s", "AI ready"], ["Live", "Rooms"]].map(([value, label]) => <div key={label} className="rounded-2xl bg-black/20 px-3 py-3"><div className="font-['Montserrat'] text-xl font-black">{value}</div><div className="mt-1 text-xs text-slate-400">{label}</div></div>)}
            </div>
          </div>
        </section>
      </main>

      <Modal isOpen={showAuth} onClose={() => setShowAuth(false)} title={isLogin ? "Log In" : "Sign Up"} className="max-w-md">
        <Auth onLogin={handleAuthSuccess} isModal={true} initialIsLogin={isLogin} onToggleMode={() => setIsLogin(!isLogin)} />
      </Modal>
    </div>
  );
}
