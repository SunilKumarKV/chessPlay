import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import SupporterBadge from "../components/billing/SupporterBadge";
import { apiClient } from "../services/apiClient";
import PuzzleBoard from "../features/puzzles/components/PuzzleBoard";
import PuzzleControls from "../features/puzzles/components/PuzzleControls";
import PuzzleDifficultyTabs from "../features/puzzles/components/PuzzleDifficultyTabs";
import PuzzleLimitModal from "../features/puzzles/components/PuzzleLimitModal";
import PuzzleResultModal from "../features/puzzles/components/PuzzleResultModal";
import PuzzleStatsCard from "../features/puzzles/components/PuzzleStatsCard";

function squareFromCoords(row, col) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function moveToUci(move) {
  if (!move) return "";
  return `${move.from}${move.to}${move.promotion || ""}`.toLowerCase();
}

function makeGame(fen) {
  try {
    return new Chess(fen);
  } catch {
    return new Chess();
  }
}

function Skeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]" aria-label="Loading puzzles">
      <div className="h-[38rem] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.06]" />
      <div className="h-[38rem] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.06]" />
    </div>
  );
}

function EmptyState({ message, onRefresh }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-xl shadow-black/20">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#81b64c]/15 text-2xl" aria-hidden="true">◇</div>
      <h3 className="font-['Montserrat'] text-xl font-black text-white">No puzzles available</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">{message}</p>
      <button type="button" onClick={onRefresh} className="mt-5 rounded-xl bg-[#81b64c] px-5 py-3 text-sm font-black text-[#07100a] transition hover:bg-[#93c85f]">
        Refresh
      </button>
    </div>
  );
}

export default function PuzzlesPage({ user, onBack, onNavigate }) {
  const [difficulty, setDifficulty] = useState("beginner");
  const [themeFilter, setThemeFilter] = useState("");
  const [puzzle, setPuzzle] = useState(null);
  const [game, setGame] = useState(() => new Chess());
  const [moveIndex, setMoveIndex] = useState(1);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [hint, setHint] = useState(null);
  const [hintState, setHintState] = useState({ used: 0, limit: 1, loading: false });
  const [limits, setLimits] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [limitModal, setLimitModal] = useState(null);
  const [emptyMessage, setEmptyMessage] = useState("");

  const completed = Boolean(result?.completed);
  const progress = useMemo(() => {
    if (!puzzle) return "Move 0/0";
    const current = Math.min(Math.floor((moveIndex + 1) / 2), puzzle.playerMoveCount || 1);
    return `Move ${current}/${puzzle.playerMoveCount || 1}`;
  }, [moveIndex, puzzle]);

  const refreshStats = useCallback(async () => {
    try {
      const [statsData, historyData, limitsData] = await Promise.all([
        apiClient("/api/puzzles/stats/me", { skipAuthRefresh: true }),
        apiClient("/api/puzzles/history/me", { skipAuthRefresh: true }),
        apiClient("/api/puzzles/limits/me", { skipAuthRefresh: true }),
      ]);
      setStats(statsData.stats || null);
      setHistory(Array.isArray(historyData.history) ? historyData.history : []);
      setLimits(limitsData.limits || statsData.limits || null);
    } catch {
      setStats(null);
    }
  }, []);

  const loadPuzzle = useCallback(async (nextDifficulty = difficulty, options = {}) => {
    setLoading(true);
    setFeedback(null);
    setHint(null);
    setResult(null);
    setSelectedSquare(null);
    setEmptyMessage("");

    try {
      const params = new URLSearchParams({ difficulty: nextDifficulty });
      if (themeFilter) params.set("theme", themeFilter);
      if (options.fresh) params.set("fresh", "1");
      const data = await apiClient(`/api/puzzles/next?${params.toString()}`, { skipAuthRefresh: true });
      setLimits(data.limits || null);
      if (!data.puzzle) {
        setPuzzle(null);
        setEmptyMessage(data.message || "Import the Lichess CC0 puzzle CSV or seed sample puzzles to begin.");
        return;
      }
      setPuzzle(data.puzzle);
      setGame(makeGame(data.puzzle.fen));
      setMoveIndex(data.puzzle.moveIndex || 1);
      setLastMove(data.puzzle.initialMove ? { from: data.puzzle.initialMove.slice(0, 2), to: data.puzzle.initialMove.slice(2, 4) } : null);
      setHintState({ used: 0, limit: data.limits?.isPremium ? 3 : 1, loading: false });
      await refreshStats();
    } catch (error) {
      if (error.status === 402 || error.status === 429) {
        setLimitModal(error.data || { message: error.message });
        setLimits(error.data?.limits || null);
      } else {
        setEmptyMessage(error.message || "Puzzle service is unavailable.");
      }
      setPuzzle(null);
    } finally {
      setLoading(false);
    }
  }, [difficulty, refreshStats, themeFilter]);

  useEffect(() => {
    loadPuzzle(difficulty);
  }, [difficulty, loadPuzzle]);

  const resetCurrentPuzzle = () => {
    if (!puzzle) return;
    setGame(makeGame(puzzle.fen));
    setMoveIndex(puzzle.moveIndex || 1);
    setSelectedSquare(null);
    setLastMove(puzzle.initialMove ? { from: puzzle.initialMove.slice(0, 2), to: puzzle.initialMove.slice(2, 4) } : null);
    setFeedback(null);
    setHint(null);
    setResult(null);
  };

  const legalMoveFromSelection = (from, to) => {
    const clone = makeGame(game.fen());
    const piece = clone.get(from);
    const promotion = piece?.type === "p" && (to.endsWith("8") || to.endsWith("1")) ? "q" : undefined;
    const move = clone.move({ from, to, promotion });
    return move ? { move, clone } : null;
  };

  const submitMove = async (from, to) => {
    if (!puzzle || completed || submitting) return;
    const legal = legalMoveFromSelection(from, to);
    if (!legal) {
      setFeedback({ type: "error", message: "Illegal move. Try another candidate move." });
      return;
    }

    const uci = moveToUci(legal.move);
    setSubmitting(true);
    setSelectedSquare(null);
    try {
      const data = await apiClient(`/api/puzzles/${puzzle.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ move: uci, moveIndex }),
        skipAuthRefresh: true,
      });

      setGame(makeGame(data.fen));
      setLastMove(data.opponentMove
        ? { from: data.opponentMove.slice(0, 2), to: data.opponentMove.slice(2, 4) }
        : { from: uci.slice(0, 2), to: uci.slice(2, 4) });
      setMoveIndex(data.moveIndex ?? moveIndex);

      if (data.correct) {
        setFeedback({ type: "success", message: data.message || "Correct." });
        if (data.completed) {
          setResult({ completed: true, learning: data.learning });
          await refreshStats();
        }
      } else {
        setFeedback({ type: "error", message: data.message || "Try again." });
      }
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to validate that move." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSquareClick = (row, col) => {
    if (!puzzle || completed || submitting) return;
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
    submitMove(selectedSquare, square);
  };

  const loadHint = async () => {
    if (!puzzle || hintState.loading) return;
    setHintState((current) => ({ ...current, loading: true }));
    try {
      const data = await apiClient(`/api/puzzles/${puzzle.id}/hint`, {
        method: "POST",
        body: JSON.stringify({ moveIndex }),
        skipAuthRefresh: true,
      });
      setHint(data.hint || null);
      setHintState({ used: data.hintsUsed || 0, limit: data.hintsLimit || 1, loading: false });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "No hint is available." });
      setHintState((current) => ({ ...current, loading: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#07100d] text-white">
      <PuzzleLimitModal limit={limitModal} onClose={() => setLimitModal(null)} onUpgrade={() => onNavigate?.("pricing")} />
      <PuzzleResultModal result={result} onClose={() => setResult(null)} onNext={() => loadPuzzle(difficulty, { fresh: true })} />
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 xl:p-8">
        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#132017] via-[#0b1512] to-[#030706] p-5 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#81b64c]/30 bg-[#81b64c]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#b8f28f]">Trainer</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">Lichess CC0</span>
                {user?.isSupporter || user?.isPremium ? <SupporterBadge user={user} /> : null}
              </div>
              <h1 className="mt-4 font-['Montserrat'] text-3xl font-black md:text-5xl">Chess Puzzles</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                Thousands of tactical puzzles available with daily limits by plan, full-line validation, hints, and post-solve learning notes.
              </p>
              <p className="mt-3 text-sm text-slate-500">Puzzle data source: Lichess open database (CC0).</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/15">Back</button>
              <button type="button" onClick={() => onNavigate?.("pricing")} className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-300/15">Upgrade</button>
            </div>
          </div>
        </header>

        <PuzzleDifficultyTabs value={difficulty} limits={limits} onChange={setDifficulty} />

        {loading ? <Skeleton /> : !puzzle ? (
          <EmptyState message={emptyMessage} onRefresh={() => loadPuzzle(difficulty)} />
        ) : (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/25 md:p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#81b64c]/15 px-3 py-1 text-xs font-black text-[#b8f28f]">{puzzle.theme || "tactic"}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{puzzle.difficulty}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">Rating {puzzle.rating}</span>
                    {puzzle.isPremium ? <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-black text-amber-100">Premium</span> : null}
                  </div>
                  <h2 className="mt-3 font-['Montserrat'] text-2xl font-black text-white">Daily Puzzle</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{progress} · {game.turn() === "w" ? "White" : "Black"} to move</p>
                </div>
                <div className="rounded-2xl bg-black/20 px-4 py-3 text-sm font-bold text-slate-300">
                  {limits?.remaining ?? 0} remaining today
                </div>
              </div>

              <PuzzleBoard
                game={game}
                selectedSquare={selectedSquare}
                lastMove={lastMove}
                completed={completed || submitting}
                onSquareClick={handleSquareClick}
              />

              <PuzzleControls
                disabled={completed || submitting}
                feedback={feedback}
                hint={hint}
                hintState={hintState}
                onHint={loadHint}
                onReset={resetCurrentPuzzle}
                onNext={() => loadPuzzle(difficulty, { fresh: true })}
              />
            </div>

            <aside className="space-y-5">
              <PuzzleStatsCard stats={stats} limits={limits} history={history} />

              <div className="rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-5 shadow-xl shadow-black/20">
                <h2 className="font-['Montserrat'] text-xl font-black text-amber-50">Premium training</h2>
                <p className="mt-2 text-sm leading-6 text-amber-100/85">Free players get a clear daily allowance. Premium plans raise the daily limit, unlock advanced and master puzzles, and provide more hints per puzzle.</p>
                {limits?.isPremium ? (
                  <label className="mt-4 block text-sm font-bold text-amber-50">
                    Theme filter
                    <select
                      value={themeFilter}
                      onChange={(event) => setThemeFilter(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-amber-200/30 bg-black/20 px-3 py-3 text-sm font-bold text-amber-50 outline-none"
                    >
                      <option value="">All themes</option>
                      <option value="mate">Mate</option>
                      <option value="fork">Fork</option>
                      <option value="pin">Pin</option>
                      <option value="sacrifice">Sacrifice</option>
                      <option value="endgame">Endgame</option>
                    </select>
                  </label>
                ) : null}
                <button type="button" onClick={() => onNavigate?.("pricing")} className="mt-4 w-full rounded-xl bg-amber-200 px-4 py-3 text-sm font-black text-[#2a1a00] transition hover:bg-amber-100">View plans</button>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20">
                <h2 className="font-['Montserrat'] text-xl font-black text-white">Learning focus</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">{puzzle.learning?.whatYouLearned || "Find forcing moves and verify the reply."}</p>
                {puzzle.gameUrl ? (
                  <a href={puzzle.gameUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/15">
                    Source game
                  </a>
                ) : null}
              </div>
            </aside>
          </section>
        )}
      </div>
    </div>
  );
}
