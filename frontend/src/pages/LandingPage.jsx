import { useEffect, useMemo, useState } from "react";
import { Modal } from "../components/ui";
import Auth from "../features/auth/components/Auth";
import LegalFooter from "../components/common/LegalFooter";

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

const PIECES = {
  r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟",
  R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔", P: "♙",
};

const FEATURES = [
  { icon: "🤖", title: "Play vs AI", copy: "Practice against Stockfish-powered AI with clear time controls and a beginner-friendly guest flow." },
  { icon: "🌐", title: "Real-time multiplayer", copy: "Create or join live games with friends while the backend protects move validation and room state." },
  { icon: "📜", title: "Game history", copy: "Review saved matches, results, and recent activity after signing in to your ChessPlay account." },
  { icon: "🏆", title: "Leaderboard", copy: "Compare progress with other players through a dedicated leaderboard experience." },
  { icon: "◇", title: "Chess puzzles", copy: "Practice tactical patterns with starter puzzles and sign in to save progress when live puzzles are enabled." },
  { icon: "👥", title: "Friends and community", copy: "Use profile, friends, messages, and community sections to keep chess social." },
  { icon: "🔐", title: "Secure account", copy: "Cookie-based sessions, protected routes, and production-safe auth screens help protect player access." },
];

const CAPABILITIES = [
  ["AI practice", "Train with adjustable chess practice modes"],
  ["Live rooms", "Play real-time games with online opponents"],
  ["Player dashboard", "Manage profile, history, settings, and activity"],
  ["Mobile ready", "Responsive layout for phone, tablet, and desktop"],
];

const HOW_IT_WORKS = [
  { title: "Start fast", text: "Try guest mode instantly or create a free account to save your progress." },
  { title: "Choose a mode", text: "Play against AI, challenge a friend online, or continue from your dashboard." },
  { title: "Review and improve", text: "Use history, leaderboard, and analysis areas to understand your games over time." },
];

const PRODUCT_POINTS = ["Play vs AI", "Real-time multiplayer", "Puzzles", "Game history", "Leaderboard", "Secure account"];

export default function LandingPage({ onLogin, onGuestPlay, onNavigatePath }) {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loadingAction, setLoadingAction] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showGuestConfirm, setShowGuestConfirm] = useState(false);

  const floatingPieces = useMemo(() => ["♔", "♕", "♘", "♜", "♟", "♗"], []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === "/register" || params.get("ref")) {
      setIsLogin(false);
      setShowAuth(true);
    } else if (window.location.pathname === "/login") {
      setIsLogin(true);
      setShowAuth(true);
    }
  }, []);

  const openSignup = () => {
    setMobileMenuOpen(false);
    setLoadingAction("signup");
    window.setTimeout(() => {
      setIsLogin(false);
      setShowAuth(true);
      setLoadingAction("");
    }, 120);
  };

  const openLogin = () => {
    setMobileMenuOpen(false);
    setLoadingAction("login");
    window.setTimeout(() => {
      setIsLogin(true);
      setShowAuth(true);
      setLoadingAction("");
    }, 120);
  };

  const playNow = () => {
    setMobileMenuOpen(false);
    setShowGuestConfirm(true);
  };

  const continueAsGuest = () => {
    setShowGuestConfirm(false);
    if (onNavigatePath) onNavigatePath("/play");
    onGuestPlay();
  };

  const handleAuthSuccess = (userData) => {
    setShowAuth(false);
    onLogin(userData);
  };

  const navItems = [
    { href: "#features", label: "Features" },
    { href: "/puzzles", label: "Puzzles", route: true },
    { href: "/leaderboard", label: "Leaderboard", route: true },
    { href: "#how-it-works", label: "How it works" },
    { href: "#security", label: "Security" },
    { href: "#start", label: "Start" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030706] text-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-black">
        Skip to main content
      </a>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-28 top-16 h-80 w-80 animate-pulse rounded-full bg-[#81b64c]/25 blur-3xl" />
        <div className="absolute right-[-120px] top-0 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-160px] left-1/3 h-[32rem] w-[32rem] rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(129,182,76,0.18),transparent_34%),linear-gradient(180deg,transparent,rgba(3,7,6,0.92))]" />
        {floatingPieces.map((piece, index) => (
          <span
            key={`${piece}-${index}`}
            className="absolute select-none text-5xl text-white/[0.045] md:text-8xl motion-reduce:hidden"
            style={{
              left: `${7 + index * 16}%`,
              top: `${12 + (index % 3) * 24}%`,
              animation: `floatPiece ${8 + index * 0.7}s ease-in-out infinite`,
              animationDelay: `${index * 0.35}s`,
            }}
          >
            {piece}
          </span>
        ))}
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#030706]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3" aria-label="Go to ChessPlay homepage top">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#81b64c] text-2xl font-black text-[#07100d] shadow-lg shadow-[#81b64c]/25">♘</span>
            <span className="font-['Montserrat'] text-xl font-black">ChessPlay</span>
          </button>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-300 lg:flex" aria-label="Homepage navigation">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="rounded-lg px-2 py-1 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#81b64c]">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <button type="button" onClick={openLogin} disabled={Boolean(loadingAction)} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 backdrop-blur-xl transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70">
              {loadingAction === "login" ? "Opening..." : "Log in"}
            </button>
            <button type="button" onClick={openSignup} disabled={Boolean(loadingAction)} className="rounded-xl bg-[#81b64c] px-4 py-2 text-sm font-black text-[#07100d] shadow-lg shadow-[#81b64c]/20 transition hover:bg-[#93c85f] disabled:cursor-not-allowed disabled:opacity-70">
              {loadingAction === "signup" ? "Loading..." : "Create account"}
            </button>
          </div>

          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-black text-white sm:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-home-menu"
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            Menu
          </button>
        </div>

        {mobileMenuOpen ? (
          <div id="mobile-home-menu" className="border-t border-white/10 bg-[#030706]/95 px-4 py-4 sm:hidden">
            <nav className="grid gap-2" aria-label="Mobile homepage navigation">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="rounded-xl bg-white/[0.05] px-4 py-3 text-sm font-bold text-slate-200">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={openLogin} className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white">Log in</button>
              <button type="button" onClick={openSignup} className="rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100d]">Create account</button>
            </div>
          </div>
        ) : null}
      </header>

      <main id="main-content" className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,540px)] lg:py-20">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-full border border-[#81b64c]/25 bg-[#81b64c]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#a8e36f] backdrop-blur-xl">
              Play chess online
            </p>
            <h1 className="font-['Montserrat'] text-4xl font-black leading-[1.04] text-white sm:text-5xl md:text-7xl">
              Play chess online with AI, friends, and real-time multiplayer.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg md:text-xl md:leading-8">
              ChessPlay brings practice, live rooms, game history, leaderboards, and secure player accounts into one responsive web app.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={playNow} className="rounded-2xl bg-[#81b64c] px-6 py-4 text-base font-black text-[#07100d] shadow-xl shadow-[#81b64c]/20 transition hover:-translate-y-0.5 hover:bg-[#93c85f] focus:outline-none focus:ring-2 focus:ring-[#a8e36f]">
                Play Now
              </button>
              <button type="button" onClick={openSignup} className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-base font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70">
                Create Account
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-2" aria-label="ChessPlay highlights">
              {PRODUCT_POINTS.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300 backdrop-blur-xl">✓ {item}</span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px]">
            <div className="absolute -inset-6 rounded-[2.4rem] bg-[#81b64c]/10 blur-2xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] shadow-2xl shadow-black/40 backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-sm font-black text-white">Live chess preview</h2>
                  <p className="text-xs text-slate-400">Blitz-ready board · Guest mode available</p>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">Ready</span>
              </div>
              <div className="grid grid-cols-8 p-3 sm:p-4" role="img" aria-label="Decorative chess board preview">
                {BOARD.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
                  const light = (rowIndex + colIndex) % 2 === 0;
                  const isWhite = piece && piece === piece.toUpperCase();
                  return (
                    <div key={`${rowIndex}-${colIndex}`} className={`grid aspect-square place-items-center text-xl sm:text-3xl md:text-4xl ${light ? "bg-[#e7d8bd]" : "bg-[#527a45]"}`}>
                      <span className={isWhite ? "text-[#fff8ea] drop-shadow" : "text-[#172019]"}>{PIECES[piece] || ""}</span>
                    </div>
                  );
                }))}
              </div>
              <div className="grid grid-cols-1 gap-3 border-t border-white/10 p-4 text-center sm:grid-cols-3">
                {["AI practice", "Live rooms", "Secure login"].map((label) => (
                  <div key={label} className="rounded-2xl bg-black/20 px-3 py-3">
                    <div className="font-['Montserrat'] text-lg font-black text-[#a8e36f]">Ready</div>
                    <div className="mt-1 text-xs text-slate-400">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-10 md:px-8" aria-labelledby="capabilities-heading">
          <h2 id="capabilities-heading" className="sr-only">ChessPlay capabilities</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map(([title, detail]) => (
              <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
                <h3 className="font-['Montserrat'] text-lg font-black text-[#a8e36f]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="mb-8 max-w-2xl">
            <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Everything needed for modern chess play.</h2>
            <p className="mt-3 text-slate-400">Built for quick games, focused practice, player profiles, and long-term improvement.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="rounded-3xl border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#81b64c]/35 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <div className="text-3xl" aria-hidden="true">{feature.icon}</div>
                <h3 className="mt-4 font-['Montserrat'] text-xl font-black">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <h2 className="font-['Montserrat'] text-3xl font-black md:text-4xl">How it works</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">Start with a guest match or create an account when you want saved history, profile features, and a complete player dashboard.</p>
            <button type="button" onClick={playNow} className="mt-6 rounded-2xl bg-[#81b64c] px-5 py-3 font-black text-[#07100d]">
              Try Guest Mode
            </button>
          </div>
          <div className="grid gap-3">
            {HOW_IT_WORKS.map((item, index) => (
              <article key={item.title} className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#81b64c]/20 font-black text-[#a8e36f]">0{index + 1}</span>
                <div>
                  <h3 className="font-['Montserrat'] text-lg font-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="security" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl lg:col-span-2">
              <h2 className="font-['Montserrat'] text-3xl font-black md:text-4xl">Production-focused player experience</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Homepage actions connect to real routes, authentication opens the production login/register flow, and unfinished experiences are not presented as active buttons.
              </p>
            </article>
            <article className="rounded-3xl border border-[#81b64c]/20 bg-[#81b64c]/10 p-6 backdrop-blur-xl">
              <h3 className="font-['Montserrat'] text-2xl font-black">Secure access</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">Use email/password or Google sign-in when configured. Protected player areas require a valid session.</p>
            </article>
          </div>
        </section>

        <section id="start" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="rounded-[2rem] border border-[#81b64c]/20 bg-[#81b64c]/10 p-8 text-center backdrop-blur-xl md:p-12">
            <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Ready to play?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">Start a guest game now or create a free account to access your dashboard and saved player experience.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={playNow} className="rounded-2xl bg-[#81b64c] px-6 py-4 font-black text-[#07100d]">Play Now</button>
              <button type="button" onClick={openSignup} className="rounded-2xl border border-white/15 bg-white/10 px-6 py-4 font-black text-white">Create Account</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center text-sm text-slate-500 md:flex-row md:text-left">
          <p>© {new Date().getFullYear()} ChessPlay · Built for players, learners, and supporters.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={openLogin} className="hover:text-white">Login</button>
            <button type="button" onClick={openSignup} className="hover:text-white">Register</button>
            <a href="#features" className="hover:text-white">Features</a>
            <a href="/privacy-policy" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/privacy-policy"); }} className="hover:text-white">Privacy</a>
            <a href="/terms" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/terms"); }} className="hover:text-white">Terms</a>
          </div>
        </div>
      </footer>
      <LegalFooter onNavigatePath={onNavigatePath} />

      <Modal isOpen={showGuestConfirm} onClose={() => setShowGuestConfirm(false)} title="Continue as Guest?" className="max-w-md">
        <div className="space-y-4 text-slate-200">
          <p className="text-sm leading-6 text-slate-300">
            Guest games are not saved. You can play basic Play vs AI and local board practice, but multiplayer, history, leaderboard, profile, friends, messages, tournaments, and saved stats require login.
          </p>
          <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm font-bold text-amber-100">
            Login anytime to unlock full ChessPlay features.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={continueAsGuest} className="rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100d]">Continue as Guest</button>
            <button type="button" onClick={() => { setShowGuestConfirm(false); openLogin(); }} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">Login Instead</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAuth} onClose={() => setShowAuth(false)} title={isLogin ? "Sign in to ChessPlay" : "Create your ChessPlay account"} className="max-w-md">
        <Auth onLogin={handleAuthSuccess} isModal initialIsLogin={isLogin} onToggleMode={() => setIsLogin(!isLogin)} onNavigatePath={onNavigatePath} />
      </Modal>
    </div>
  );
}
