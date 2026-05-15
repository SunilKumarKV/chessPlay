import { useMemo, useState } from "react";
import { Modal } from "../components/ui";
import Auth from "../features/auth/components/Auth";

const BOARD = [
  ["r", "", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "", "", "", "p", "p", "p"],
  ["", "", "n", "", "p", "", "", ""],
  ["", "", "p", "p", "P", "", "", ""],
  ["", "", "", "", "", "N", "", ""],
  ["", "", "N", "", "", "Q", "", ""],
  ["P", "P", "P", "P", "", "P", "P", "P"],
  ["R", "", "B", "", "K", "B", "", "R"],
];

const PIECES = {
  r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟",
  R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙",
};

const FEATURES = [
  { icon: "🤖", title: "Stockfish AI", copy: "Easy to Pro levels, engine depth, move quality, and analysis tools for daily improvement." },
  { icon: "🌐", title: "Online multiplayer", copy: "Create private rooms, reconnect during active games, and challenge players in real time." },
  { icon: "🏠", title: "Same WiFi play", copy: "Host or join local games with room codes for friends in the same network." },
  { icon: "💎", title: "Premium plans", copy: "No ads, premium sounds, advanced analysis, custom themes, and supporter badges." },
  { icon: "🏆", title: "Tournaments", copy: "Join organized events and keep competitive play connected to ratings and results." },
  { icon: "👥", title: "Community", copy: "Posts, puzzles, discussions, achievements, private chat, and public rooms." },
];

const STATS = [
  ["4", "AI levels"],
  ["24/7", "Practice"],
  ["3+", "Play modes"],
  ["100%", "Responsive"],
];

const PRICING = [
  { name: "Free", price: "₹0", tag: "Start", features: ["Play vs AI", "Casual multiplayer", "Basic sounds", "Ads after matches"] },
  { name: "Supporter", price: "₹99/mo", tag: "Popular", highlighted: true, features: ["No ads", "Premium sounds", "Supporter badge", "Faster AI access"] },
  { name: "Pro", price: "₹999/yr", tag: "Best value", features: ["Advanced analysis", "Custom boards", "Game review", "Early features"] },
];

const WORKFLOWS = [
  { name: "Practice", role: "Play against AI", copy: "Choose a time control, tune the engine strength, and build confidence move by move." },
  { name: "Compete", role: "Play online or locally", copy: "Start live games with room codes, matchmaking, same-WiFi play, and rematches." },
  { name: "Improve", role: "Review and analyze", copy: "Use saved games, analysis tools, and history views to spot patterns after each match." },
];

const TRACKING_ITEMS = [
  ["Rating", "Track progress across games"],
  ["History", "Review recent matches"],
  ["Community", "Share posts and puzzles"],
];

const PRODUCT_POINTS = ["Stockfish AI", "Live multiplayer", "Same WiFi play", "Game history", "Community posts", "Premium options"];

export default function LandingPage({ onLogin, onGuestPlay }) {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loadingAction, setLoadingAction] = useState("");

  const floatingPieces = useMemo(() => ["♔", "♕", "♘", "♜", "♟", "♗", "♚"], []);

  const openSignup = () => {
    setLoadingAction("signup");
    window.setTimeout(() => {
      setIsLogin(false);
      setShowAuth(true);
      setLoadingAction("");
    }, 180);
  };

  const openLogin = () => {
    setLoadingAction("login");
    window.setTimeout(() => {
      setIsLogin(true);
      setShowAuth(true);
      setLoadingAction("");
    }, 180);
  };

  const handleAuthSuccess = (userData) => {
    setShowAuth(false);
    onLogin(userData);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030706] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 top-16 h-80 w-80 animate-pulse rounded-full bg-[#81b64c]/25 blur-3xl" />
        <div className="absolute right-[-120px] top-0 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-160px] left-1/3 h-[32rem] w-[32rem] rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(129,182,76,0.18),transparent_34%),linear-gradient(180deg,transparent,rgba(3,7,6,0.92))]" />
        {floatingPieces.map((piece, index) => (
          <span
            key={`${piece}-${index}`}
            className="absolute select-none text-5xl text-white/[0.045] md:text-8xl"
            style={{
              left: `${6 + index * 14}%`,
              top: `${12 + (index % 4) * 20}%`,
              animation: `floatPiece ${7 + index * 0.8}s ease-in-out infinite`,
              animationDelay: `${index * 0.35}s`,
            }}
          >
            {piece}
          </span>
        ))}
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#030706]/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <button type="button" onClick={onGuestPlay} className="flex items-center gap-3" aria-label="ChessPlay home">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#81b64c] text-2xl font-black text-[#07100d] shadow-lg shadow-[#81b64c]/25">♘</span>
            <span className="font-['Montserrat'] text-xl font-black">ChessPlay</span>
          </button>
          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-300 lg:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#leaderboard" className="hover:text-white">Leaderboard</a>
            <a href="#help" className="hover:text-white">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openLogin} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 backdrop-blur-xl transition hover:bg-white/10">
              {loadingAction === "login" ? "Opening..." : "Log in"}
            </button>
            <button type="button" onClick={openSignup} className="rounded-xl bg-[#81b64c] px-4 py-2 text-sm font-black text-[#07100d] shadow-lg shadow-[#81b64c]/20 transition hover:bg-[#93c85f]">
              {loadingAction === "signup" ? "Loading..." : "Create account"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,560px)] lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex rounded-full border border-[#81b64c]/25 bg-[#81b64c]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#a8e36f] backdrop-blur-xl">Play · practice · compete</div>
            <h1 className="font-['Montserrat'] text-5xl font-black leading-[1.02] text-white md:text-7xl">A premium chess platform built for play, practice, and growth.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">Play Stockfish AI, challenge friends online, use local WiFi mode, review games, join community spaces, and support ChessPlay with premium plans.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onGuestPlay} className="rounded-2xl bg-[#81b64c] px-6 py-4 text-base font-black text-[#07100d] shadow-xl shadow-[#81b64c]/20 transition hover:-translate-y-0.5 hover:bg-[#93c85f]">Play live preview</button>
              <button type="button" onClick={openSignup} className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-base font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15">Start free account</button>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {PRODUCT_POINTS.map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300 backdrop-blur-xl">✓ {item}</span>)}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.4rem] bg-[#81b64c]/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] shadow-2xl shadow-black/40 backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div><div className="text-sm font-black text-white">Live chess preview</div><div className="text-xs text-slate-400">Blitz 3+0 · AI depth ready</div></div>
                <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">Online</div>
              </div>
              <div className="grid grid-cols-8 p-4">
                {BOARD.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
                  const light = (rowIndex + colIndex) % 2 === 0;
                  const isWhite = piece && piece === piece.toUpperCase();
                  return <div key={`${rowIndex}-${colIndex}`} className={`grid aspect-square place-items-center text-2xl md:text-4xl ${light ? "bg-[#e7d8bd]" : "bg-[#527a45]"}`}><span className={isWhite ? "text-[#fff8ea] drop-shadow" : "text-[#172019]"}>{PIECES[piece] || ""}</span></div>;
                }))}
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-white/10 p-4 text-center">
                {[["1200", "Guest ELO"], ["<2s", "AI ready"], ["Live", "Rooms"]].map(([value, label]) => <div key={label} className="rounded-2xl bg-black/20 px-3 py-3"><div className="font-['Montserrat'] text-xl font-black">{value}</div><div className="mt-1 text-xs text-slate-400">{label}</div></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
          <div className="grid gap-3 md:grid-cols-4">
            {STATS.map(([value, label]) => <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 text-center backdrop-blur-xl"><div className="font-['Montserrat'] text-3xl font-black text-[#a8e36f]">{value}</div><div className="mt-2 text-sm font-bold text-slate-300">{label}</div></div>)}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="mb-8 max-w-2xl"><h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Everything needed for modern chess play.</h2><p className="mt-3 text-slate-400">Built for quick games, thoughtful practice, community, and long-term improvement.</p></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#81b64c]/35"><div className="text-3xl">{feature.icon}</div><h3 className="mt-4 font-['Montserrat'] text-xl font-black">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{feature.copy}</p></div>)}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Simple plans for every player.</h2><p className="mt-3 text-slate-400">Start free. Upgrade when you want no ads, premium sounds, badges, and deeper tools.</p></div><button type="button" onClick={openSignup} className="rounded-2xl bg-white px-5 py-3 font-black text-[#07100d]">Join ChessPlay</button></div>
          <div className="grid gap-4 lg:grid-cols-3">
            {PRICING.map((plan) => <div key={plan.name} className={`rounded-3xl border p-6 backdrop-blur-xl ${plan.highlighted ? "border-[#81b64c]/60 bg-[#81b64c]/15 shadow-2xl shadow-[#81b64c]/10" : "border-white/10 bg-white/[0.05]"}`}><div className="flex items-center justify-between"><h3 className="font-['Montserrat'] text-2xl font-black">{plan.name}</h3><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-200">{plan.tag}</span></div><div className="mt-5 font-['Montserrat'] text-4xl font-black">{plan.price}</div><ul className="mt-5 space-y-3 text-sm text-slate-300">{plan.features.map((item) => <li key={item}>✓ {item}</li>)}</ul><button type="button" onClick={openSignup} className={`mt-6 w-full rounded-2xl px-4 py-3 font-black ${plan.highlighted ? "bg-[#81b64c] text-[#07100d]" : "bg-white/10 text-white"}`}>Choose {plan.name}</button></div>)}
          </div>
        </section>

        <section id="leaderboard" className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:px-8 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"><h2 className="font-['Montserrat'] text-3xl font-black">Track your chess life</h2><div className="mt-5 space-y-3">{TRACKING_ITEMS.map(([name, detail], index) => <div key={name} className="flex items-center justify-between rounded-2xl bg-black/20 p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#81b64c]/20 font-black text-[#a8e36f]">0{index + 1}</span><div><div className="font-black">{name}</div><div className="text-xs text-slate-400">{detail}</div></div></div><div className="font-['Montserrat'] text-xl font-black">Ready</div></div>)}</div></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"><h2 className="font-['Montserrat'] text-3xl font-black">Core workflows</h2><div className="mt-5 grid gap-3">{WORKFLOWS.map((item) => <div key={item.name} className="rounded-2xl bg-black/20 p-4"><p className="text-sm leading-6 text-slate-300">{item.copy}</p><div className="mt-3 text-sm font-black">{item.name}</div><div className="text-xs text-slate-500">{item.role}</div></div>)}</div></div>
        </section>

        <section id="help" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="rounded-[2rem] border border-[#81b64c]/20 bg-[#81b64c]/10 p-8 text-center backdrop-blur-xl md:p-12"><h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">New to ChessPlay?</h2><p className="mx-auto mt-4 max-w-2xl text-slate-300">Learn how to play vs AI, multiplayer, same WiFi, analysis board, premium plans, and community features from the in-app Help Center.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={onGuestPlay} className="rounded-2xl bg-[#81b64c] px-6 py-4 font-black text-[#07100d]">Try guest mode</button><button type="button" onClick={openLogin} className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 font-black text-white">Login to dashboard</button></div></div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 py-8 text-center text-sm text-slate-500 md:px-8">© {new Date().getFullYear()} ChessPlay · Built for players, learners, and supporters.</footer>

      <Modal isOpen={showAuth} onClose={() => setShowAuth(false)} title={isLogin ? "Log In" : "Sign Up"} className="max-w-md">
        <Auth onLogin={handleAuthSuccess} isModal={true} initialIsLogin={isLogin} onToggleMode={() => setIsLogin(!isLogin)} />
      </Modal>
    </div>
  );
}
