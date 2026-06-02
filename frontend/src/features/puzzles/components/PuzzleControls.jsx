import { Button } from "../../../components/ui";

export default function PuzzleControls({
  disabled,
  feedback,
  hint,
  hintState,
  onHint,
  onReset,
  onNext,
}) {
  const remaining = Math.max((hintState.limit || 0) - (hintState.used || 0), 0);
  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          type="button"
          onClick={onHint}
          disabled={disabled || hintState.loading}
          variant="secondary"
        >
          {hintState.loading ? "Hint..." : `Hint (${remaining} left)`}
        </Button>
        <Button type="button" onClick={onReset} variant="secondary">
          Reset
        </Button>
        <Button type="button" onClick={onNext}>
          Next Puzzle
        </Button>
      </div>

      {feedback ? (
        <div className={`rounded-2xl border p-4 text-sm leading-6 ${
          feedback.type === "error"
            ? "border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]"
            : "border-[color-mix(in_srgb,var(--color-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]"
        }`}>
          {feedback.type === "error" ? "Review the idea and try another puzzle." : feedback.message}
          {feedback.type === "error" && feedback.message && feedback.message !== "Try again." ? <span className="mt-1 block text-xs opacity-80">{feedback.message}</span> : null}
        </div>
      ) : null}

      {hint ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-info)_12%,transparent)] p-4 text-sm leading-6 text-[var(--color-info)]">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--color-surface)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
              {hint.type === "piece" ? "Piece to move" : hint.type === "target" ? "Target square" : "Full move"}
            </span>
            <span className="text-xs opacity-75">{remaining} hints remaining</span>
          </div>
          {hint.text}
        </div>
      ) : null}
    </div>
  );
}
