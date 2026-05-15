import { PrimaryBtn, SecondaryBtn } from "../components/ui";
import { useTheme } from "../hooks/useTheme";

const FEATURE_COPY = {
  puzzles: {
    icon: "◇",
    title: "Chess Puzzles",
    subtitle: "Tactics trainer is being prepared for public release.",
    description:
      "This section will include daily puzzles, puzzle rating, streaks, and themed tactical patterns like forks, pins, skewers, mates, and endgames.",
    checklist: ["Daily challenge", "Puzzle rating", "Streak tracking", "Difficulty levels"],
  },
  analysis: {
    icon: "∑",
    title: "Game Analysis",
    subtitle: "Post-game analysis is being prepared for public release.",
    description:
      "This section will help players review mistakes, blunders, best moves, opening accuracy, and engine evaluation after each game.",
    checklist: ["Move accuracy", "Blunder detection", "Engine lines", "PGN review"],
  },
};

export default function ComingSoonPage({ feature = "feature", onBack, onPlay }) {
  const { theme } = useTheme();
  if (feature === "puzzles") {
    const puzzleBoard = [
      ["", "", "", "", "k", "", "", "r"],
      ["", "", "", "", "", "p", "p", "p"],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "Q", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["P", "P", "P", "", "", "P", "P", "P"],
      ["", "", "", "", "K", "", "", "R"],
    ];
    const pieces = { k: "♚", r: "♜", p: "♟", Q: "♕", P: "♙", K: "♔", R: "♖" };
    return (
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
        <section
          className="grid gap-6 rounded-2xl border p-5 md:grid-cols-[minmax(280px,420px)_1fr] md:p-8"
          style={{ borderColor: theme.border.secondary, backgroundColor: theme.bg.secondary, color: theme.text.primary }}
        >
          <div className="grid grid-cols-8 overflow-hidden rounded-xl border border-white/10">
            {puzzleBoard.flatMap((row, rowIndex) =>
              row.map((piece, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`grid aspect-square place-items-center text-2xl md:text-3xl ${(rowIndex + colIndex) % 2 === 0 ? "bg-[#e7d8bd] text-[#172019]" : "bg-[#527a45] text-white"}`}
                >
                  {pieces[piece] || ""}
                </div>
              )),
            )}
          </div>
          <div className="flex flex-col justify-center">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.24em]" style={{ color: theme.primary }}>
              Tactics trainer
            </p>
            <h1 className="font-['Montserrat'] text-3xl font-black md:text-5xl">
              Mate in one
            </h1>
            <p className="mt-4 leading-7" style={{ color: theme.text.tertiary }}>
              White to move. This starter puzzle gives clients a real training
              surface now, with rating, streaks, and puzzle history ready for a
              deeper v1.3 build.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Daily tactic", "Pattern labels", "Puzzle rating", "Streak ready"].map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryBtn onClick={onPlay}>Practice with AI</PrimaryBtn>
              <SecondaryBtn onClick={onBack}>Back to Dashboard</SecondaryBtn>
            </div>
          </div>
        </section>
      </div>
    );
  }
  const copy = FEATURE_COPY[feature] || {
    icon: "♟",
    title: "Feature Coming Soon",
    subtitle: "We are polishing this feature.",
    description:
      "This area is planned for a future ChessPlay release. The page is intentionally handled so navigation never feels broken.",
    checklist: ["Production route", "Safe fallback", "Clear user message"],
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
      <section
        className="relative overflow-hidden rounded-2xl border p-6 md:p-10 shadow-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(129,182,76,0.14), rgba(56,189,248,0.08), rgba(15,23,42,0.88))",
          borderColor: theme.border.secondary,
          color: theme.text.primary,
        }}
      >
        <div className="absolute right-8 top-8 text-8xl opacity-10 md:text-9xl">
          {copy.icon}
        </div>
        <div className="relative max-w-2xl">
          <div
            className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border text-3xl"
            style={{ borderColor: theme.border.secondary, backgroundColor: theme.bg.secondary }}
          >
            {copy.icon}
          </div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.28em]" style={{ color: theme.primary }}>
            v1.1 beta roadmap
          </p>
          <h1 className="mb-3 font-['Montserrat'] text-3xl font-black md:text-5xl">
            {copy.title}
          </h1>
          <p className="mb-4 text-xl font-semibold" style={{ color: theme.text.secondary }}>
            {copy.subtitle}
          </p>
          <p className="mb-8 leading-7" style={{ color: theme.text.tertiary }}>
            {copy.description}
          </p>

          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            {copy.checklist.map((item) => (
              <div
                key={item}
                className="rounded-xl border px-4 py-3 text-sm font-semibold"
                style={{ borderColor: theme.border.secondary, backgroundColor: "rgba(255,255,255,0.05)" }}
              >
                <span style={{ color: theme.primary }}>✓</span> {item}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <PrimaryBtn onClick={onPlay}>Play vs AI Now</PrimaryBtn>
            <SecondaryBtn onClick={onBack}>Back to Dashboard</SecondaryBtn>
          </div>
        </div>
      </section>
    </div>
  );
}
