import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, LoadingState } from "../components/ui";
import { BACKEND_URL } from "../config/runtime";
import GameReplay from "../features/chess/components/GameReplay";

function normalizeGames(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.games)) return payload.games;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function getUserId(user) {
  return String(user?.id || user?._id || "");
}

function getGameDateValue(game) {
  const value = game?.endTime || game?.completedAt || game?.finishedAt || game?.endedAt || game?.startTime || game?.createdAt || game?.updatedAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function formatDate(game) {
  const value = getGameDateValue(game);
  if (!value) return "Recently";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getOpponentLabel(game, userId) {
  if (game?.aiOpponent) return `Stockfish Lv${game.aiDifficulty || 10}`;
  const white = game?.whitePlayer || game?.white;
  const black = game?.blackPlayer || game?.black;
  const whiteId = String(white?._id || white?.id || white || "");
  const blackId = String(black?._id || black?.id || black || "");
  if (whiteId && whiteId === userId) return black?.username || "Black";
  if (blackId && blackId === userId) return white?.username || "White";
  return white?.username || black?.username || "Opponent";
}

function getResultLabel(game, userId) {
  const result = String(game?.result || game?.status || "").toLowerCase();
  if (result === "draw" || game?.isDraw) return "Draw";
  const winnerId = String(game?.winner?._id || game?.winner?.id || game?.winner || "");
  if (winnerId && winnerId === userId) return "Win";
  if (winnerId) return "Loss";
  if (result === "white" || result === "black") return "Outcome";
  if (result === "completed") return "Completed";
  return "Completed";
}

function getResultTone(result) {
  if (result === "Win") return "success";
  if (result === "Loss") return "danger";
  if (result === "Draw") return "warning";
  return "neutral";
}

function getGameType(game) {
  const type = String(game?.type || game?.mode || game?.gameType || "").toLowerCase();
  if (game?.aiOpponent || type.includes("ai") || type.includes("computer")) return "AI";
  if (type.includes("local")) return "Local";
  if (type.includes("multi") || type.includes("online") || game?.roomId) return "Multiplayer";
  return "Game";
}

function getMoveCount(game) {
  if (Array.isArray(game?.moves)) return game.moves.length;
  if (Number.isFinite(Number(game?.moveCount))) return Number(game.moveCount);
  if (Number.isFinite(Number(game?.plyCount))) return Number(game.plyCount);
  return 0;
}

function getGameKey(game, index) {
  return game?._id || game?.id || `${game?.startTime || game?.createdAt || game?.endTime || "game"}-${index}`;
}

function buildSummary(games, userId) {
  const counts = games.reduce((acc, game) => {
    const result = getResultLabel(game, userId);
    if (result === "Win") acc.wins += 1;
    else if (result === "Loss") acc.losses += 1;
    else if (result === "Draw") acc.draws += 1;
    return acc;
  }, { wins: 0, losses: 0, draws: 0 });
  const mostRecent = [...games].sort((a, b) => getGameDateValue(b) - getGameDateValue(a))[0] || null;
  return {
    total: games.length,
    ...counts,
    mostRecent,
  };
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[var(--z-toast)] max-w-sm rounded-[var(--radius-2xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] p-4 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-xl)]" role="status">
      <div className="flex items-start gap-3">
        <span className="text-[var(--color-info)]" aria-hidden="true">i</span>
        <p className="leading-6">{toast}</p>
        <button type="button" onClick={onClose} className="ds-focus ml-2 rounded-[var(--radius-md)] px-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]" aria-label="Close message">×</button>
      </div>
    </div>
  );
}

export default function GameHistory({ onBack, onNavigate }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [toast, setToast] = useState("");

  const currentUser = useMemo(() => getStoredUser(), []);
  const userId = getUserId(currentUser);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${BACKEND_URL}/api/games/history?limit=50`, {
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load game history.");
      setGames(normalizeGames(data));
    } catch (err) {
      setError(err.message || "Unable to load game history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Game Review Hub | ChessPlay";
    fetchHistory();
  }, [fetchHistory]);

  const summary = useMemo(() => buildSummary(games, userId), [games, userId]);

  const startAiGame = () => onNavigate?.("ai");

  const analyzeGame = () => {
    setToast("Choose this game from history support is coming soon.");
    onNavigate?.("analysis");
  };

  if (selectedGame) {
    return <GameReplay game={selectedGame} onClose={() => setSelectedGame(null)} />;
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-5 text-[var(--color-text-primary)] sm:px-6 lg:px-8">
      <Toast toast={toast} onClose={() => setToast("")} />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[var(--radius-3xl)] border border-[var(--color-border-primary)] bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent_32%),var(--color-bg-elevated)] p-5 shadow-[var(--shadow-xl)] sm:p-7">
          <Button type="button" variant="ghost" onClick={onBack} className="mb-5">Back</Button>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="primary">Game Review Hub</Badge>
                <Badge tone="info">Real game data</Badge>
              </div>
              <h1 className="mt-5 max-w-4xl font-[var(--font-display)] text-4xl font-black leading-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-6xl">
                Review your games. Find your next improvement.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--color-text-secondary)] sm:text-lg">
                Every completed game should lead to one clear training action.
              </p>
            </div>
            <Card variant="glass">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-primary)]">Trust boundary</p>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                This hub shows saved game facts only. Analysis labels appear only when real analysis data exists.
              </p>
            </Card>
          </div>
        </section>

        {loading ? <LoadingState label="Loading game review hub" /> : null}

        {!loading && error ? (
          <EmptyState
            title="Unable to load game history"
            message={error}
            icon="!"
            action={<Button type="button" variant="secondary" onClick={fetchHistory}>Retry</Button>}
          />
        ) : null}

        {!loading && !error && games.length === 0 ? (
          <EmptyState
            title="No reviewed games yet"
            message="Play your first AI game to unlock game review."
            icon="♙"
            className="min-h-[320px]"
            action={<Button type="button" onClick={startAiGame}>Start AI Game</Button>}
          />
        ) : null}

        {!loading && !error && games.length > 0 ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard label="Total games" value={summary.total} />
              <SummaryCard label="Wins" value={summary.wins} tone="success" />
              <SummaryCard label="Losses" value={summary.losses} tone="danger" />
              <SummaryCard label="Draws" value={summary.draws} tone="warning" />
              {summary.mostRecent ? (
                <SummaryCard
                  label="Most recent game"
                  value={formatDate(summary.mostRecent)}
                  subvalue={`${getResultLabel(summary.mostRecent, userId)} vs ${getOpponentLabel(summary.mostRecent, userId)}`}
                  tone="info"
                  wide
                />
              ) : null}
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-[var(--font-display)] text-2xl font-black">Completed games</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Replay the game, then send yourself into one focused review action.</p>
                </div>
                <Badge tone="neutral">{games.length} saved</Badge>
              </div>
              <div className="grid gap-4">
                {games.map((game, index) => (
                  <GameReviewCard
                    key={getGameKey(game, index)}
                    game={game}
                    userId={userId}
                    onAnalyze={analyzeGame}
                    onReplay={() => setSelectedGame(game)}
                  />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function SummaryCard({ label, value, subvalue, tone = "neutral", wide = false }) {
  return (
    <Card variant="subtle" className={wide ? "sm:col-span-2 xl:col-span-1" : ""}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{label}</p>
          <p className="mt-2 truncate font-[var(--font-display)] text-2xl font-black text-[var(--color-text-primary)]">{value}</p>
          {subvalue ? <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text-secondary)]">{subvalue}</p> : null}
        </div>
        <Badge tone={tone} size="sm">Saved</Badge>
      </div>
    </Card>
  );
}

function GameReviewCard({ game, userId, onAnalyze, onReplay }) {
  const opponent = getOpponentLabel(game, userId);
  const result = getResultLabel(game, userId);
  const moveCount = getMoveCount(game);
  const type = getGameType(game);

  return (
    <Card variant="glass" className="overflow-hidden">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={getResultTone(result)}>{result}</Badge>
            <Badge tone="neutral">{type}</Badge>
            <span className="text-xs font-bold text-[var(--color-text-tertiary)]">{formatDate(game)}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Fact label="Opponent" value={opponent} />
            <Fact label="Move count" value={moveCount ? `${moveCount} moves` : "No moves recorded"} />
            <Fact label="Training action" value="Replay or analyze next" />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-56 lg:grid-cols-1">
          <Button type="button" onClick={onReplay}>Replay</Button>
          <Button type="button" variant="secondary" onClick={onAnalyze}>Analyze</Button>
        </div>
      </div>
    </Card>
  );
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}
