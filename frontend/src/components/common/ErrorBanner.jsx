export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-bold text-amber-100" role="alert">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="rounded-xl bg-amber-200 px-3 py-2 text-sm font-black text-amber-950">
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
