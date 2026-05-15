import { useEffect } from "react";

const modes = [
  { title: "Play vs AI", icon: "🤖", badge: "Free", text: "Practice instantly against engine-powered opponents and learn with hints when you need them.", action: "ai" },
  { title: "Play Online", icon: "🌐", badge: "Login required", text: "Create or join online rooms with real-time multiplayer and server-side move validation.", action: "multi" },
  { title: "Play vs Player", icon: "♟", badge: "Free", text: "Play a local chess match on the same device with friend-friendly controls.", action: "local" },
  { title: "Puzzles", icon: "◇", badge: "Free", text: "Train tactics like checkmates, forks, pins, and endgame patterns.", action: "puzzles" },
  { title: "Analysis", icon: "∑", badge: "Free", text: "Review FEN/PGN positions, explore ideas, and save notes when supported.", action: "analysis" },
  { title: "Tournaments", icon: "🏆", badge: "Registration", text: "Discover upcoming events and register when community tournaments are open.", action: "tournaments" },
  { title: "Community", icon: "☷", badge: "Free", text: "Share feedback, report bugs, request features, and follow ChessPlay updates.", action: "community" },
];

const steps = [
  { title: "Learn", text: "Start with the rules, puzzles, and simple game modes that work on desktop and mobile." },
  { title: "Play", text: "Choose AI practice, online rooms, same-device play, or tournament registration when available." },
  { title: "Improve", text: "Use game history, puzzles, analysis, and your profile to understand progress over time." },
  { title: "Compete", text: "Join leaderboards, online games, and community tournaments as the platform grows." },
  { title: "Connect", text: "Use community, messages, referrals, and feedback to help improve ChessPlay." },
];

const faqs = [
  ["Is ChessPlay free?", "Yes. Core gameplay remains free, including AI practice, local play, online rooms, puzzles, and basic analysis."],
  ["Do I need an account?", "You can read this guide and use some public areas without an account. Sign in to save history, use messages, submit supporter requests, and access protected features."],
  ["How does Play Online work?", "Create a room or join with a room code. Existing multiplayer validation and room state remain handled by the backend."],
  ["What is the Supporter Plan?", "It is an optional way to support ChessPlay. Supporter requests are manually verified by admin before badges or no-ads benefits are enabled."],
  ["Can I play on mobile?", "Yes. The app is built with responsive layouts for phone, tablet, and desktop screens."],
];

const roadmap = ["More puzzle packs", "Advanced analysis", "Tournament improvements", "Offline/WiFi experiments", "Community features"];

function setMeta(name, content) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function ActionButton({ children, onClick, variant = "primary" }) {
  const styles = variant === "primary"
    ? "bg-[#81b64c] text-[#07100a] hover:bg-[#93c85f] shadow-lg shadow-[#81b64c]/20"
    : "border border-white/10 bg-white/10 text-white hover:bg-white/15";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-5 py-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#a8e36f] ${styles}`}
    >
      {children}
    </button>
  );
}

export default function HowItWorksPage({ user, onBack, onNavigate, onOpenAuth }) {
  const isSignedIn = Boolean(user && !user.isGuest);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "How ChessPlay Works | ChessPlay";
    setMeta("description", "Learn how to play, practice, compete, connect, and support ChessPlay without any fake claims or hidden gameplay paywalls.");
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const go = (page) => onNavigate?.(page);

  return (
    <div className="min-h-full bg-[#030706] text-white">
      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(129,182,76,0.18),transparent_34%),rgba(255,255,255,0.055)] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-[#81b64c]/30 bg-[#81b64c]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#a8e36f]">
                Player guide
              </p>
              <h1 className="mt-5 font-['Montserrat'] text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                How ChessPlay Works
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Learn how to play, practice, compete, and grow with ChessPlay. Core chess gameplay stays free while optional supporter features help maintain hosting, development, and future improvements.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <ActionButton onClick={() => go("ai")}>Start Playing</ActionButton>
                {isSignedIn ? (
                  <ActionButton onClick={() => go("dashboard")} variant="secondary">Go to Dashboard</ActionButton>
                ) : (
                  <ActionButton onClick={() => onOpenAuth?.("register")} variant="secondary">Create Account</ActionButton>
                )}
                <ActionButton onClick={() => go("monetization")} variant="secondary">View Premium</ActionButton>
              </div>
            </div>

            <aside className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
              <h2 className="font-['Montserrat'] text-xl font-black">Free core gameplay</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Play vs AI, online rooms, local player mode, starter puzzles, and basic analysis are not blocked behind a paywall.
              </p>
              <div className="mt-5 grid gap-2 text-sm">
                {["No fake income claims", "Manual supporter verification", "Mobile-friendly routes", "No protected API calls on this page"].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-300">
                    <span className="text-[#81b64c]" aria-hidden="true">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="ChessPlay timeline">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#81b64c]/15 text-sm font-black text-[#a8e36f]">{index + 1}</span>
              <h2 className="mt-4 font-['Montserrat'] text-xl font-black">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl md:p-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#81b64c]">Choose a mode</p>
              <h2 className="mt-2 font-['Montserrat'] text-3xl font-black">One app for learning, playing, and connecting</h2>
            </div>
            <ActionButton onClick={() => go("dashboard")} variant="secondary">Open app</ActionButton>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modes.map((mode) => (
              <article key={mode.title} className="group rounded-3xl border border-white/10 bg-black/20 p-5 transition hover:-translate-y-1 hover:border-[#81b64c]/35 hover:bg-white/[0.065] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-3xl" aria-hidden="true">{mode.icon}</span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{mode.badge}</span>
                </div>
                <h3 className="mt-4 font-['Montserrat'] text-xl font-black">{mode.title}</h3>
                <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-400">{mode.text}</p>
                <button type="button" onClick={() => go(mode.action)} className="mt-4 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/15" aria-label={`Open ${mode.title}`}>
                  Open {mode.title}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl md:p-8">
            <h2 className="font-['Montserrat'] text-3xl font-black">Frequently asked questions</h2>
            <div className="mt-6 divide-y divide-white/10 rounded-3xl border border-white/10 bg-black/20">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group p-5" open={question === "Is ChessPlay free?"}>
                  <summary className="cursor-pointer list-none font-black text-white focus:outline-none focus:ring-2 focus:ring-[#81b64c]">
                    {question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{answer}</p>
                </details>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-6 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">Supporter optional</p>
              <h2 className="mt-2 font-['Montserrat'] text-2xl font-black text-amber-50">Support ChessPlay</h2>
              <p className="mt-3 text-sm leading-6 text-amber-100/80">
                Supporter benefits include a badge, no ads when ads are enabled, early feature access, priority feedback, and future themes. Requests are manually verified by admin.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <ActionButton onClick={() => go("monetization")}>View Premium</ActionButton>
                <ActionButton onClick={() => go("pricing")} variant="secondary">Support / Pricing</ActionButton>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
              <h2 className="font-['Montserrat'] text-xl font-black">Future roadmap</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {roadmap.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[#81b64c]" aria-hidden="true">•</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => go("community")} className="mt-5 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">
                Sponsor a feature idea
              </button>
            </div>
          </aside>
        </section>

        <section className="rounded-[2rem] border border-[#81b64c]/20 bg-[#81b64c]/10 p-6 text-center backdrop-blur-xl md:p-10">
          <h2 className="font-['Montserrat'] text-3xl font-black">Ready for your next move?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Start a game, create an account, or explore the supporter page. Every button here points to an existing ChessPlay route.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <ActionButton onClick={() => go("ai")}>Start Playing</ActionButton>
            {isSignedIn ? (
              <ActionButton onClick={() => go("dashboard")} variant="secondary">Go to Dashboard</ActionButton>
            ) : (
              <ActionButton onClick={() => onOpenAuth?.("login")} variant="secondary">Login</ActionButton>
            )}
          </div>
        </section>

        {onBack ? (
          <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/15">
            ← Back
          </button>
        ) : null}
      </main>
    </div>
  );
}
