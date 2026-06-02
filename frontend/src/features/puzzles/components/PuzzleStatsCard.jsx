import { Card, EmptyState } from "../../../components/ui";

function hasNumber(value) {
  return Number.isFinite(Number(value));
}

function valueOrUnavailable(value) {
  return hasNumber(value) ? Number(value) : "Unavailable";
}

export default function PuzzleStatsCard({ stats, limits, history = [] }) {
  const limit = hasNumber(limits?.limit) ? Number(limits.limit) : null;
  const used = hasNumber(limits?.used) ? Number(limits.used) : null;
  const remaining = hasNumber(limits?.remaining)
    ? Number(limits.remaining)
    : limit !== null && used !== null
      ? Math.max(limit - used, 0)
      : null;
  return (
    <Card variant="glass">
      <h2 className="font-[var(--font-display)] text-xl font-black">Training activity</h2>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-3">
          <div className="text-xl font-black text-[var(--color-text-primary)]">{valueOrUnavailable(stats?.solved)}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Solved</div>
        </div>
        <div className="rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-3">
          <div className="text-xl font-black text-[var(--color-text-primary)]">{valueOrUnavailable(stats?.started ?? stats?.attempts)}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Started</div>
        </div>
        <div className="rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-3">
          <div className="text-xl font-black text-[var(--color-text-primary)]">{remaining !== null && limit !== null ? `${remaining}/${limit}` : "Unavailable"}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Left today</div>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">Recent puzzles</h3>
        <div className="mt-3 space-y-2">
          {history.length ? history.slice(0, 5).map((item, index) => (
            <div key={`${item.puzzleId || item.id || "puzzle"}-${item.updatedAt || item.createdAt || item.status || index}-${index}`} className="flex items-center justify-between rounded-[var(--radius-xl)] bg-[var(--color-surface)] px-3 py-2 text-sm">
              <span className="font-bold text-[var(--color-text-primary)]">{item.difficulty || "Puzzle"}</span>
              <span className={item.status === "solved" ? "text-[var(--color-success)]" : "text-[var(--color-text-secondary)]"}>{item.status || "attempted"}</span>
            </div>
          )) : (
            <EmptyState title="No puzzle history" message="Solved and attempted puzzles will appear here." className="p-4" />
          )}
        </div>
      </div>
    </Card>
  );
}
