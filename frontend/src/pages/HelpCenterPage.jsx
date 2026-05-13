const HELP_SECTIONS = [
  {
    title: "Play vs AI",
    icon: "🤖",
    steps: [
      "Open Play AI from the sidebar.",
      "Choose Easy, Medium, Hard or Pro difficulty.",
      "Use the eval bar and move quality label to understand your position.",
      "Use Hint only when you want learning help.",
    ],
  },
  {
    title: "Multiplayer",
    icon: "🌐",
    steps: [
      "Open Play Online.",
      "Use Quick Match for auto-search, or create a private room.",
      "Share the room code with your friend.",
      "If connection drops, refresh and retry after the server reconnect message.",
    ],
  },
  {
    title: "Online matchmaking",
    icon: "⚔️",
    steps: [
      "Select Casual, Ranked, Blitz, Rapid, Beginner, Intermediate or Advanced.",
      "Click Find Opponent.",
      "ChessPlay pairs you by rating range and selected mode.",
      "Cancel search anytime before a match is found.",
    ],
  },
  {
    title: "Same WiFi",
    icon: "📶",
    steps: [
      "Both players should use the same network.",
      "Host creates a LAN room code or QR link.",
      "Second player joins using the code/link.",
      "Use reconnect if one browser tab refreshes.",
    ],
  },
  {
    title: "Analysis board",
    icon: "📊",
    steps: [
      "Open Analysis from the sidebar.",
      "Paste FEN/PGN or make moves on the separate analysis board.",
      "Analysis state is isolated from Play vs Player and multiplayer.",
      "Use engine depth based on your plan.",
    ],
  },
  {
    title: "Premium plans",
    icon: "👑",
    steps: [
      "Open Support / Pricing.",
      "Choose monthly, yearly or pro foundation.",
      "Pay using UPI and submit proof.",
      "Admin approval unlocks badge, no-ads and premium features.",
    ],
  },
  {
    title: "Support",
    icon: "💬",
    steps: [
      "Use Billing for plan status.",
      "Use Support / Pricing for payment proof.",
      "Use Settings for sound, board and theme preferences.",
      "Report bugs with exact page, browser and screenshot.",
    ],
  },
];

export default function HelpCenterPage({ onBack, onNavigate }) {
  return (
    <div className="min-h-full p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#81b64c]">How ChessPlay Works</p>
            <h1 className="mt-2 font-['Montserrat'] text-3xl font-black text-white sm:text-5xl">Learn every game mode quickly</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              A simple guide for AI practice, multiplayer, matchmaking, same WiFi play, analysis, premium plans and support.
            </p>
          </div>
          <button onClick={onBack} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-bold text-slate-100 hover:bg-white/15">← Back</button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {HELP_SECTIONS.map((section) => (
            <article key={section.title} className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="text-4xl">{section.icon}</div>
              <h2 className="mt-3 text-xl font-black text-white">{section.title}</h2>
              <ol className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                {section.steps.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#81b64c]/15 text-xs font-black text-[#9bd767]">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-3 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div>
            <h2 className="text-xl font-black text-amber-100">Want no ads and premium sounds?</h2>
            <p className="mt-1 text-sm text-amber-100/75">Support ChessPlay and unlock supporter features after admin approval.</p>
          </div>
          <button onClick={() => onNavigate?.("pricing")} className="rounded-xl bg-amber-300 px-5 py-3 font-black text-black hover:bg-amber-200">View Plans</button>
          <button onClick={() => onNavigate?.("multi")} className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 font-bold text-white hover:bg-white/15">Play Online</button>
        </div>
      </div>
    </div>
  );
}
