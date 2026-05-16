export default function PuzzleControls({
  disabled,
  feedback,
  hint,
  hintState,
  onHint,
  onReset,
  onNext,
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onHint}
          disabled={disabled || hintState.loading}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {hintState.loading ? "Hint..." : `Hint ${hintState.used}/${hintState.limit}`}
        </button>
        <button type="button" onClick={onReset} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15">
          Reset
        </button>
        <button type="button" onClick={onNext} className="rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a] transition hover:bg-[#93c85f]">
          Next Puzzle
        </button>
      </div>

      {feedback ? (
        <div className={`rounded-2xl border p-4 text-sm leading-6 ${
          feedback.type === "error"
            ? "border-red-300/20 bg-red-300/10 text-red-100"
            : "border-[#81b64c]/25 bg-[#81b64c]/10 text-[#d8f8c8]"
        }`}>
          {feedback.message}
        </div>
      ) : null}

      {hint ? (
        <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-4 text-sm leading-6 text-sky-100">
          {hint.text}
        </div>
      ) : null}
    </div>
  );
}
