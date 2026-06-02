import { Badge, Button, Card } from "../../../components/ui";

export default function PuzzleResultModal({ result, onClose, onNext }) {
  if (!result?.completed) return null;
  const learning = result.learning || {};
  const hasRating = Number.isFinite(Number(learning.rating));

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <Card className="w-full max-w-lg" variant="glass">
        <style>{`@keyframes puzzlePop{0%{transform:scale(.96);opacity:.2}100%{transform:scale(1);opacity:1}}`}</style>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-success)]">Puzzle completed</p>
            <h2 className="mt-2 animate-[puzzlePop_0.28s_ease-out] font-[var(--font-display)] text-2xl font-black">
              Great work. Keep building pattern recognition.
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close result">×</Button>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{learning.themeName || "Pattern recognition"}</Badge>
            {learning.difficulty ? <Badge tone="neutral">{learning.difficulty}</Badge> : null}
            {hasRating ? <Badge tone="neutral">Rating {Number(learning.rating)}</Badge> : null}
          </div>
          <p className="rounded-[var(--radius-2xl)] bg-[var(--color-surface)] p-4">
            {learning.whatYouLearned || "You completed the line. Review the idea, then reinforce it with another focused puzzle."}
          </p>
          <div className="rounded-[var(--radius-2xl)] bg-[var(--color-surface)] p-4">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">Training idea</div>
            <p className="mt-2">{learning.explanation || "Check candidate moves, verify the reply, and look for forcing moves before committing."}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="secondary" onClick={onClose}>Review board</Button>
          <Button type="button" onClick={onNext}>Next Puzzle</Button>
        </div>
      </Card>
    </div>
  );
}
