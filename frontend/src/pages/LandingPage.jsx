import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Modal } from "../components/ui";
import LegalFooter from "../components/common/LegalFooter";
import { BACKEND_URL } from "../config/runtime";
import { SOCIAL_LINKS } from "../config/socialLinks";

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
  ["totalGames", "Games Played"],
  ["registeredUsers", "Players"],
  ["aiGames", "AI Games"],
  ["multiplayerGames", "Multiplayer Games"],
  ["puzzlesSolved", "Puzzles Solved"],
  ["activeRooms", "Active Rooms"],
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

const INTERACTIVE_CARD_CLASS = "rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] p-5 shadow-[0_18px_54px_var(--home-shadow)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-[var(--home-accent)] hover:shadow-[0_24px_70px_var(--home-glow)]";
const SECTION_CLASS = "scroll-mt-24 mx-auto max-w-7xl px-4 py-12 md:px-8";
const PRIMARY_CTA_CLASS = "rounded-xl bg-[var(--home-accent)] px-6 py-4 text-base font-black text-[var(--home-accent-ink)] shadow-[0_18px_42px_var(--home-glow)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_64px_var(--home-glow)] focus:outline-none focus:ring-2 focus:ring-[var(--home-accent)]";
const SECONDARY_CTA_CLASS = "rounded-xl border border-[var(--home-border)] bg-[var(--home-card-strong)] px-6 py-4 text-base font-black text-[var(--home-text)] shadow-[0_14px_34px_var(--home-shadow)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-[var(--home-accent)] hover:shadow-[0_20px_54px_var(--home-glow)] focus:outline-none focus:ring-2 focus:ring-[var(--home-accent)]";

function getInitialHomepageTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function homeThemeVars(themeMode) {
  if (themeMode === "light") {
    return {
      "--home-bg": "#F8FAFC",
      "--home-bg-soft": "#EEF2FF",
      "--home-surface": "rgba(255,255,255,0.76)",
      "--home-card": "rgba(255,255,255,0.72)",
      "--home-card-strong": "rgba(255,255,255,0.9)",
      "--home-text": "#0B1220",
      "--home-muted": "#526072",
      "--home-border": "rgba(15,23,42,0.12)",
      "--home-accent": "#B77900",
      "--home-accent-soft": "rgba(183,121,0,0.12)",
      "--home-accent-ink": "#FFFFFF",
      "--home-secondary": "#4F46E5",
      "--home-shadow": "rgba(15,23,42,0.12)",
      "--home-glow": "rgba(183,121,0,0.22)",
      "--home-board-light": "#F0DEC1",
      "--home-board-dark": "#648057",
      "--home-board-piece-dark": "#111827",
      "--home-board-piece-light": "#FFF8EA",
    };
  }

  return {
    "--home-bg": "#0B0F19",
    "--home-bg-soft": "#111827",
    "--home-surface": "rgba(17,24,39,0.72)",
    "--home-card": "rgba(17,24,39,0.66)",
    "--home-card-strong": "rgba(31,41,55,0.72)",
    "--home-text": "#F9FAFB",
    "--home-muted": "#AAB3C2",
    "--home-border": "rgba(255,255,255,0.12)",
    "--home-accent": "#F4B400",
    "--home-accent-soft": "rgba(244,180,0,0.12)",
    "--home-accent-ink": "#0B0F19",
    "--home-secondary": "#818CF8",
    "--home-shadow": "rgba(0,0,0,0.28)",
    "--home-glow": "rgba(244,180,0,0.24)",
    "--home-board-light": "#E5D5B7",
    "--home-board-dark": "#4B6F44",
    "--home-board-piece-dark": "#111827",
    "--home-board-piece-light": "#FFF8EA",
  };
}

function formatMetric(value) {
  if (!Number.isFinite(Number(value))) return "0";
  return new Intl.NumberFormat("en").format(Number(value));
}

function runWhenIdle(callback) {
  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, { timeout: 1800 });
  }
  return window.setTimeout(callback, 250);
}

function cancelIdleRun(id) {
  if ("cancelIdleCallback" in window) window.cancelIdleCallback(id);
  else window.clearTimeout(id);
}

export default function LandingPage({ onLogin, onGuestPlay, onNavigatePath }) {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loadingAction, setLoadingAction] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showGuestConfirm, setShowGuestConfirm] = useState(false);
  const [publicStats, setPublicStats] = useState({});
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [themeMode, setThemeMode] = useState(getInitialHomepageTheme);

  const productPoints = useMemo(() => ["Play", "Analyze", "Improve", "Track"], []);
  const themeVars = useMemo(() => homeThemeVars(themeMode), [themeMode]);

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
    localStorage.setItem("theme", themeMode);
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

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
        setPublicStats({});
      } finally {
        window.clearTimeout(timeout);
        setStatsLoaded(true);
      }
    }

    const idleId = runWhenIdle(loadPublicStats);
    return () => {
      window.clearTimeout(timeout);
      cancelIdleRun(idleId);
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

  const toggleTheme = () => {
    setThemeMode((current) => current === "dark" ? "light" : "dark");
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
    <div className="min-h-screen bg-[var(--home-bg)] text-[var(--home-text)] transition-colors duration-200" style={themeVars}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-black">
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-[var(--home-border)] bg-[var(--home-surface)] shadow-[0_12px_42px_var(--home-shadow)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3" aria-label="Go to ChessPlay homepage top">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--home-accent)] text-2xl font-black text-[var(--home-accent-ink)] shadow-[0_12px_30px_var(--home-glow)]">♞</span>
            <span className="font-['Montserrat'] text-xl font-black">ChessPlay</span>
          </button>

          <nav className="hidden items-center gap-5 text-sm font-bold text-[var(--home-muted)] lg:flex" aria-label="Homepage navigation">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="rounded-md px-2 py-1 transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--home-accent-soft)] hover:text-[var(--home-text)] focus:outline-none focus:ring-2 focus:ring-[var(--home-accent)]">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <button type="button" onClick={toggleTheme} className="rounded-xl border border-[var(--home-border)] bg-[var(--home-card)] px-3 py-2 text-sm font-black text-[var(--home-text)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--home-accent)] hover:shadow-[0_12px_34px_var(--home-glow)]" aria-label={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}>
              {themeMode === "dark" ? "Light" : "Dark"}
            </button>
            <button type="button" onClick={openLogin} disabled={Boolean(loadingAction)} className="rounded-xl border border-[var(--home-border)] bg-[var(--home-card)] px-4 py-2 text-sm font-bold text-[var(--home-text)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--home-accent)] hover:shadow-[0_12px_34px_var(--home-glow)] disabled:cursor-not-allowed disabled:opacity-70">
              {loadingAction === "login" ? "Opening..." : "Log in"}
            </button>
            <button type="button" onClick={openSignup} disabled={Boolean(loadingAction)} className="rounded-xl bg-[var(--home-accent)] px-4 py-2 text-sm font-black text-[var(--home-accent-ink)] shadow-[0_12px_34px_var(--home-glow)] transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70">
              {loadingAction === "signup" ? "Loading..." : "Create account"}
            </button>
          </div>

          <button
            type="button"
            className="rounded-xl border border-[var(--home-border)] bg-[var(--home-card)] px-3 py-2 text-sm font-black text-[var(--home-text)] sm:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-home-menu"
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            Menu
          </button>
        </div>

        {mobileMenuOpen ? (
          <div id="mobile-home-menu" className="border-t border-[var(--home-border)] bg-[var(--home-surface)] px-4 py-4 shadow-[0_18px_42px_var(--home-shadow)] backdrop-blur-xl sm:hidden">
            <nav className="grid gap-2" aria-label="Mobile homepage navigation">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-[var(--home-border)] bg-[var(--home-card)] px-4 py-3 text-sm font-bold text-[var(--home-text)]">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={toggleTheme} className="rounded-xl border border-[var(--home-border)] bg-[var(--home-card)] px-4 py-3 text-sm font-black text-[var(--home-text)]" aria-label={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}>{themeMode === "dark" ? "Light mode" : "Dark mode"}</button>
              <button type="button" onClick={openLogin} className="rounded-xl border border-[var(--home-border)] bg-[var(--home-card)] px-4 py-3 text-sm font-black text-[var(--home-text)]">Log in</button>
              <button type="button" onClick={openSignup} className="rounded-xl bg-[var(--home-accent)] px-4 py-3 text-sm font-black text-[var(--home-accent-ink)]">Create account</button>
            </div>
          </div>
        ) : null}
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-[var(--home-border)]">
          <div className="absolute inset-0 opacity-25" aria-hidden="true">
            <div className="grid h-full grid-cols-8">
              {BOARD.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
                const light = (rowIndex + colIndex) % 2 === 0;
                return (
                  <div key={`${rowIndex}-${colIndex}`} className={`grid place-items-center ${light ? "bg-[var(--home-bg-soft)]" : "bg-[var(--home-card-strong)]"}`}>
                    <span className="text-5xl text-[var(--home-muted)]/20 md:text-8xl">{PIECES[piece] || ""}</span>
                  </div>
                );
              }))}
            </div>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--home-bg)_0%,color-mix(in_srgb,var(--home-bg)_94%,transparent)_46%,color-mix(in_srgb,var(--home-bg)_74%,transparent)_100%)]" aria-hidden="true" />

          <div className="relative mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl content-center gap-10 px-4 py-14 md:px-8 lg:grid-cols-[minmax(0,1fr)_460px]">
            <div className="max-w-3xl">
              <p className="mb-5 inline-flex rounded-full border border-[var(--home-accent)]/30 bg-[var(--home-accent-soft)] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--home-accent)] shadow-[0_14px_34px_var(--home-glow)] backdrop-blur-xl">
                AI-powered chess improvement platform
              </p>
              <h1 className="font-['Montserrat'] text-4xl font-black leading-tight text-[var(--home-text)] sm:text-5xl md:text-7xl">
                Play Chess. Find Your Weaknesses. Improve Faster.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--home-muted)] sm:text-lg md:text-xl md:leading-8">
                Play chess. Analyze mistakes. Find weaknesses. Improve faster. ChessPlay combines real games, AI practice, game history, puzzles, and a focused roadmap for smarter training.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={playNow} className={PRIMARY_CTA_CLASS}>
                  Start Playing
                </button>
                <button type="button" onClick={practiceAi} className={SECONDARY_CTA_CLASS}>
                  Practice vs AI
                </button>
              </div>
              <button type="button" onClick={openSignup} className="mt-5 cursor-pointer text-sm font-bold text-[var(--home-accent)] underline-offset-4 transition duration-200 hover:-translate-y-0.5 hover:underline">
                Create free account
              </button>
              <div className="mt-8 flex flex-wrap gap-2" aria-label="ChessPlay product focus">
                {productPoints.map((item) => (
                  <span key={item} className="rounded-full border border-[var(--home-border)] bg-[var(--home-card)] px-3 py-1 text-xs font-bold text-[var(--home-muted)] shadow-[0_10px_24px_var(--home-shadow)] backdrop-blur-xl">{item}</span>
                ))}
              </div>
            </div>

            <div className="hidden self-center lg:block" aria-label="ChessPlay product preview">
              <div className="rounded-3xl border border-[var(--home-border)] bg-[var(--home-card)] p-4 shadow-[0_26px_90px_var(--home-shadow)] backdrop-blur-2xl transition duration-200 hover:-translate-y-1 hover:border-[var(--home-accent)] hover:shadow-[0_34px_110px_var(--home-glow)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-[var(--home-text)]">Current app preview</h2>
                    <p className="text-xs text-[var(--home-muted)]">Board, dashboard, history, and training routes</p>
                  </div>
                  <span className="rounded-full bg-[var(--home-accent-soft)] px-3 py-1 text-xs font-black text-[var(--home-accent)]">Live routes</span>
                </div>
                <div className="grid grid-cols-8 overflow-hidden rounded-2xl border border-[var(--home-border)] shadow-[inset_0_0_38px_var(--home-shadow)]" role="img" aria-label="Chess board product preview">
                  {BOARD.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
                    const light = (rowIndex + colIndex) % 2 === 0;
                    const isWhite = piece && piece === piece.toUpperCase();
                    return (
                      <div key={`${rowIndex}-${colIndex}`} className={`grid aspect-square place-items-center text-2xl ${light ? "bg-[var(--home-board-light)]" : "bg-[var(--home-board-dark)]"}`}>
                        <span className={isWhite ? "text-[var(--home-board-piece-light)] drop-shadow" : "text-[var(--home-board-piece-dark)]"}>{PIECES[piece] || ""}</span>
                      </div>
                    );
                  }))}
                </div>
                <div className="mt-4 grid gap-2">
                  {["AI practice ready", "Leaderboard connected", "Friends and notifications wired"].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-xl border border-[var(--home-border)] bg-[var(--home-card-strong)] px-3 py-2 text-sm">
                      <span className="font-bold text-[var(--home-text)]">{item}</span>
                      <span className="text-[var(--home-accent)]">Ready</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="stats" className={SECTION_CLASS} aria-labelledby="stats-heading">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="stats-heading" className="font-['Montserrat'] text-3xl font-black md:text-4xl">Live platform stats</h2>
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--home-muted)]">{statsLoaded ? "Live data" : "Loading"}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {STAT_LABELS.map(([key, label]) => (
              <article key={key} className={`${INTERACTIVE_CARD_CLASS} cursor-default p-4`}>
                <p className="text-xs font-bold text-[var(--home-muted)]">{label}</p>
                <p className="mt-3 font-['Montserrat'] text-2xl font-black text-[var(--home-text)]">{statsLoaded ? formatMetric(publicStats?.[key]) : "0"}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={SECTION_CLASS} aria-labelledby="value-heading">
          <div className="max-w-2xl">
            <h2 id="value-heading" className="font-['Montserrat'] text-3xl font-black md:text-5xl">Built around improvement, not just moves.</h2>
            <p className="mt-3 text-[var(--home-muted)]">ChessPlay is becoming a focused training loop: play, review, find patterns, train, and measure progress.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {VALUE_PROPS.map(([title, copy]) => (
              <article key={title} className={INTERACTIVE_CARD_CLASS}>
                <h3 className="font-['Montserrat'] text-2xl font-black text-[var(--home-accent)]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--home-muted)]">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="improve" className="scroll-mt-24 mx-auto grid max-w-7xl gap-6 px-4 py-12 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">How ChessPlay improves you</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--home-muted)]">
              The product direction is practical: make every saved game more useful for review, practice, and focused training.
            </p>
            <button type="button" onClick={practiceAi} className={`${PRIMARY_CTA_CLASS} mt-6 px-5 py-3 text-sm`}>
              Practice vs AI
            </button>
          </div>
          <div className="grid gap-3">
            {IMPROVEMENT_FLOW.map(([title, copy], index) => (
              <article key={title} className={`${INTERACTIVE_CARD_CLASS} flex gap-4`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--home-secondary)]/20 font-black text-[var(--home-secondary)]">{index + 1}</span>
                <div>
                  <h3 className="font-['Montserrat'] text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--home-muted)]">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className={SECTION_CLASS}>
          <div className="mb-8 max-w-2xl">
            <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Real features, clearly labeled.</h2>
            <p className="mt-3 text-[var(--home-muted)]">No inflated launch numbers. Roadmap capabilities are labeled as roadmap.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([title, copy]) => (
              <article key={title} className={INTERACTIVE_CARD_CLASS}>
                <h3 className="font-['Montserrat'] text-lg font-black text-[var(--home-text)]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--home-muted)]">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="preview" className={SECTION_CLASS}>
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Product preview</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--home-muted)]">
                This preview uses the current app structure: board play, dashboard, leaderboard, profile, history, friends, and notifications.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={playNow} className={`${PRIMARY_CTA_CLASS} px-5 py-3 text-sm`}>Start Playing</button>
                <button type="button" onClick={openSignup} className={`${SECONDARY_CTA_CLASS} px-5 py-3 text-sm`}>Create Account</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PREVIEWS.map(([tag, title, copy]) => (
                <article key={title} className={INTERACTIVE_CARD_CLASS}>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--home-accent)]">{tag}</p>
                  <h3 className="mt-3 font-['Montserrat'] text-xl font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--home-muted)]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="comparison" className={SECTION_CLASS} aria-labelledby="comparison-heading">
          <h2 id="comparison-heading" className="font-['Montserrat'] text-3xl font-black md:text-5xl">A focused chess training direction.</h2>
          <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--home-border)] bg-[var(--home-card)] shadow-[0_24px_70px_var(--home-shadow)] backdrop-blur-xl">
            <div className="grid grid-cols-[1fr_1fr_1fr] bg-[var(--home-card-strong)] text-sm font-black text-[var(--home-text)]">
              <div className="p-4">Area</div>
              <div className="p-4">Basic chess apps</div>
              <div className="p-4 text-[var(--home-accent)]">ChessPlay</div>
            </div>
            {COMPARISON_ROWS.map(([area, basic, chessPlay]) => (
              <div key={area} className="grid grid-cols-[1fr_1fr_1fr] border-t border-[var(--home-border)] text-sm text-[var(--home-muted)] transition duration-200 hover:bg-[var(--home-accent-soft)]">
                <div className="p-4 font-bold text-[var(--home-text)]">{area}</div>
                <div className="p-4">{basic}</div>
                <div className="p-4">{chessPlay}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className={SECTION_CLASS}>
          <div className="max-w-2xl">
            <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">FAQ</h2>
            <p className="mt-3 text-[var(--home-muted)]">Clear answers for launch visitors.</p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {FAQS.map(([question, answer]) => (
              <article key={question} className={INTERACTIVE_CARD_CLASS}>
                <h3 className="font-['Montserrat'] text-lg font-black">{question}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--home-muted)]">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="start" className={SECTION_CLASS}>
          <div className="rounded-3xl border border-[var(--home-accent)]/30 bg-[var(--home-accent-soft)] p-8 text-center shadow-[0_28px_90px_var(--home-glow)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-[var(--home-accent)] md:p-12">
            <h2 className="font-['Montserrat'] text-3xl font-black md:text-5xl">Start improving your chess today.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[var(--home-muted)]">Play a quick guest game or create a free account for saved progress and player tools.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={playNow} className={PRIMARY_CTA_CLASS}>Start Playing</button>
              <button type="button" onClick={openSignup} className={SECONDARY_CTA_CLASS}>Create Account</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--home-border)] bg-[var(--home-surface)] px-4 py-8 shadow-[0_-18px_54px_var(--home-shadow)] backdrop-blur-xl md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 text-sm text-[var(--home-muted)] md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-3 text-[var(--home-text)]">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--home-accent)] text-xl font-black text-[var(--home-accent-ink)]">♞</span>
              <span className="font-['Montserrat'] text-lg font-black">ChessPlay</span>
            </div>
            <p className="mt-3 max-w-sm leading-6">Play chess, review progress, and train smarter at getchessplay.com.</p>
          </div>
          <div className={`grid gap-6 sm:grid-cols-2 ${SOCIAL_LINKS.length ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            <div>
              <h3 className="font-black text-[var(--home-text)]">Product</h3>
              <div className="mt-3 grid gap-2">
                <button type="button" onClick={practiceAi} className="text-left transition hover:text-[var(--home-text)]">Practice vs AI</button>
                <a href="/leaderboard" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/leaderboard"); }} className="transition hover:text-[var(--home-text)]">Leaderboard</a>
                <a href="/puzzles" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/puzzles"); }} className="transition hover:text-[var(--home-text)]">Puzzles</a>
              </div>
            </div>
            <div>
              <h3 className="font-black text-[var(--home-text)]">Company</h3>
              <div className="mt-3 grid gap-2">
                <button type="button" onClick={openSignup} className="text-left transition hover:text-[var(--home-text)]">Create account</button>
                <a href="/support" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/support"); }} className="transition hover:text-[var(--home-text)]">Support</a>
                <a href="/contact" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/contact"); }} className="transition hover:text-[var(--home-text)]">Contact</a>
              </div>
            </div>
            <div>
              <h3 className="font-black text-[var(--home-text)]">Legal</h3>
              <div className="mt-3 grid gap-2">
                <a href="/privacy" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/privacy"); }} className="transition hover:text-[var(--home-text)]">Privacy</a>
                <a href="/terms" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/terms"); }} className="transition hover:text-[var(--home-text)]">Terms</a>
                <a href="/delete-account" onClick={(event) => { event.preventDefault(); onNavigatePath?.("/delete-account"); }} className="transition hover:text-[var(--home-text)]">Delete account</a>
              </div>
            </div>
            {SOCIAL_LINKS.length ? (
              <div>
                <h3 className="font-black text-[var(--home-text)]">Social</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SOCIAL_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      aria-label={link.ariaLabel}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="rounded-xl border border-[var(--home-border)] bg-[var(--home-card)] px-3 py-2 text-xs font-black text-[var(--home-text)] shadow-[0_10px_24px_var(--home-shadow)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--home-accent)] hover:text-[var(--home-accent)] hover:shadow-[0_16px_42px_var(--home-glow)] focus:outline-none focus:ring-2 focus:ring-[var(--home-accent)]"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </footer>
      <LegalFooter onNavigatePath={onNavigatePath} />

      <Modal isOpen={showGuestConfirm} onClose={() => setShowGuestConfirm(false)} title="Continue as Guest?" className="max-w-md">
        <div className="space-y-4 text-slate-200">
          <p className="text-sm leading-6 text-slate-300">
            Guest games are not saved. You can play basic Play vs AI and local board practice, but multiplayer, history, leaderboard, profile, friends, messages, tournaments, and saved stats require login.
          </p>
          <div className="rounded-md border border-[var(--home-accent)]/30 bg-[var(--home-accent-soft)] p-3 text-sm font-bold text-[var(--home-accent)]">
            Login anytime to unlock the full ChessPlay player experience.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={continueAsGuest} className="rounded-md bg-[var(--home-accent)] px-4 py-3 text-sm font-black text-[var(--home-accent-ink)]">Continue as Guest</button>
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
