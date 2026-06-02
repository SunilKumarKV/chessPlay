import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { apiClient } from "../services/apiClient";
import PuzzleBoard from "../features/puzzles/components/PuzzleBoard";
import PuzzleControls from "../features/puzzles/components/PuzzleControls";
import PuzzleDifficultyTabs from "../features/puzzles/components/PuzzleDifficultyTabs";
import PuzzleLimitModal from "../features/puzzles/components/PuzzleLimitModal";
import PuzzleResultModal from "../features/puzzles/components/PuzzleResultModal";
import PuzzleStatsCard from "../features/puzzles/components/PuzzleStatsCard";
import { trackEvent } from "../services/analytics";
import UpgradeModal from "../components/billing/UpgradeModal";
import ErrorBanner from "../components/common/ErrorBanner";
import { Badge, Button, Card, EmptyState as DesignEmptyState, LoadingState } from "../components/ui";

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
      <LoadingState label="Loading training board" className="min-h-[34rem]" />
      <LoadingState label="Loading training context" className="min-h-[18rem]" />
    </div>
  );
}

function PuzzleEmptyState({ message, onRefresh, onAiGame }) {
  return (
    <DesignEmptyState
      title="No puzzles available"
      message={message || "Train against AI while new puzzles load."}
      icon="◇"
      className="min-h-[320px]"
      action={(
        <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
          <Button type="button" onClick={onAiGame}>Start AI Game</Button>
          <Button type="button" variant="secondary" onClick={onRefresh}>Refresh</Button>
        </div>
      )}
    />
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
  const [shakeBoard, setShakeBoard] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");

  const completed = Boolean(result?.completed);
  const hasLimit = Number.isFinite(Number(limits?.limit));
  const hasRemaining = Number.isFinite(Number(limits?.remaining));
  const remainingLabel = hasLimit && hasRemaining
    ? `${Number(limits.remaining)}/${Number(limits.limit)} puzzles remaining today`
    : "Puzzle counter unavailable";
  const hasPuzzleRating = Number.isFinite(Number(puzzle?.rating));
  const trainingFocus = puzzle?.theme ? `${puzzle.theme} Practice` : "Tactical Practice";
  const currentGoal = puzzle
    ? `Find the best move for ${game.turn() === "w" ? "White" : "Black"} and complete the line.`
    : "Solve 5 focused puzzles today.";
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
      trackEvent("puzzle_start", { difficulty: nextDifficulty, puzzleId: data.puzzle.puzzleId });
      setGame(makeGame(data.puzzle.fen));
      setMoveIndex(data.puzzle.moveIndex || 1);
      setLastMove(data.puzzle.initialMove ? { from: data.puzzle.initialMove.slice(0, 2), to: data.puzzle.initialMove.slice(2, 4) } : null);
      setHintState({ used: 0, limit: data.limits?.isPremium ? 3 : 1, loading: false });
      await refreshStats();
    } catch (error) {
      if (error.status === 402 || error.status === 429) {
        setLimitModal(error.data || { message: error.message });
        setLimits(error.data?.limits || null);
      } else if (error.status === 404) {
        setEmptyMessage(error.message || "Train against AI while new puzzles load.");
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
      setShakeBoard(true);
      window.setTimeout(() => setShakeBoard(false), 360);
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
        setFeedback({ type: "success", message: data.completed ? "Great work. Keep building pattern recognition." : data.message || "Correct. Keep calculating the line." });
        if (data.completed) {
          setResult({ completed: true, learning: data.learning });
          await refreshStats();
        }
      } else {
        setFeedback({ type: "error", message: data.message || "Review the idea and try another puzzle." });
        setShakeBoard(true);
        window.setTimeout(() => setShakeBoard(false), 360);
      }
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to validate that move." });
      setShakeBoard(true);
      window.setTimeout(() => setShakeBoard(false), 360);
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
      if (error.status === 429) setUpgradeFeature("more puzzle hints");
      setHintState((current) => ({ ...current, loading: false }));
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-5 text-[var(--color-text-primary)] sm:px-6 lg:px-8">
      <PuzzleLimitModal limit={limitModal} onClose={() => setLimitModal(null)} onUpgrade={() => onNavigate?.("pricing")} />
      <PuzzleResultModal result={result} onClose={() => setResult(null)} onNext={() => loadPuzzle(difficulty, { fresh: true })} />
      <UpgradeModal open={Boolean(upgradeFeature)} feature={upgradeFeature} onClose={() => setUpgradeFeature("")} onNavigate={onNavigate} />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[var(--radius-3xl)] border border-[var(--color-border-primary)] bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent_34%),var(--color-bg-elevated)] p-5 shadow-[var(--shadow-xl)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">Training</Badge>
                <Badge tone="info">Focused puzzles</Badge>
                {user?.isSupporter || user?.isPremium ? <Badge tone="warning">Premium</Badge> : null}
              </div>
              <h1 className="mt-5 max-w-4xl font-[var(--font-display)] text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                Train Smarter. Improve Faster.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--color-text-secondary)] sm:text-lg">
                Target your weaknesses through focused chess training.
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Puzzle data source: Lichess open database (CC0).</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
              <Button type="button" variant="secondary" onClick={() => onNavigate?.("pricing")}>Upgrade</Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3" aria-label="Training focus">
          <TrainingFocusItem label="Current Focus" value={trainingFocus} tone="primary" />
          <TrainingFocusItem label="Recommended Today" value="Solve 5 puzzles" tone="success" />
          <TrainingFocusItem label="Estimated Time" value="5 minutes" tone="info" />
        </section>

        <PuzzleDifficultyTabs value={difficulty} limits={limits} onChange={setDifficulty} />
        <ErrorBanner message={feedback?.type === "error" && !puzzle ? feedback.message : ""} onRetry={() => loadPuzzle(difficulty, { fresh: true })} />

        {loading ? <Skeleton /> : !puzzle ? (
          <PuzzleEmptyState
            message={emptyMessage || "Train against AI while new puzzles load."}
            onRefresh={() => loadPuzzle(difficulty)}
            onAiGame={() => onNavigate?.("ai")}
          />
        ) : (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <Card variant="glass" className="order-1 p-4 sm:p-5 md:p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{puzzle.theme || "Tactical Practice"}</Badge>
                    {puzzle.difficulty ? <Badge tone="neutral">{puzzle.difficulty}</Badge> : null}
                    {hasPuzzleRating ? <Badge tone="neutral">Rating {Number(puzzle.rating)}</Badge> : null}
                    {puzzle.isPremium ? <Badge tone="warning">Premium</Badge> : null}
                  </div>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black">Puzzle Workspace</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{progress} · {game.turn() === "w" ? "White" : "Black"} to move</p>
                </div>
                <div className="rounded-[var(--radius-2xl)] bg-[var(--color-surface)] px-4 py-3 text-sm font-bold text-[var(--color-text-secondary)]">
                  {remainingLabel}
                </div>
              </div>

              <PuzzleBoard
                game={game}
                selectedSquare={selectedSquare}
                lastMove={lastMove}
                completed={completed || submitting}
                shake={shakeBoard}
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
            </Card>

            <aside className="order-2 space-y-5">
              <Card variant="glass">
                <h2 className="font-[var(--font-display)] text-xl font-black">Training context</h2>
                <div className="mt-4 space-y-3">
                  <ContextRow label="Current goal" value={currentGoal} />
                  <ContextRow label="Progress" value={progress} />
                  <ContextRow label="Focus" value={trainingFocus} />
                </div>
              </Card>

              <Card variant="subtle">
                <h2 className="font-[var(--font-display)] text-xl font-black">Completion state</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {feedback?.type === "success"
                    ? "Great work. Keep building pattern recognition."
                    : feedback?.type === "error"
                      ? "Review the idea and try another puzzle."
                      : "Choose a candidate move, calculate the reply, then commit."}
                </p>
              </Card>

              <PuzzleStatsCard stats={stats} limits={limits} history={history} />

              <Card variant="subtle">
                <h2 className="font-[var(--font-display)] text-xl font-black">Premium training</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">Free players get a clear daily allowance. Premium plans raise the daily limit, unlock advanced and master puzzles, and provide more hints per puzzle.</p>
                {limits?.isPremium ? (
                  <label className="mt-4 block text-sm font-bold text-[var(--color-text-primary)]">
                    Theme filter
                    <select
                      value={themeFilter}
                      onChange={(event) => setThemeFilter(event.target.value)}
                      className="ds-focus mt-2 w-full rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-3 py-3 text-sm font-bold text-[var(--color-text-primary)] outline-none"
                    >
                      <option value="">All themes</option>
                      <option value="mate">Mate</option>
                      <option value="fork">Fork</option>
                      <option value="pin">Pin</option>
                      <option value="sacrifice">Sacrifice</option>
                      <option value="endgame">Endgame</option>
                    </select>
                  </label>
                ) : (
                  <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => setUpgradeFeature("premium puzzle filters")}>
                    Unlock theme filters
                  </Button>
                )}
                <Button type="button" className="mt-4 w-full" onClick={() => onNavigate?.("pricing")}>View plans</Button>
              </Card>

              <Card variant="subtle">
                <h2 className="font-[var(--font-display)] text-xl font-black">Learning focus</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{puzzle.learning?.whatYouLearned || "Find forcing moves and verify the reply."}</p>
                {puzzle.gameUrl ? (
                  <a href={puzzle.gameUrl} target="_blank" rel="noreferrer" className="ds-focus mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface-strong)] px-4 py-2.5 text-sm font-black text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]">
                    Source game
                  </a>
                ) : null}
              </Card>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}

function TrainingFocusItem({ label, value, tone }) {
  return (
    <Card variant="glass">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{label}</p>
          <p className="mt-2 font-[var(--font-display)] text-xl font-black">{value}</p>
        </div>
        <Badge tone={tone}>Today</Badge>
      </div>
    </Card>
  );
}

function ContextRow({ label, value }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}
