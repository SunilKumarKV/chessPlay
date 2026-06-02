import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BACKEND_URL } from "../config/runtime";
import { apiClient } from "../services/apiClient";
import { useTheme } from "../hooks/useTheme";
import PlanBadge from "../components/billing/PlanBadge";
import UpgradeModal from "../components/billing/UpgradeModal";
import { Badge, Button, Card, EmptyState as DesignEmptyState } from "../components/ui";
import { trackEvent } from "../services/analytics";

const timeControls = [
  { id: "1+0", label: "1+0 Bullet" },
  { id: "3+0", label: "3+0 Blitz" },
  { id: "5+3", label: "5+3 Blitz" },
  { id: "10+0", label: "10+0 Rapid" },
  { id: "30+0", label: "30+0 Classical" },
];

const ONBOARDING_STORAGE_KEYS = {
  completed: "chessplay_onboarding_completed",
  dismissed: "chessplay_onboarding_dismissed",
  started: "chessplay_onboarding_started",
  goal: "chessplay_goal",
  level: "chessplay_level",
};

const WEAKNESS_STORAGE_KEYS = {
  dismissedId: "chessplay_weakness_dismissed_id",
  viewedId: "chessplay_weakness_viewed_id",
};

const TRAINING_STORAGE_KEYS = {
  dismissedId: "chessplay_training_recommendation_dismissed_id",
  viewedId: "chessplay_training_recommendation_viewed_id",
};

const GOAL_OPTIONS = ["Learn chess", "Improve rating", "Win more games", "Prepare for tournaments"];
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];

function safeGetLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Onboarding must never block the dashboard.
  }
}

function safeGetSessionStorage(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetSessionStorage(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Session-only UI state must never block the dashboard.
  }
}

function normalizeList(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getUserId(user) {
  return String(user?.id || user?._id || "");
}

function getGameResult(game, userId) {
  const result = String(game?.result || game?.status || "").toLowerCase();
  if (result === "draw" || game?.isDraw) return "Draw";
  const winnerId = String(game?.winner?._id || game?.winner || "");
  if (winnerId && winnerId === userId) return "Win";
  if (game?.winner) return "Loss";
  if (result === "completed") return "Completed";
  if (result === "active") return "Active";
  if (result === "abandoned") return "Abandoned";
  return "Recorded";
}

function getOpponent(game, userId) {
  if (game?.aiOpponent) return `Stockfish Lv${game.aiDifficulty || 10}`;
  const white = game?.whitePlayer || game?.white;
  const black = game?.blackPlayer || game?.black;
  const whiteId = String(white?._id || white?.id || white || "");
  const blackName = black?.username || "Black";
  const whiteName = white?.username || "White";
  if (whiteId && whiteId === userId) return blackName;
  return whiteName;
}

function getGameDateValue(game) {
  const value = game?.completedAt || game?.finishedAt || game?.endedAt || game?.createdAt || game?.updatedAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function daysSince(value) {
  const time = Number(value || 0);
  if (!time) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function getPuzzleActivity(puzzleStats, puzzleLimits, safeStats) {
  const stats = puzzleStats?.stats || puzzleStats || {};
  const limits = puzzleStats?.limits || puzzleLimits || {};
  const limit = Number(limits.limit || 0);
  const remaining = Number(limits.remaining || 0);
  const usedToday = Number.isFinite(Number(limits.used))
    ? Number(limits.used)
    : Math.max(limit - remaining, 0);
  const started = Number(stats.started ?? stats.attempts ?? safeStats?.puzzlesAttempted ?? 0);
  const solved = Number(stats.solved ?? safeStats?.puzzlesSolved ?? 0);
  const failed = Number(stats.failed ?? 0);
  const accuracy = Number(stats.accuracy ?? (started ? Math.round((solved / started) * 100) : 0));

  return {
    started: Number.isFinite(started) ? started : 0,
    solved: Number.isFinite(solved) ? solved : 0,
    failed: Number.isFinite(failed) ? failed : 0,
    accuracy: Number.isFinite(accuracy) ? accuracy : 0,
    usedToday: Number.isFinite(usedToday) ? usedToday : 0,
  };
}

function buildWeakness({ gamesPlayed, wins, losses, draws, recentGames, userId, puzzleActivity }) {
  const sortedGames = [...recentGames].sort((a, b) => getGameDateValue(b) - getGameDateValue(a));
  const latestGameAge = daysSince(getGameDateValue(sortedGames[0]));
  const recentResults = sortedGames.slice(0, 5).map((game) => getGameResult(game, userId));
  const recentLosses = recentResults.filter((result) => result === "Loss").length;
  const recentLossStreak = recentResults[0] === "Loss" && recentResults[1] === "Loss";
  const winRate = Math.round((wins / Math.max(gamesPlayed, 1)) * 100);

  if (gamesPlayed <= 0) {
    return {
      id: "puzzle-consistency-new-user",
      weakness: "Puzzle Consistency",
      tone: "info",
      explanation: "There is not enough game history yet, so your first signal is training consistency.",
      suggestion: "Solve 5 tactical puzzles today, then play one AI game so ChessPlay can compare practice with real positions.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      reason: "no_games",
    };
  }

  if (puzzleActivity.started === 0 && puzzleActivity.usedToday === 0) {
    return {
      id: "missed-tactics-no-puzzles",
      weakness: "Missed Tactics",
      tone: "warning",
      explanation: "You have game activity, but no puzzle practice yet. Tactical misses are the safest first weakness to train.",
      suggestion: "Solve 5 tactical puzzles today before your next game.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      reason: "no_puzzle_activity",
    };
  }

  if (puzzleActivity.started >= 5 && puzzleActivity.accuracy > 0 && puzzleActivity.accuracy < 55) {
    return {
      id: "missed-tactics-low-accuracy",
      weakness: "Missed Tactics",
      tone: "warning",
      explanation: `Your puzzle accuracy is ${puzzleActivity.accuracy}%, which points to missed forcing moves and tactical patterns.`,
      suggestion: "Slow down on puzzles: identify checks, captures, and threats before moving.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      reason: "low_puzzle_accuracy",
    };
  }

  if (gamesPlayed >= 3 && (losses >= wins + 1 || winRate < 40 || recentLossStreak)) {
    return {
      id: "hanging-pieces-loss-trend",
      weakness: "Hanging Pieces",
      tone: "danger",
      explanation: recentLosses >= 2
        ? `You lost ${recentLosses} of your recent games. The most common beginner-to-intermediate cause is leaving pieces undefended.`
        : "Your win/loss trend suggests material safety is costing points.",
      suggestion: "Before every move, ask: what piece is attacked, and what changed after my opponent moved?",
      ctaLabel: "Play Safer AI Game",
      ctaRoute: "ai",
      reason: "loss_trend",
    };
  }

  if (latestGameAge !== null && latestGameAge >= 3) {
    return {
      id: "puzzle-consistency-inactive",
      weakness: "Puzzle Consistency",
      tone: "info",
      explanation: `You have not played in ${latestGameAge} days, so consistency is currently the clearest improvement lever.`,
      suggestion: "Restart with a short puzzle set, then play one AI game to rebuild rhythm.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      reason: "inactive",
    };
  }

  if (gamesPlayed >= 5 && draws + losses >= Math.ceil(gamesPlayed * 0.45)) {
    return {
      id: "endgame-struggles-conversion",
      weakness: "Endgame Struggles",
      tone: "primary",
      explanation: "Your record shows several non-winning results, which often means advantages are not being converted cleanly.",
      suggestion: "Practice king activity, pawn promotion races, and trading down only when the ending is favorable.",
      ctaLabel: "Review Games",
      ctaRoute: "history",
      reason: "conversion",
    };
  }

  if (gamesPlayed >= 3 && puzzleActivity.usedToday === 0) {
    return {
      id: "opening-inaccuracy-no-warmup",
      weakness: "Opening Inaccuracy",
      tone: "primary",
      explanation: "You are playing games without a tactical warmup. Early inaccuracies often come from rushed development and missed threats.",
      suggestion: "Warm up with a small puzzle set, then play one focused AI game from the opening.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      reason: "no_warmup",
    };
  }

  return {
    id: "missed-tactics-default",
    weakness: "Missed Tactics",
    tone: "success",
    explanation: "Your current profile is balanced, so tactics remain the highest-impact daily practice target.",
    suggestion: "Solve 5 tactical puzzles today and review any failed attempts.",
    ctaLabel: "Start Training",
    ctaRoute: "puzzles",
    reason: "default",
  };
}

function buildTrainingRecommendation({ weakness, gamesPlayed, puzzleActivity }) {
  if (!weakness) return null;

  const base = {
    id: `training-${weakness.id}`,
    weakness: weakness.weakness,
    weaknessRule: weakness.reason,
  };

  if (weakness.weakness === "Missed Tactics") {
    return {
      ...base,
      title: "Tactical Practice",
      reason: puzzleActivity.started >= 5 && puzzleActivity.accuracy > 0
        ? `Your tactical accuracy is ${puzzleActivity.accuracy}%, so the fastest gain is cleaner calculation.`
        : "Your activity points to tactics as the next highest-impact training area.",
      action: "Solve 5 tactics today.",
      ctaLabel: "Start Training",
      ctaRoute: "puzzles",
      trainingType: "tactics",
      tone: "warning",
    };
  }

  if (weakness.weakness === "Puzzle Consistency") {
    return {
      ...base,
      title: "Practice Consistency",
      reason: gamesPlayed <= 0
        ? "ChessPlay needs one real game signal, and a steady first session is better than a long plan."
        : "Your recent activity rhythm is the limiting factor right now.",
      action: "Play one 10-minute AI game.",
      ctaLabel: "Play 10-Min AI Game",
      ctaRoute: "ai",
      timeControl: "10+0",
      trainingType: "ai_game",
      tone: "info",
    };
  }

  if (weakness.weakness === "Opening Inaccuracy") {
    return {
      ...base,
      title: "Opening Practice",
      reason: "Your current pattern suggests early move quality needs a quick review before more games.",
      action: "Review your first 10 moves and look for undeveloped pieces, unsafe king moves, and missed threats.",
      ctaLabel: "Review Openings",
      ctaRoute: "analysis",
      trainingType: "openings",
      tone: "primary",
    };
  }

  if (weakness.weakness === "Endgame Struggles") {
    return {
      ...base,
      title: "Conversion Practice",
      reason: "Non-winning results often come from not converting advantages into simple endgames.",
      action: "Practice simple endgames and review one recent non-win.",
      ctaLabel: "Review Games",
      ctaRoute: "history",
      trainingType: "endgames",
      tone: "primary",
    };
  }

  if (weakness.weakness === "Hanging Pieces") {
    return {
      ...base,
      title: "Game Stability",
      reason: "Your loss trend points to material safety and board checks before each move.",
      action: "Review your last game, then play one safer AI game.",
      ctaLabel: "Review Last Game",
      ctaRoute: "history",
      trainingType: "review_games",
      tone: "danger",
    };
  }

  return {
    ...base,
    title: "Tactical Practice",
    reason: "Tactics are the clearest daily training path from the current signals.",
    action: "Solve 5 tactics today.",
    ctaLabel: "Start Training",
    ctaRoute: "puzzles",
    trainingType: "tactics",
    tone: "success",
  };
}

function DashboardSkeleton({ theme }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 xl:p-8" aria-label="Loading dashboard">
      <div className="animate-pulse space-y-6">
        <div className="h-72 rounded-2xl border" style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.primary }} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {["a", "b", "c", "d"].map((item) => (
            <div key={item} className="h-28 rounded-2xl border" style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.primary }} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-80 rounded-2xl border" style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.primary }} />
          <div className="h-80 rounded-2xl border" style={{ backgroundColor: theme.bg.tertiary, borderColor: theme.border.primary }} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <DesignEmptyState
      title={title}
      message={message}
      action={actionLabel && onAction ? <Button type="button" onClick={onAction}>{actionLabel}</Button> : null}
    />
  );
}

function OnboardingOptionGroup({ label, options, value, onChange }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-black text-[var(--color-text-primary)]">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              aria-pressed={selected}
              className={`ds-focus min-h-11 rounded-[var(--radius-xl)] border px-4 py-3 text-left text-sm font-black transition hover:-translate-y-0.5 ${
                selected
                  ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] text-[var(--color-primary)]"
                  : "border-[var(--color-border-primary)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function OnboardingActivationCard({
  goal,
  level,
  onGoalChange,
  onLevelChange,
  onStartAi,
  onStartPuzzle,
  onDismiss,
}) {
  return (
    <Card variant="glass" className="overflow-hidden p-5 sm:p-6" aria-labelledby="chessplay-onboarding-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <Badge tone="primary">First improvement step</Badge>
          <h2 id="chessplay-onboarding-title" className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            Welcome to ChessPlay
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)] sm:text-base">
            Let’s personalize your first improvement step.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          Skip for now
        </Button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <OnboardingOptionGroup label="What is your goal?" options={GOAL_OPTIONS} value={goal} onChange={onGoalChange} />
        <OnboardingOptionGroup label="What is your current level?" options={LEVEL_OPTIONS} value={level} onChange={onLevelChange} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={onStartAi}>
          Start first AI game
        </Button>
        <Button type="button" variant="secondary" onClick={onStartPuzzle}>
          Solve first puzzle
        </Button>
      </div>
    </Card>
  );
}

function WeaknessDetectionCard({ weakness, onCta, onDismiss }) {
  if (!weakness) return null;

  return (
    <Card variant="glass" className="overflow-hidden p-5 sm:p-6" aria-labelledby="chessplay-weakness-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <Badge tone={weakness.tone || "primary"}>Rule-based recommendation</Badge>
          <h2 id="chessplay-weakness-title" className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            Your Biggest Weakness
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-[var(--radius-xl)] bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] px-4 py-2 font-[var(--font-display)] text-xl font-black text-[var(--color-text-primary)]">
              {weakness.weakness}
            </span>
            <span className="text-sm font-bold text-[var(--color-text-tertiary)]">Detected from games, puzzle activity, and recent activity.</span>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss weakness recommendation">
          Dismiss
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-4">
          <h3 className="text-sm font-black uppercase text-[var(--color-text-tertiary)]">Why this matters</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{weakness.explanation}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-4">
          <h3 className="text-sm font-black uppercase text-[var(--color-text-tertiary)]">What to practice next</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{weakness.suggestion}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" onClick={onCta}>
          {weakness.ctaLabel}
        </Button>
        <span className="text-xs font-bold text-[var(--color-text-tertiary)]">MVP rule: {weakness.reason.replaceAll("_", " ")}</span>
      </div>
    </Card>
  );
}

function TrainingRecommendationCard({ recommendation, onCta, onDismiss }) {
  if (!recommendation) return null;

  return (
    <Card variant="glass" className="overflow-hidden p-5 sm:p-6" aria-labelledby="chessplay-training-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <Badge tone={recommendation.tone || "primary"}>Next best action</Badge>
          <h2 id="chessplay-training-title" className="mt-3 font-[var(--font-display)] text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
            Recommended Training
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            Built from your current weakness signal and recent activity.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss training recommendation">
          Dismiss
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-4">
          <h3 className="font-[var(--font-display)] text-xl font-black text-[var(--color-text-primary)]">{recommendation.title}</h3>
          <p className="mt-2 text-sm font-black text-[var(--color-primary)]">{recommendation.action}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-4">
          <h3 className="text-sm font-black uppercase text-[var(--color-text-tertiary)]">Why this is recommended</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{recommendation.reason}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" onClick={onCta}>
          {recommendation.ctaLabel}
        </Button>
        <span className="text-xs font-bold text-[var(--color-text-tertiary)]">
          Training type: {recommendation.trainingType.replaceAll("_", " ")}
        </span>
      </div>
    </Card>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-white/10 bg-[#111827] p-4 text-sm text-white shadow-2xl" role={isError ? "alert" : "status"}>
      <div className="flex items-start gap-3">
        <span className={isError ? "text-red-300" : "text-[#81b64c]"}>{isError ? "⚠" : "✓"}</span>
        <p className="leading-6">{toast.message}</p>
        <button type="button" onClick={onClose} className="ml-2 text-slate-400 hover:text-white" aria-label="Close message">×</button>
      </div>
    </div>
  );
}

export default function Dashboard({ user, onStartGame, onNavigate, onAuthError }) {
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState(null);
  const [selectedTimeControl, setSelectedTimeControl] = useState(() => localStorage.getItem("selectedTimeControl") || "3+0");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [entitlements, setEntitlements] = useState(null);
  const [puzzleLimits, setPuzzleLimits] = useState(null);
  const [puzzleStats, setPuzzleStats] = useState(null);
  const [puzzleSignalsReady, setPuzzleSignalsReady] = useState(false);
  const [onboardingGoal, setOnboardingGoal] = useState(() => safeGetLocalStorage(ONBOARDING_STORAGE_KEYS.goal) || "");
  const [onboardingLevel, setOnboardingLevel] = useState(() => safeGetLocalStorage(ONBOARDING_STORAGE_KEYS.level) || "");
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => safeGetLocalStorage(ONBOARDING_STORAGE_KEYS.completed) === "true");
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    const dismissed = safeGetLocalStorage(ONBOARDING_STORAGE_KEYS.dismissed);
    return dismissed === "true" || dismissed === "1";
  });
  const [dismissedWeaknessId, setDismissedWeaknessId] = useState(() => safeGetSessionStorage(WEAKNESS_STORAGE_KEYS.dismissedId) || "");
  const [dismissedTrainingId, setDismissedTrainingId] = useState(() => safeGetSessionStorage(TRAINING_STORAGE_KEYS.dismissedId) || "");
  const onboardingStartedTrackedRef = useRef(false);
  const weaknessViewedRef = useRef("");
  const trainingViewedRef = useRef("");

  const showDebugStatus = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("debug") === "true" || localStorage.getItem("chessplay-debug") === "true";
  }, []);

  const userId = getUserId(user);
  const isGuest = Boolean(user?.isGuest);

  const fetchWithTimeout = useCallback(async (endpoint, options = {}) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 9000);
    try {
      return await apiClient(endpoint, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setErrorMessage("");

    if (isGuest) {
      setStats(user);
      setRecentGames([]);
      try {
        const publicBoard = await fetchWithTimeout("/api/games/leaderboard?limit=5", { skipAuthRefresh: true });
        setLeaderboard(normalizeList(publicBoard, "leaderboard"));
      } catch {
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const [profileResult, historyResult, leaderboardResult] = await Promise.allSettled([
        fetchWithTimeout("/api/auth/profile"),
        fetchWithTimeout("/api/games/history?page=1&limit=5"),
        fetchWithTimeout("/api/games/leaderboard?limit=5", { skipAuthRefresh: true }),
      ]);

      if (profileResult.status === "fulfilled") {
        setStats(profileResult.value.user || profileResult.value.profile || null);
      } else if (profileResult.reason?.status === 401 || profileResult.reason?.status === 403) {
        onAuthError?.();
        return;
      } else {
        setStats(user);
      }

      if (historyResult.status === "fulfilled") {
        setRecentGames(normalizeList(historyResult.value, "games"));
      } else if (historyResult.reason?.status === 401 || historyResult.reason?.status === 403) {
        setRecentGames([]);
      }

      if (leaderboardResult.status === "fulfilled") {
        setLeaderboard(normalizeList(leaderboardResult.value, "leaderboard"));
      } else {
        setLeaderboard([]);
      }

      const failedCritical = [profileResult, historyResult].some((result) => result.status === "rejected" && ![401, 403, 404].includes(result.reason?.status));
      if (failedCritical) {
        setErrorMessage("Some dashboard data could not be loaded. You can still play and retry the dashboard data.");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        setErrorMessage("Dashboard request timed out. Please check your connection and try again.");
      } else if (error?.status === 401 || error?.status === 403) {
        onAuthError?.();
      } else {
        setErrorMessage("Unable to load dashboard data. Please try again.");
      }
      setStats(user);
      setRecentGames([]);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [fetchWithTimeout, isGuest, onAuthError, user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!user || isGuest) return undefined;
    let active = true;
    setPuzzleSignalsReady(false);
    Promise.allSettled([
      apiClient("/api/me/entitlements"),
      apiClient("/api/puzzles/limits/me", { skipAuthRefresh: true }),
      apiClient("/api/puzzles/stats/me", { skipAuthRefresh: true }),
    ]).then(([entitlementResult, limitsResult, puzzleStatsResult]) => {
      if (!active) return;
      if (entitlementResult.status === "fulfilled") setEntitlements(entitlementResult.value);
      if (limitsResult.status === "fulfilled") setPuzzleLimits(limitsResult.value.limits || null);
      if (puzzleStatsResult.status === "fulfilled") setPuzzleStats(puzzleStatsResult.value || null);
      setPuzzleSignalsReady(true);
    });
    return () => { active = false; };
  }, [isGuest, user]);

  useEffect(() => {
    if (!showDebugStatus) return undefined;
    const controller = new AbortController();
    fetch(`${BACKEND_URL}/healthz`, { signal: controller.signal })
      .then((response) => setBackendStatus(response.ok ? "connected" : `http-${response.status}`))
      .catch(() => setBackendStatus("offline"));
    return () => controller.abort();
  }, [showDebugStatus]);

  const safeStats = useMemo(() => stats || user || {}, [stats, user]);
  const displayName = safeStats.username || user?.username || "Player";
  const rating = safeStats.rating || user?.rating || 1200;
  const gamesPlayed = safeStats.gamesPlayed || 0;
  const wins = safeStats.gamesWon || safeStats.wins || 0;
  const losses = safeStats.gamesLost || 0;
  const draws = safeStats.gamesDrawn || 0;
  const winRate = Math.round((wins / Math.max(gamesPlayed, 1)) * 100);
  const isAdmin = Boolean(user?.isAdmin || safeStats.isAdmin);
  const badges = [
    isAdmin && "Admin",
    (user?.isSupporter || user?.isPremium || safeStats.isSupporter || safeStats.isPremium) && "Supporter",
    safeStats.emailVerified && "Verified",
    gamesPlayed >= 1 && "First game",
    wins >= 1 && "Winner",
  ].filter(Boolean);

  const statCards = [
    { label: "Games Played", value: gamesPlayed, accent: "#81b64c" },
    { label: "Wins", value: wins, accent: "#38bdf8" },
    { label: "Losses", value: losses, accent: "#f59e0b" },
    { label: "Draws", value: draws, accent: "#f472b6" },
    { label: "Current Rating", value: rating, accent: "#a78bfa" },
    { label: "Win Rate", value: `${winRate}%`, accent: "#22c55e" },
  ];
  const trialEndsAt = entitlements?.planStatus === "trialing" ? entitlements.planExpiresAt : null;
const [now, setNow] = useState(() => Date.now());

useEffect(() => {
  const timer = setInterval(() => {
    setNow(Date.now());
  }, 60 * 1000);

  return () => clearInterval(timer);
}, []);

const trialDaysLeft = trialEndsAt
  ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now) / 86400000))
  : 0;

  const setTimeControl = (value) => {
    setSelectedTimeControl(value);
    localStorage.setItem("selectedTimeControl", value);
  };

  const requireLoginForGuest = (feature = "this feature") => {
    if (!isGuest) return false;
    setToast({ type: "error", message: `Please login to use ${feature}. Guest mode is limited to basic Play vs AI and local board practice.` });
    return true;
  };

  const startGame = (type) => {
    if (isGuest && type === "multi") {
      requireLoginForGuest("online multiplayer");
      return;
    }
    localStorage.setItem("selectedTimeControl", selectedTimeControl);
    onStartGame?.(type, selectedTimeControl);
  };

  const shouldShowOnboarding = !isGuest && gamesPlayed === 0 && !onboardingCompleted && !onboardingDismissed;
  const puzzleActivity = useMemo(
    () => getPuzzleActivity(puzzleStats, puzzleLimits, safeStats),
    [puzzleLimits, puzzleStats, safeStats],
  );
  const weaknessRecommendation = useMemo(
    () => buildWeakness({ gamesPlayed, wins, losses, draws, recentGames, userId, puzzleActivity }),
    [draws, gamesPlayed, losses, puzzleActivity, recentGames, userId, wins],
  );
  const shouldShowWeakness = !isGuest && puzzleSignalsReady && weaknessRecommendation && weaknessRecommendation.id !== dismissedWeaknessId;
  const trainingRecommendation = useMemo(
    () => buildTrainingRecommendation({ weakness: weaknessRecommendation, gamesPlayed, puzzleActivity }),
    [gamesPlayed, puzzleActivity, weaknessRecommendation],
  );
  const shouldShowTraining = !isGuest && puzzleSignalsReady && trainingRecommendation && trainingRecommendation.id !== dismissedTrainingId;

  useEffect(() => {
    if (!shouldShowOnboarding) return;
    if (onboardingStartedTrackedRef.current) return;
    if (safeGetLocalStorage(ONBOARDING_STORAGE_KEYS.started) === "true") return;
    onboardingStartedTrackedRef.current = true;
    safeSetLocalStorage(ONBOARDING_STORAGE_KEYS.started, "true");
    trackEvent("onboarding_started", { gamesPlayed });
  }, [gamesPlayed, shouldShowOnboarding]);

  const updateOnboardingGoal = (goal) => {
    setOnboardingGoal(goal);
    safeSetLocalStorage(ONBOARDING_STORAGE_KEYS.goal, goal);
    trackEvent("goal_selected", { goal });
  };

  const updateOnboardingLevel = (level) => {
    setOnboardingLevel(level);
    safeSetLocalStorage(ONBOARDING_STORAGE_KEYS.level, level);
    trackEvent("level_selected", { level });
  };

  const completeOnboarding = (source) => {
    safeSetLocalStorage(ONBOARDING_STORAGE_KEYS.completed, "true");
    setOnboardingCompleted(true);
    trackEvent("onboarding_completed", {
      source,
      goal: onboardingGoal || undefined,
      level: onboardingLevel || undefined,
    });
  };

  const startFirstAiGame = () => {
    trackEvent("first_ai_game_started", {
      goal: onboardingGoal || undefined,
      level: onboardingLevel || undefined,
    });
    completeOnboarding("ai_game");
    startGame("ai");
  };

  const startFirstPuzzle = () => {
    trackEvent("first_puzzle_started", {
      goal: onboardingGoal || undefined,
      level: onboardingLevel || undefined,
    });
    completeOnboarding("puzzle");
    onNavigate?.("puzzles");
  };

  const dismissOnboarding = () => {
    safeSetLocalStorage(ONBOARDING_STORAGE_KEYS.dismissed, "true");
    setOnboardingDismissed(true);
    trackEvent("onboarding_dismissed", {
      goal: onboardingGoal || undefined,
      level: onboardingLevel || undefined,
    });
  };

  useEffect(() => {
    if (!shouldShowWeakness || !weaknessRecommendation) return;
    if (weaknessViewedRef.current === weaknessRecommendation.id) return;
    if (safeGetSessionStorage(WEAKNESS_STORAGE_KEYS.viewedId) === weaknessRecommendation.id) return;
    weaknessViewedRef.current = weaknessRecommendation.id;
    safeSetSessionStorage(WEAKNESS_STORAGE_KEYS.viewedId, weaknessRecommendation.id);
    trackEvent("weakness_viewed", {
      weakness: weaknessRecommendation.weakness,
      rule: weaknessRecommendation.reason,
      gamesPlayed,
      puzzleStarted: puzzleActivity.started,
      puzzleUsedToday: puzzleActivity.usedToday,
    });
  }, [gamesPlayed, puzzleActivity.started, puzzleActivity.usedToday, shouldShowWeakness, weaknessRecommendation]);

  const handleWeaknessCta = () => {
    if (!weaknessRecommendation) return;
    trackEvent("weakness_cta_clicked", {
      weakness: weaknessRecommendation.weakness,
      rule: weaknessRecommendation.reason,
      route: weaknessRecommendation.ctaRoute,
    });
    if (weaknessRecommendation.ctaRoute === "ai") {
      startGame("ai");
      return;
    }
    onNavigate?.(weaknessRecommendation.ctaRoute);
  };

  const dismissWeakness = () => {
    if (!weaknessRecommendation) return;
    safeSetSessionStorage(WEAKNESS_STORAGE_KEYS.dismissedId, weaknessRecommendation.id);
    setDismissedWeaknessId(weaknessRecommendation.id);
    trackEvent("weakness_dismissed", {
      weakness: weaknessRecommendation.weakness,
      rule: weaknessRecommendation.reason,
    });
  };

  useEffect(() => {
    if (!shouldShowTraining || !trainingRecommendation) return;
    if (trainingViewedRef.current === trainingRecommendation.id) return;
    if (safeGetSessionStorage(TRAINING_STORAGE_KEYS.viewedId) === trainingRecommendation.id) return;
    trainingViewedRef.current = trainingRecommendation.id;
    safeSetSessionStorage(TRAINING_STORAGE_KEYS.viewedId, trainingRecommendation.id);
    trackEvent("training_recommendation_viewed", {
      title: trainingRecommendation.title,
      trainingType: trainingRecommendation.trainingType,
      weakness: trainingRecommendation.weakness,
      rule: trainingRecommendation.weaknessRule,
    });
  }, [shouldShowTraining, trainingRecommendation]);

  const handleTrainingCta = () => {
    if (!trainingRecommendation) return;
    trackEvent("training_recommendation_clicked", {
      title: trainingRecommendation.title,
      trainingType: trainingRecommendation.trainingType,
      weakness: trainingRecommendation.weakness,
      route: trainingRecommendation.ctaRoute,
    });
    if (trainingRecommendation.timeControl) {
      setSelectedTimeControl(trainingRecommendation.timeControl);
      localStorage.setItem("selectedTimeControl", trainingRecommendation.timeControl);
    }
    if (trainingRecommendation.ctaRoute === "ai") {
      onStartGame?.("ai", trainingRecommendation.timeControl || selectedTimeControl);
      return;
    }
    onNavigate?.(trainingRecommendation.ctaRoute);
  };

  const dismissTraining = () => {
    if (!trainingRecommendation) return;
    safeSetSessionStorage(TRAINING_STORAGE_KEYS.dismissedId, trainingRecommendation.id);
    setDismissedTrainingId(trainingRecommendation.id);
    trackEvent("training_recommendation_dismissed", {
      title: trainingRecommendation.title,
      trainingType: trainingRecommendation.trainingType,
      weakness: trainingRecommendation.weakness,
    });
  };

  const startAiFromDashboard = () => {
    if (shouldShowOnboarding) {
      startFirstAiGame();
      return;
    }
    startGame("ai");
  };

  const startPuzzleFromDashboard = () => {
    if (shouldShowOnboarding) {
      startFirstPuzzle();
      return;
    }
    onNavigate?.("puzzles");
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin} — join me on ChessPlay`);
      setInviteCopied(true);
      setToast({ type: "success", message: "Invite link copied." });
      window.setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      setToast({ type: "error", message: "Unable to copy invite. Please copy the site link manually." });
    }
  };

  if (!user) {
    return <DashboardSkeleton theme={theme} />;
  }

  if (loading) {
    return <DashboardSkeleton theme={theme} />;
  }

  return (
    <div className="relative mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 xl:p-8" style={{ color: theme.text.primary }}>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onNavigate={onNavigate} />

      {isGuest && (
        <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100" role="status">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span><strong>Guest Mode:</strong> You can play basic AI/local games. Login to save progress and unlock multiplayer, history, leaderboard, profile, friends, messages, tournaments, and premium modes.</span>
            <button type="button" onClick={() => onNavigate?.("settings")} className="rounded-lg bg-amber-200 px-3 py-2 font-black text-amber-950">Login to unlock</button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100" role="alert">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{errorMessage}</span>
            <button type="button" onClick={loadDashboard} className="rounded-lg bg-amber-200 px-3 py-2 font-bold text-amber-950">
              Retry
            </button>
          </div>
        </div>
      )}

      {trialEndsAt ? (
        <div className="rounded-xl border border-sky-300/30 bg-sky-300/10 p-4 text-sm font-bold text-sky-100" role="status">
          Pro trial ends in {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"}. Your free gameplay stays available either way.
        </div>
      ) : null}

      {shouldShowOnboarding ? (
        <OnboardingActivationCard
          goal={onboardingGoal}
          level={onboardingLevel}
          onGoalChange={updateOnboardingGoal}
          onLevelChange={updateOnboardingLevel}
          onStartAi={startFirstAiGame}
          onStartPuzzle={startFirstPuzzle}
          onDismiss={dismissOnboarding}
        />
      ) : null}

      {shouldShowWeakness ? (
        <WeaknessDetectionCard
          weakness={weaknessRecommendation}
          onCta={handleWeaknessCta}
          onDismiss={dismissWeakness}
        />
      ) : null}

      {shouldShowTraining ? (
        <TrainingRecommendationCard
          recommendation={trainingRecommendation}
          onCta={handleTrainingCta}
          onDismiss={dismissTraining}
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl md:p-7">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(45deg, rgba(129,182,76,.22) 25%, transparent 25%, transparent 75%, rgba(129,182,76,.22) 75%), linear-gradient(45deg, rgba(56,189,248,.16) 25%, transparent 25%, transparent 75%, rgba(56,189,248,.16) 75%)", backgroundPosition: "0 0, 18px 18px", backgroundSize: "36px 36px" }} aria-hidden="true" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#81b64c]">Player Dashboard</span>
                <PlanBadge user={user} />
                {badges.map((badge) => (
                  <span key={badge} className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">{badge}</span>
                ))}
              </div>
              <h1 className="font-['Montserrat'] text-3xl font-black tracking-normal text-white md:text-5xl">
                Welcome back, {displayName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Rating {rating} · {gamesPlayed} games · {winRate}% win rate. Choose a time control and start your next game.
              </p>
              {showDebugStatus && (
                <div className="mt-3 inline-flex rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs font-bold text-slate-300">
                  Backend {backendStatus || "checking"} · {BACKEND_URL}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-2" aria-label="Select time control">
                {timeControls.map((control) => (
                  <button key={control.id} type="button" onClick={() => setTimeControl(control.id)} className={`rounded-full border px-3 py-2 text-sm font-bold transition-all hover:-translate-y-0.5 ${selectedTimeControl === control.id ? "border-[#81b64c] bg-[#81b64c] text-[#07100a]" : "border-white/10 bg-white/10 text-slate-300 hover:bg-white/15"}`} aria-pressed={selectedTimeControl === control.id}>
                    {control.label}
                  </button>
                ))}
              </div>
              {puzzleLimits ? (
                <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm font-black text-slate-200">
                  {puzzleLimits.remaining}/{puzzleLimits.limit} puzzles remaining today
                </div>
              ) : null}
            </div>
            <div className="grid gap-3">
              <button type="button" onClick={startAiFromDashboard} className="rounded-xl bg-[#81b64c] px-5 py-4 text-left font-['Montserrat'] text-lg font-black text-[#07100a] shadow-lg shadow-[#81b64c]/20 transition-all hover:-translate-y-1 hover:bg-[#93c85f]" aria-label="Play against AI">
                Play vs AI
                <span className="block text-xs font-semibold opacity-80">Stockfish · {selectedTimeControl}</span>
              </button>
              <button type="button" onClick={() => startGame("multi")} className="rounded-xl border border-white/10 bg-white/10 px-5 py-4 text-left font-bold text-white transition-all hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-300/10" aria-label="Play online multiplayer">
                {isGuest ? "Login for Online" : "Play Online"}
                <span className="block text-xs font-semibold text-slate-400">Real-time multiplayer rooms</span>
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-['Montserrat'] text-lg font-black text-white">Profile Summary</h2>
              <p className="mt-1 text-xs text-slate-400">{safeStats.email || "Secure ChessPlay account"}</p>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#81b64c] font-black text-[#07100a]" aria-hidden="true">
              {String(displayName).charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => requireLoginForGuest("profile stats") || onNavigate?.("profile")} className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10">View Profile</button>
            <button type="button" onClick={() => requireLoginForGuest("game history") || onNavigate?.("history")} className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10">Game History</button>
            <button type="button" onClick={() => requireLoginForGuest("invites") || copyInvite()} className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10">{inviteCopied ? "Copied" : "Invite"}</button>
            <button type="button" onClick={() => requireLoginForGuest("leaderboard") || onNavigate?.("leaderboard")} className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10">Leaderboard</button>
            <button type="button" onClick={() => requireLoginForGuest("saved puzzle progress") || startPuzzleFromDashboard()} className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10">Puzzles</button>
            {isAdmin && (
              <button type="button" onClick={() => onNavigate?.("admin")} className="col-span-2 rounded-lg border border-[#81b64c]/40 bg-[#81b64c]/15 px-3 py-3 text-left text-sm font-black text-[#dcf8c6] transition hover:bg-[#81b64c]/20">Open Admin Panel</button>
            )}
            <button type="button" onClick={() => setShowUpgradeModal(true)} className="col-span-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-3 text-left text-sm font-black text-amber-100 transition hover:bg-amber-300/15">Support ChessPlay</button>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6" aria-label="Dashboard statistics">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-lg shadow-black/10 backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white/15">
            <div className="mb-4 h-1.5 w-12 rounded-full" style={{ backgroundColor: card.accent }} />
            <div className="font-['Montserrat'] text-2xl font-black text-white">{card.value}</div>
            <div className="mt-1 text-sm font-semibold text-slate-400">{card.label}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-['Montserrat'] text-xl font-black text-white">Quick Actions</h2>
                <p className="mt-1 text-sm text-slate-400">Every visible action is connected to a real route.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { title: "Play vs AI", meta: "Practice instantly", action: startAiFromDashboard, accent: "#81b64c" },
                { title: "Play Online", meta: isGuest ? "Login required" : "Live rooms", action: () => startGame("multi"), accent: "#38bdf8" },
                { title: "Puzzles", meta: "Train tactics", action: startPuzzleFromDashboard, accent: "#a78bfa" },
                { title: "Game History", meta: "Recent results", action: () => requireLoginForGuest("game history") || onNavigate?.("history"), accent: "#f59e0b" },
              ].map((item) => (
                <button key={item.title} type="button" onClick={item.action} className="group rounded-xl border border-white/10 bg-black/20 p-4 text-left transition-all hover:-translate-y-1 hover:bg-white/10">
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg text-lg font-black text-[#07100a]" style={{ backgroundColor: item.accent }}>{item.title.charAt(0)}</div>
                  <h3 className="font-['Montserrat'] text-base font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{item.meta}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-['Montserrat'] text-xl font-black text-white">Recent Games</h2>
                <p className="mt-1 text-sm text-slate-400">Your latest completed and active games.</p>
              </div>
              <button type="button" onClick={() => requireLoginForGuest("game history") || onNavigate?.("history")} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10">View all</button>
            </div>
            {recentGames.length === 0 ? (
              <EmptyState title="No games yet" message="Play your first AI game to start detecting strengths, weaknesses, and improvement patterns." actionLabel="Play your first AI game" onAction={startAiFromDashboard} />
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <div className="hidden grid-cols-[1fr_120px_120px_100px] gap-3 bg-black/30 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 md:grid">
                  <span>Opponent</span><span>Result</span><span>Mode</span><span>Date</span>
                </div>
                <div className="divide-y divide-white/10">
                  {recentGames.map((game) => {
                    const result = getGameResult(game, userId);
                    return (
                      <button key={game._id || game.id || `${game.createdAt}-${game.result}`} type="button" onClick={() => requireLoginForGuest("game history") || onNavigate?.("history")} className="grid w-full gap-2 px-4 py-4 text-left transition hover:bg-white/5 md:grid-cols-[1fr_120px_120px_100px] md:items-center">
                        <div className="min-w-0">
                          <div className="truncate font-bold text-white">vs {getOpponent(game, userId)}</div>
                          <div className="text-xs text-slate-500 md:hidden">{game.aiOpponent ? "AI" : "Online"} · {formatDate(game.createdAt)}</div>
                        </div>
                        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-black ${result === "Win" ? "bg-[#81b64c]/20 text-[#b9f28f]" : result === "Loss" ? "bg-red-500/15 text-red-200" : "bg-white/10 text-slate-200"}`}>{result}</span>
                        <span className="hidden text-sm text-slate-300 md:block">{game.aiOpponent ? "AI" : "Online"}</span>
                        <span className="hidden text-sm text-slate-400 md:block">{formatDate(game.createdAt)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-['Montserrat'] text-xl font-black text-white">Leaderboard</h2>
                <p className="mt-1 text-sm text-slate-400">Top active players.</p>
              </div>
              <button type="button" onClick={() => requireLoginForGuest("leaderboard") || onNavigate?.("leaderboard")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">Open</button>
            </div>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((player, index) => (
                <button key={player._id || player.id || player.username || index} type="button" onClick={() => requireLoginForGuest("leaderboard") || onNavigate?.("leaderboard")} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-white/10">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-xs font-black text-slate-300">{index + 1}</span>
                    <span className="truncate text-sm font-bold text-slate-100">{player.username || "Player"}</span>
                  </span>
                  <span className="text-sm font-black text-[#81b64c]">{player.rating || 1200}</span>
                </button>
              ))}
              {leaderboard.length === 0 && <EmptyState title="No leaderboard yet" message="Leaderboard appears after players complete ranked games." />}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <h2 className="font-['Montserrat'] text-xl font-black text-white">Recent Activity</h2>
            <div className="mt-4 space-y-3">
              {recentGames.slice(0, 3).map((game) => (
                <div key={`activity-${game._id || game.id || game.createdAt}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-sm font-bold text-white">{getGameResult(game, userId)} against {getOpponent(game, userId)}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDate(game.createdAt)}</div>
                </div>
              ))}
              {recentGames.length === 0 && (
                <EmptyState title="No history" message="Your completed games will appear here." actionLabel="Play your first AI game" onAction={startAiFromDashboard} />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <h2 className="font-['Montserrat'] text-xl font-black text-white">Puzzle Training</h2>
            <div className="mt-4">
              <EmptyState title="No puzzles yet" message="Solve your first puzzle to start building tactical pattern recognition." actionLabel="Solve your first puzzle" onAction={startPuzzleFromDashboard} />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
