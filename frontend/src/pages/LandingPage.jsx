import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Modal } from "../components/ui";
import LegalFooter from "../components/common/LegalFooter";
import { BACKEND_URL } from "../config/runtime";

const Auth = lazy(() => import("../features/auth/components/Auth"));

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

const STAT_LABELS = [
  ["totalGames", "Total games played"],
  ["registeredUsers", "Registered players"],
  ["aiGames", "AI games played"],
  ["multiplayerGames", "Multiplayer games"],
  ["puzzlesSolved", "Puzzles solved"],
  ["activeRooms", "Active rooms"],
];

const VALUE_PROPS = [
  ["Play", "Play real chess online, against AI, or with friends."],
  ["Analyze", "Review games and understand where mistakes happen."],
  ["Improve", "Train specific weaknesses instead of random practice."],
];

const IMPROVEMENT_FLOW = [
  ["Play a game", "Start with guest mode, AI practice, local play, or a live multiplayer room."],
  ["Analyze your moves", "Use game history and analysis tools to review finished games."],
  ["Detect weaknesses", "Coming next: deeper post-game analysis and weakness detection."],
  ["Train focused areas", "Use puzzles and practice games to work on specific patterns."],
  ["Track improvement", "Follow rating, history, leaderboard position, and profile progress over time."],
];

const FEATURES = [
  ["Play vs AI", "Practice against the current Stockfish-powered AI board."],
  ["Multiplayer", "Create or join live rooms with authenticated players."],
  ["Legal move validation", "Board logic blocks illegal moves using the app chess engine."],
  ["Game history", "Signed-in players can review saved games."],
  ["Leaderboard", "Public leaderboard data is available from the live backend."],
  ["Friends", "Friend lists and empty states are wired for authenticated users."],
  ["Notifications", "Notification listing is available with a safe empty state."],
  ["Puzzles", "Beginner puzzle flow is available, with saved progress where supported."],
  ["Profile and settings", "Players can manage profile, appearance, privacy, and account settings."],
  ["Analysis and coaching", "Coming next: deeper post-game analysis and weakness detection."],
];

const PREVIEWS = [
  ["Board", "Play vs AI", "Stockfish practice, legal moves, resign, hints, and time controls."],
  ["Dashboard", "Player dashboard", "Profile summary, quick actions, history, leaderboard, and puzzles."],
  ["Leaderboard", "Progress view", "Rankings are backed by registered player and game data."],
  ["Profile", "Account areas", "Profile, friends, notifications, settings, and history use authenticated routes."],
];

const COMPARISON_ROWS = [
  ["Play chess", "Basic board play", "AI, local practice, and authenticated multiplayer routes"],
  ["AI practice", "Usually available", "Available through the current Play vs AI screen"],
  ["Multiplayer", "Often available", "Room-based multiplayer with socket-backed game state"],
  ["Game history", "Varies by app", "Saved history for signed-in players"],
  ["Improvement focus", "Often generic", "Positioned around review, practice, and progress tracking"],
  ["Weakness training roadmap", "Not always clear", "Clearly marked as coming next, not claimed as live"],
];

const FAQS = [
  ["Is ChessPlay free?", "Yes. You can start playing for free. Some supporter and premium areas may have limits or paid options as the product grows."],
  ["Can I play without an account?", "Yes. Guest mode supports basic Play vs AI and local board practice. Saved history, friends, multiplayer, profile, and settings require an account."],
  ["Can I play against AI?", "Yes. The Play vs AI screen is live and uses the current chess engine flow."],
  ["Can I play multiplayer?", "Yes. Authenticated users can use the online multiplayer route and socket-backed rooms."],
  ["Does ChessPlay analyze my games?", "Basic review and analysis areas exist. Deeper post-game analysis and weakness detection are coming next."],
  ["Is ChessPlay mobile friendly?", "Yes. The homepage and main play flows are designed for phone, tablet, and desktop screens."],
  ["What is coming next?", "The roadmap focus is deeper analysis, weakness detection, and more targeted training loops."],
];

function formatMetric(value) {
  if (value === null || value === undefined) return "Tracking soon";
  if (!Number.isFinite(Number(value))) return "Tracking soon";
  return new Intl.NumberFormat("en").format(Number(value));
}

export default function LandingPage({ onLogin, onGuestPlay, onNavigatePath }) {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loadingAction, setLoadingAction] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showGuestConfirm, setShowGuestConfirm] = useState(false);
  const [publicStats, setPublicStats] = useState(null);
  const [statsLoaded, setStatsLoaded] = useState(false);

  const productPoints = useMemo(() => ["Play", "Analyze", "Improve", "Track"], []);

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

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);

    async function loadPublicStats() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/public/stats`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Stats unavailable");
        setPublicStats(await response.json());
      } catch {
        setPublicStats(null);
      } finally {
        window.clearTimeout(timeout);
        setStatsLoaded(true);
      }
    }

    loadPublicStats();
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const openSignup = () => {
    setMobileMenuOpen(false);
    setLoadingAction("signup");
    window.history.pushState({}, "", "/register");
    window.setTimeout(() => {
      setIsLogin(false);
      setShowAuth(true);
      setLoadingAction("");
    }, 100);
  };

  const openLogin = () => {
    setMobileMenuOpen(false);
    setLoadingAction("login");
    window.history.pushState({}, "", "/login");
    window.setTimeout(() => {
      setIsLogin(true);
      setShowAuth(true);
      setLoadingAction("");
    }, 100);
  };

  const playNow = () => {
    setMobileMenuOpen(false);
    setShowGuestConfirm(true);
  };

  const practiceAi = () => {
    setMobileMenuOpen(false);
    localStorage.setItem("selectedTimeControl", "3+0");
    onNavigatePath?.("/play-ai");
    onGuestPlay();
  };

  const continueAsGuest = () => {
    setShowGuestConfirm(false);
    onNavigatePath?.("/play");
    onGuestPlay();
  };

  const handleAuthSuccess = (userData) => {
    setShowAuth(false);
    onLogin(userData);
  };

  const navItems = [
    { href: "#stats", label: "Stats" },
    { href: "#improve", label: "Improve" },
    { href: "#features", label: "Features" },
    { href: "#preview", label: "Preview" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F9FAFB]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-black">
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0B0F19]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3" aria-label="Go to ChessPlay homepage top">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#F4B400] text-2xl font-black text-[#0B0F19]">♞</span>
            <span className="font-['Montserrat'] text-xl font-black">ChessPlay</span>
          </button>

          <nav className="hidden items-center gap-5 text-sm font-bold text-[#9CA3AF] lg:flex" aria-label="Homepage navigation">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="rounded-md px-2 py-1 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#F4B400]">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <button type="button" onClick={openLogin} disabled={Boolean(loadingAction)} className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70">
              {loadingAction === "login" ? "Opening..." : "Log in"}
            </button>
            <button type="button" onClick={openSignup} disabled={Boolean(loadingAction)} className="rounded-md bg-[#F4B400] px-4 py-2 text-sm font-black text-[#0B0F19] transition hover:bg-[#ffd166] disabled:cursor-not-allowed disabled:opacity-70">
              {loadingAction === "signup" ? "Loading..." : "Create account"}
            </button>
          </div>

          <button
            type="button"
            className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-black text-white sm:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-home-menu"
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            Menu
          </button>
        </div>

        {mobileMenuOpen ? (
          <div id="mobile-home-menu" className="border-t border-white/10 bg-[#0B0F19] px-4 py-4 sm:hidden">
            <nav className="grid gap-2" aria-label="Mobile homepage navigation">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="rounded-md bg-white/[0.05] px-4 py-3 text-sm font-bold text-slate-200">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={openLogin} className="rounded-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white">Log in</button>
              <button type="button" onClick={openSignup} className="rounded-md bg-[#F4B400] px-4 py-3 text-sm font-black text-[#0B0F19]">Create account</button>
            </div>
          </div>
        ) : null}
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 opacity-25" aria-hidden="true">
            <div className="grid h-full grid-cols-8">
              {BOARD.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
                const light = (rowIndex + colIndex) % 2 === 0;
                return (
                  <div key={`${rowIndex}-${colIndex}`} className={`grid place-items-center ${light ? "bg-[#111827]" : "bg-[#1F2937]"}`}>
                    <span className="text-5xl text-white/10 md:text-8xl">{PIECES[piece] || ""}</span>
                  </div>
                );
              }))}
            </div>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#0B0F19_0%,rgba(11,15,25,0.94)_42%,rgba(11,15,25,0.72)_100%)]" aria-hidden="true" />

          <div className="relative mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl content-center gap-10 px-4 py-14 md:px-8 lg:grid-cols-[minmax(0,1fr)_460px]">
            <div className="max-w-3xl">
              <p className="mb-5 inline-flex rounded-md border border-[#F4B400]/30 bg-[#F4B400]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#F4B400]">
                Global launch homepage
              </p>
              <h1 className="font-['Montserrat'] text-4xl font-black leading-tight text-white sm:text-5xl md:text-7xl">
                Play Chess. Find Your Weaknesses. Improve Faster.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#D1D5DB] sm:text-lg md:text-xl md:leading-8">
                ChessPlay helps players practice, analyze mistakes, detect weak areas, and train smarter with AI-powered chess tools.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={playNow} className="rounded-md bg-[#F4B400] px-6 py-4 text-base font-black text-[#0B0F19] transition hover:-translate-y-0.5 hover:bg-[#ffd166] focus:outline-none focus:ring-2 focus:ring-[#F4B400]">
                  Start Playing
                </button>
                <button type="button" onClick={practiceAi} className="rounded-md border border-white/15 bg-white/10 px-6 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70">
                  Practice vs AI
                </button>
              </div>
              <button type="button" onClick={openSignup} className="mt-5 text-sm font-bold text-[#F4B400] underline-offset-4 hover:underline">
                Create free account
              </button>
              <div className="mt-8 flex flex-wrap gap-2" aria-label="ChessPlay product focus">
                {productPoints.map((item) => (
                  <span key={item} className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">{item}</span>
                ))}
              </div>
            </div>

            <div className="hidden self-center lg:block" aria-label="ChessPlay product preview">
              <div className="rounded-lg border border-white/10 bg-[#111827]/88 p-4 shadow-2xl shadow-black/30">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-white">Current app preview</h2>
                    <p className="text-xs text-[#9CA3AF]">Board, dashboard, history, and training routes</p>
                  </div>
                  <span className="rounded-md bg-[#F4B400]/15 px-3 py-1 text-xs font-black text-[#F4B400]">Live routes</span>
                </div>
                <div className="grid grid-cols-8 overflow-hidden rounded-md border border-black/40" role="img" aria-label="Chess board product preview">
                  {BOARD.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
                    const light = (rowIndex + colIndex) % 2 === 0;
                    const isWhite = piece && piece === piece.toUpperCase();
                    return (
                      <div key={`${rowIndex}-${colIndex}`} className={`grid aspect-square place-items-center text-2xl ${light ? "bg-[#E5D5B7]" : "bg-[#4B6F44]"}`}>
                        <span className={isWhite ? "text-[#FFF8EA] drop-shadow" : "text-[#111827]"}>{PIECES[piece] || ""}</span>
                      </div>
                    );
                  }))}
                </div>
                <div className="mt-4 grid gap-2">
                  {["AI practice ready", "Leaderboard connected", "Friends and notifications wired"].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-md border border-white/10 bg-[#1F2937] px-3 py-2 text-sm">
                      <span className="font-bold text-slate-200">{item}</span>
                      <span className="text-[#F4B400]">Ready</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="stats" className="mx-auto max-w-7xl px-4 py-12 md:px-8" aria-labelledby="stats-heading">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="stats-heading" className="font-['Montserrat'] text-3xl font-black md:text-4xl">Live product stats</h2>
              <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">Only real aggregate backend data is shown. Unavailable metrics stay clearly marked.</p>
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">{statsLoaded ? "Updated from API" : "Loading API data"}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {STAT_LABELS.map(([key, label]) => (
              <article key={key} className="rounded-lg border border-white/10 bg-[#111827] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">{label}</p>
                <p className="mt-3 font-['Montserrat'] text-2xl font-black text-white">{formatMetric(publicStats?.[key])}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 md:px-8" aria-labelledby="value-heading">
          <div className="max-w-2xl">
            <h2 id="value-heading" className="font-['Montserrat'] text-3xl font-black md:text-5xl">Built around improvement, not just moves.</h2>
            <p className="mt-3 text-[#9CA3AF]">ChessPlay is becoming a focused training loop: play, review, find patterns, train, and measure progress.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {VALUE_PROPS.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-white/10 bg-[#111827] p-6">
                <h3 className="font-['Montserrat'] text-2xl font-black text-[#F4B400]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#D1D5DB]">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="improve" className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">How ChessPlay improves you</h2>
            <p className="mt-4 text-sm leading-7 text-[#D1D5DB]">
              The product direction is honest and practical: start with playable chess, then make every saved game more useful for training.
            </p>
            <button type="button" onClick={practiceAi} className="mt-6 rounded-md bg-[#F4B400] px-5 py-3 font-black text-[#0B0F19]">
              Practice vs AI
            </button>
          </div>
          <div className="grid gap-3">
            {IMPROVEMENT_FLOW.map(([title, copy], index) => (
              <article key={title} className="flex gap-4 rounded-lg border border-white/10 bg-[#111827] p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#4F46E5]/20 font-black text-[#A5B4FC]">{index + 1}</span>
                <div>
                  <h3 className="font-['Montserrat'] text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="mb-8 max-w-2xl">
            <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Real features, clearly labeled.</h2>
            <p className="mt-3 text-[#9CA3AF]">No fake claims, no fake testimonials, and no inflated launch numbers.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-white/10 bg-[#111827] p-5 transition hover:border-[#F4B400]/50">
                <h3 className="font-['Montserrat'] text-lg font-black text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="preview" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Product preview</h2>
              <p className="mt-4 text-sm leading-7 text-[#D1D5DB]">
                This preview uses the current app structure: board play, dashboard, leaderboard, profile, history, friends, and notifications.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={playNow} className="rounded-md bg-[#F4B400] px-5 py-3 font-black text-[#0B0F19]">Start Playing</button>
                <button type="button" onClick={openSignup} className="rounded-md border border-white/15 bg-white/10 px-5 py-3 font-black text-white">Create Account</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PREVIEWS.map(([tag, title, copy]) => (
                <article key={title} className="rounded-lg border border-white/10 bg-[#111827] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F4B400]">{tag}</p>
                  <h3 className="mt-3 font-['Montserrat'] text-xl font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 md:px-8" aria-labelledby="comparison-heading">
          <h2 id="comparison-heading" className="font-['Montserrat'] text-3xl font-black md:text-5xl">A focused chess training direction.</h2>
          <div className="mt-8 overflow-hidden rounded-lg border border-white/10">
            <div className="grid grid-cols-[1fr_1fr_1fr] bg-[#1F2937] text-sm font-black text-white">
              <div className="p-4">Area</div>
              <div className="p-4">Basic chess apps</div>
              <div className="p-4 text-[#F4B400]">ChessPlay</div>
            </div>
            {COMPARISON_ROWS.map(([area, basic, chessPlay]) => (
              <div key={area} className="grid grid-cols-[1fr_1fr_1fr] border-t border-white/10 text-sm text-[#D1D5DB]">
                <div className="p-4 font-bold text-white">{area}</div>
                <div className="p-4">{basic}</div>
                <div className="p-4">{chessPlay}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="max-w-2xl">
            <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">FAQ</h2>
            <p className="mt-3 text-[#9CA3AF]">Clear answers for launch visitors.</p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {FAQS.map(([question, answer]) => (
              <article key={question} className="rounded-lg border border-white/10 bg-[#111827] p-5">
                <h3 className="font-['Montserrat'] text-lg font-black">{question}</h3>
                <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="start" className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="rounded-lg border border-[#F4B400]/25 bg-[#F4B400]/10 p-8 text-center md:p-12">
            <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Start improving your chess today.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#D1D5DB]">Play a quick guest game or create a free account for saved progress and player tools.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={playNow} className="rounded-md bg-[#F4B400] px-6 py-4 font-black text-[#0B0F19]">Start Playing</button>
              <button type="button" onClick={openSignup} className="rounded-md border border-white/15 bg-white/10 px-6 py-4 font-black text-white">Create Account</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 text-sm text-[#9CA3AF] md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-3 text-white">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-[#F4B400] text-xl font-black text-[#0B0F19]">♞</span>
              <span className="font-['Montserrat'] text-lg font-black">ChessPlay</span>
            </div>
            <p className="mt-3 max-w-sm leading-6">Play chess, review progress, and train smarter at getchessplay.com.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <h3 className="font-black text-white">Product</h3>
              <div className="mt-3 grid gap-2">
                <button type="button" onClick={practiceAi} className="text-left hover:text-white">Practice vs AI</button>
                <a href="/leaderboard" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/leaderboard"); }} className="hover:text-white">Leaderboard</a>
                <a href="/puzzles" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/puzzles"); }} className="hover:text-white">Puzzles</a>
              </div>
            </div>
            <div>
              <h3 className="font-black text-white">Company</h3>
              <div className="mt-3 grid gap-2">
                <button type="button" onClick={openSignup} className="text-left hover:text-white">Create account</button>
                <a href="/support" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/support"); }} className="hover:text-white">Support</a>
                <a href="/contact" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/contact"); }} className="hover:text-white">Contact</a>
              </div>
            </div>
            <div>
              <h3 className="font-black text-white">Legal</h3>
              <div className="mt-3 grid gap-2">
                <a href="/privacy" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/privacy"); }} className="hover:text-white">Privacy</a>
                <a href="/terms" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/terms"); }} className="hover:text-white">Terms</a>
                <a href="/delete-account" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/delete-account"); }} className="hover:text-white">Delete account</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      <LegalFooter onNavigatePath={onNavigatePath} />

      <Modal isOpen={showGuestConfirm} onClose={() => setShowGuestConfirm(false)} title="Continue as Guest?" className="max-w-md">
        <div className="space-y-4 text-slate-200">
          <p className="text-sm leading-6 text-slate-300">
            Guest games are not saved. You can play basic Play vs AI and local board practice, but multiplayer, history, leaderboard, profile, friends, messages, tournaments, and saved stats require login.
          </p>
          <div className="rounded-md border border-[#F4B400]/30 bg-[#F4B400]/10 p-3 text-sm font-bold text-[#F4B400]">
            Login anytime to unlock the full ChessPlay player experience.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={continueAsGuest} className="rounded-md bg-[#F4B400] px-4 py-3 text-sm font-black text-[#0B0F19]">Continue as Guest</button>
            <button type="button" onClick={() => { setShowGuestConfirm(false); openLogin(); }} className="rounded-md border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">Login Instead</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAuth} onClose={() => setShowAuth(false)} title={isLogin ? "Sign in to ChessPlay" : "Create your ChessPlay account"} className="max-w-md">
        <Suspense fallback={<div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-sm font-bold text-slate-200">Loading secure sign in...</div>}>
          <Auth onLogin={handleAuthSuccess} isModal initialIsLogin={isLogin} onToggleMode={() => setIsLogin(!isLogin)} onNavigatePath={onNavigatePath} />
        </Suspense>
      </Modal>
    </div>
  );
}
