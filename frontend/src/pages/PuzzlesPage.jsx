import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import Board from "../features/chess/components/Board";
import SupporterBadge from "../components/billing/SupporterBadge";
import { apiClient } from "../services/apiClient";

const STARTER_PUZZLES = [
  {
    id: "starter-mate-1",
    title: "Back-rank mate pattern",
    fen: "6k1/5ppp/8/8/8/8/5PPP/5RK1 w - - 0 1",
    solution: ["f1f8"],
    moves: ["f1f8"],
    difficulty: "beginner",
    theme: "checkmate",
    instruction: "Find the checkmate in one move.",
    isLocal: true,
  },
  {
    id: "starter-fork-1",
    title: "Knight fork tactic",
    fen: "4k3/8/8/8/3n4/8/4K3/7R b - - 0 1",
    solution: ["d4f3"],
    moves: ["d4f3"],
    difficulty: "beginner",
    theme: "forks",
    instruction: "Find the knight move that attacks two targets.",
    isLocal: true,
  },
  {
    id: "starter-endgame-1",
    title: "King and queen coordination",
    fen: "6k1/8/8/8/8/8/5Q2/6K1 w - - 0 1",
    solution: ["f2a2"],
    moves: ["f2a2"],
    difficulty: "intermediate",
    theme: "endgames",
    instruction: "Improve the queen position and keep the king restricted.",
    isLocal: true,
  },
];

const CATEGORIES = [
  { id: "all", label: "All", copy: "Mixed tactical practice" },
  { id: "checkmate", label: "Checkmate", copy: "Finish winning attacks" },
  { id: "forks", label: "Forks", copy: "Attack two targets" },
  { id: "pins", label: "Pins", copy: "Freeze valuable pieces" },
  { id: "skewers", label: "Skewers", copy: "Force a line tactic" },
  { id: "endgames", label: "Endgames", copy: "Convert simple positions" },
  { id: "opening-traps", label: "Opening traps", copy: "Spot common traps" },
];

const DIFFICULTIES = ["all", "beginner", "intermediate", "advanced"];
const THEME_LABELS = {
  checkmate: "Checkmate",
  forks: "Forks",
  pins: "Pins",
  skewers: "Skewers",
  endgames: "Endgames",
  "opening-traps": "Opening traps",
  mixed: "Mixed",
};
const DIFFICULTY_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function squareFromCoords(row, col) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function moveToUci(move) {
  if (!move) return "";
  return `${move.from}${move.to}${move.promotion || ""}`.toLowerCase();
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-2xl border border-white/10 bg-[#101816] p-4 text-sm text-white shadow-2xl" role={isError ? "alert" : "status"}>
      <div className="flex items-start gap-3">
        <span className={isError ? "text-red-300" : "text-[#b8f28f]"}>{isError ? "⚠" : "✓"}</span>
        <p className="leading-6">{toast.message}</p>
        <button type="button" onClick={onClose} className="ml-2 text-slate-400 hover:text-white" aria-label="Close message">×</button>
      </div>
    </div>
  );
}

function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-xl shadow-black/20">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#81b64c]/15 text-2xl" aria-hidden="true">◇</div>
      <h3 className="font-['Montserrat'] text-xl font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">{message}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="mt-5 rounded-xl bg-[#81b64c] px-5 py-3 text-sm font-black text-[#07100a] transition hover:bg-[#93c85f]">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" aria-label="Loading puzzles">
      <div className="h-[38rem] animate-pulse rounded-3xl border border-white/10 bg-white/[0.06]" />
      <div className="h-[38rem] animate-pulse rounded-3xl border border-white/10 bg-white/[0.06]" />
    </div>
  );
}

export default function PuzzlesPage({ user, onBack, onNavigate }) {
  const [puzzles, setPuzzles] = useState([]);
  const [source, setSource] = useState("local");
  const [selectedTheme, setSelectedTheme] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [game, setGame] = useState(() => new Chess(STARTER_PUZZLES[0].fen));
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [playedMoves, setPlayedMoves] = useState([]);
  const [resultState, setResultState] = useState("ready");
  const [hintVisible, setHintVisible] = useState(false);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPuzzles() {
      setLoading(true);
      setApiError("");
      try {
        const params = new URLSearchParams();
        params.set("limit", "30");
        if (selectedTheme !== "all") params.set("theme", selectedTheme);
        if (selectedDifficulty !== "all") params.set("difficulty", selectedDifficulty);
        const data = await apiClient(`/api/puzzles?${params.toString()}`, { skipAuthRefresh: true });
        if (cancelled) return;
        const published = Array.isArray(data.puzzles) ? data.puzzles : [];
        setPuzzles(published.length ? published : STARTER_PUZZLES);
        setSource(published.length ? "api" : "local");
      } catch {
        if (cancelled) return;
        setPuzzles(STARTER_PUZZLES);
        setSource("local");
        setApiError("Live puzzle service is unavailable. Starter puzzles are available offline.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPuzzles();
    return () => { cancelled = true; };
  }, [selectedTheme, selectedDifficulty]);

  const visiblePuzzles = useMemo(() => puzzles.filter((puzzle) => {
    const themeOk = selectedTheme === "all" || puzzle.theme === selectedTheme;
    const difficultyOk = selectedDifficulty === "all" || puzzle.difficulty === selectedDifficulty;
    return themeOk && difficultyOk;
  }), [puzzles, selectedTheme, selectedDifficulty]);

  const activePuzzle = visiblePuzzles[activeIndex] || visiblePuzzles[0] || STARTER_PUZZLES[0];
  const expectedMove = String(activePuzzle?.solution?.[playedMoves.length] || activePuzzle?.moves?.[playedMoves.length] || "").toLowerCase();
  const completed = resultState === "completed";

  useEffect(() => {
    const nextPuzzle = visiblePuzzles[0] || STARTER_PUZZLES[0];
    setActiveIndex(0);
    setGame(new Chess(nextPuzzle.fen));
    setSelectedSquare(null);
    setPlayedMoves([]);
    setResultState("ready");
    setHintVisible(false);
    setSolutionVisible(false);
  }, [selectedTheme, selectedDifficulty, visiblePuzzles]);

  const resetPuzzle = (puzzle = activePuzzle) => {
    try {
      setGame(new Chess(puzzle.fen));
      setSelectedSquare(null);
      setPlayedMoves([]);
      setResultState("ready");
      setHintVisible(false);
      setSolutionVisible(false);
      setToast({ type: "success", message: "Puzzle reset." });
    } catch {
      setToast({ type: "error", message: "Unable to load board. Please refresh and try again." });
    }
  };

  const selectPuzzle = (index) => {
    const puzzle = visiblePuzzles[index];
    if (!puzzle) return;
    setActiveIndex(index);
    resetPuzzle(puzzle);
    setToast({ type: "success", message: "Puzzle loaded. Find the best move." });
  };

  const submitAttemptToApi = async (move) => {
    if (!user || activePuzzle?.isLocal || source !== "api") return;
    try {
      setSaving(true);
      await apiClient(`/api/puzzles/${activePuzzle.id}/attempt`, {
        method: "POST",
        body: JSON.stringify({ move }),
      });
    } catch {
      setToast({ type: "error", message: "Puzzle solved, but progress could not be saved." });
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (from, to) => {
    if (completed || !expectedMove) return;
    try {
      const clone = new Chess(game.fen());
      const move = clone.move({ from, to, promotion: "q" });
      if (!move) {
        setResultState("try-again");
        setToast({ type: "error", message: "Illegal move. Try another candidate move." });
        return;
      }
      const uci = moveToUci(move);
      if (uci !== expectedMove) {
        setResultState("try-again");
        setSelectedSquare(null);
        setToast({ type: "error", message: "Try again. Look for the tactic in the position." });
        return;
      }

      setGame(clone);
      const nextMoves = [...playedMoves, uci];
      setPlayedMoves(nextMoves);
      setSelectedSquare(null);
      if (nextMoves.length >= Math.max(activePuzzle.solution?.length || 0, activePuzzle.moves?.length || 0, 1)) {
        setResultState("completed");
        setToast({ type: "success", message: user ? "Correct. Puzzle completed." : "Correct. Sign in to save puzzle progress." });
        await submitAttemptToApi(uci);
      } else {
        setResultState("correct");
        setToast({ type: "success", message: "Correct move. Continue the tactic line." });
      }
    } catch {
      setResultState("try-again");
      setToast({ type: "error", message: "Unable to play that move. Please try again." });
    }
  };

  const handleSquareClick = (row, col) => {
    if (completed) return;
    const square = squareFromCoords(row, col);
    const piece = game.get(square);
    if (!selectedSquare) {
      if (piece && piece.color === game.turn()) setSelectedSquare(square);
      return;
    }
    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }
    handleMove(selectedSquare, square);
  };

  const nextPuzzle = () => {
    if (!visiblePuzzles.length) return;
    const nextIndex = (activeIndex + 1) % visiblePuzzles.length;
    selectPuzzle(nextIndex);
  };

  const showSolution = () => {
    setSolutionVisible(true);
    setToast({ type: "success", message: "Solution revealed. Reset the puzzle to try it again." });
  };

  const statusLabel = completed ? "Puzzle completed" : resultState === "try-again" ? "Try again" : resultState === "correct" ? "Correct" : "Find the best move";
  const progressUnavailable = !user || source === "local";

  return (
    <div className="min-h-screen bg-[#07100d] text-white">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 xl:p-8">
        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#132017] via-[#0b1512] to-[#030706] p-5 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#81b64c]/30 bg-[#81b64c]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#b8f28f]">Trainer</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{source === "api" ? "Live puzzles" : "Starter puzzles"}</span>
                {user?.isSupporter ? <SupporterBadge user={user} /> : null}
              </div>
              <h1 className="mt-4 font-['Montserrat'] text-3xl font-black md:text-5xl">Chess Puzzles</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                Practice tactics, checkmates, forks, pins, skewers, endgames, and opening traps. Puzzle moves are checked against the expected tactic line.
              </p>
              {!user ? (
                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                  Sign in to save your puzzle progress. You can still practice starter puzzles for free.
                </div>
              ) : null}
              {apiError ? (
                <div className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-300/10 p-4 text-sm text-sky-100">{apiError}</div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/15">Back</button>
              <button type="button" onClick={() => onNavigate?.("pricing")} className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-300/15">Support ChessPlay</button>
            </div>
          </div>
        </header>

        {loading ? <Skeleton /> : (
          <>
            <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Puzzle categories">
              {CATEGORIES.map((category) => (
                <button key={category.id} type="button" onClick={() => setSelectedTheme(category.id)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${selectedTheme === category.id ? "border-[#81b64c]/60 bg-[#81b64c]/15" : "border-white/10 bg-white/[0.06] hover:bg-white/[0.09]"}`}>
                  <div className="font-['Montserrat'] text-sm font-black text-white">{category.label}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{category.copy}</p>
                </button>
              ))}
            </section>

            <section className="flex flex-wrap gap-2" aria-label="Difficulty filters">
              {DIFFICULTIES.map((difficulty) => (
                <button key={difficulty} type="button" onClick={() => setSelectedDifficulty(difficulty)} className={`rounded-full px-4 py-2 text-sm font-black transition ${selectedDifficulty === difficulty ? "bg-[#81b64c] text-[#07100a]" : "border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/10"}`}>
                  {difficulty === "all" ? "All levels" : DIFFICULTY_LABELS[difficulty]}
                </button>
              ))}
            </section>

            {!visiblePuzzles.length ? (
              <EmptyState title="No puzzles found" message="No puzzle matched this filter. Try another category or difficulty." actionLabel="Show all puzzles" onAction={() => { setSelectedTheme("all"); setSelectedDifficulty("all"); }} />
            ) : (
              <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/25 md:p-6">
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#81b64c]/15 px-3 py-1 text-xs font-black text-[#b8f28f]">{THEME_LABELS[activePuzzle.theme] || "Mixed"}</span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{DIFFICULTY_LABELS[activePuzzle.difficulty] || "Beginner"}</span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{statusLabel}</span>
                      </div>
                      <h2 className="mt-3 font-['Montserrat'] text-2xl font-black text-white">{activePuzzle.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{activePuzzle.instruction || "Find the best move."}</p>
                    </div>
                    <div className="text-sm font-bold text-slate-400">Turn: <span className="text-white">{game.turn() === "w" ? "White" : "Black"}</span></div>
                  </div>

                  <div className="mx-auto w-full max-w-[min(82vw,620px)]">
                    <Board
                      board={game.board()}
                      onSquareClick={handleSquareClick}
                      flipped={false}
                      isSelected={(row, col) => selectedSquare === squareFromCoords(row, col)}
                      disabled={completed}
                    />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <button type="button" onClick={() => setHintVisible((value) => !value)} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15">{hintVisible ? "Hide Hint" : "Hint"}</button>
                    <button type="button" onClick={showSolution} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15">Solution</button>
                    <button type="button" onClick={() => resetPuzzle()} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15">Reset</button>
                    <button type="button" onClick={nextPuzzle} className="rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a] transition hover:bg-[#93c85f]">Next Puzzle</button>
                  </div>

                  {hintVisible ? (
                    <div className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-300/10 p-4 text-sm leading-6 text-sky-100">
                      Look for forcing moves first: checks, captures, threats, and overloaded defenders.
                    </div>
                  ) : null}
                  {solutionVisible ? (
                    <div className="mt-4 rounded-2xl border border-[#81b64c]/25 bg-[#81b64c]/10 p-4 text-sm leading-6 text-[#d8f8c8]">
                      Solution: <span className="font-black">{String(activePuzzle.solution?.[0] || activePuzzle.moves?.[0] || "Available after puzzle setup").toUpperCase()}</span>
                    </div>
                  ) : null}
                  {saving ? <p className="mt-3 text-xs text-slate-500">Saving puzzle progress...</p> : null}
                </div>

                <aside className="space-y-5">
                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20">
                    <h2 className="font-['Montserrat'] text-xl font-black text-white">Puzzle list</h2>
                    <p className="mt-1 text-sm text-slate-400">Choose a tactic set. No fake puzzle counts are displayed.</p>
                    <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                      {visiblePuzzles.map((puzzle, index) => (
                        <button key={puzzle.id || puzzle._id || `${puzzle.title}-${index}`} type="button" onClick={() => selectPuzzle(index)} className={`w-full rounded-2xl border p-4 text-left transition ${index === activeIndex ? "border-[#81b64c]/60 bg-[#81b64c]/15" : "border-white/10 bg-black/20 hover:bg-white/10"}`}>
                          <div className="font-bold text-white">{puzzle.title}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.12em]">
                            <span className="rounded-full bg-white/10 px-2 py-1 text-slate-300">{THEME_LABELS[puzzle.theme] || "Mixed"}</span>
                            <span className="rounded-full bg-white/10 px-2 py-1 text-slate-300">{DIFFICULTY_LABELS[puzzle.difficulty] || "Beginner"}</span>
                            <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-emerald-100">Available</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20">
                    <h2 className="font-['Montserrat'] text-xl font-black text-white">Progress</h2>
                    {progressUnavailable ? (
                      <p className="mt-3 text-sm leading-6 text-slate-400">Progress tracking is available after signing in and when live puzzle data is enabled.</p>
                    ) : (
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-2xl bg-black/20 p-3"><div className="text-xl font-black text-white">{user?.puzzlesSolved || 0}</div><div className="text-xs text-slate-400">Solved</div></div>
                        <div className="rounded-2xl bg-black/20 p-3"><div className="text-xl font-black text-white">{user?.puzzleRating || 1200}</div><div className="text-xs text-slate-400">Rating</div></div>
                        <div className="rounded-2xl bg-black/20 p-3"><div className="text-xl font-black text-white">—</div><div className="text-xs text-slate-400">Accuracy</div></div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-5 shadow-xl shadow-black/20">
                    <h2 className="font-['Montserrat'] text-xl font-black text-amber-50">Supporter early access</h2>
                    <p className="mt-2 text-sm leading-6 text-amber-100/85">Support ChessPlay to help build extra daily puzzle sets, advanced tactics roadmap, no-ads experience, custom board themes, and feature voting. Payments are manually verified by admin.</p>
                    <div className="mt-4 grid gap-2">
                      <button type="button" onClick={() => onNavigate?.("pricing")} className="rounded-xl bg-amber-200 px-4 py-3 text-sm font-black text-[#2a1a00] transition hover:bg-amber-100">Support ChessPlay</button>
                      <button type="button" onClick={() => onNavigate?.("billing")} className="rounded-xl border border-amber-200/30 bg-black/10 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-black/20">View payment status</button>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20">
                    <h2 className="font-['Montserrat'] text-xl font-black text-white">Puzzle roadmap</h2>
                    <ol className="mt-4 space-y-3 text-sm text-slate-300">
                      {[
                        "Phase 1: Starter tactics",
                        "Phase 2: Progress tracking",
                        "Phase 3: Puzzle rating",
                        "Phase 4: Puzzle tournaments",
                      ].map((item) => <li key={item} className="rounded-xl bg-black/20 px-4 py-3">{item}</li>)}
                    </ol>
                  </div>
                </aside>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
