export default function MoveListPanel({
  moves,
  emptyMessage = "No moves yet",
  compact = false,
}) {
  const panelPadding = compact ? "p-3" : "p-4";
  const rowPadding = compact ? "p-1.5" : "p-2";
  const numberClass = compact ? "w-6 text-xs" : "w-6";
  const moveTextClass = compact ? "text-xs" : "";

  return (
    <div className={`${panelPadding} overflow-y-auto scrollbar-thin`}>
      <div className="space-y-2 font-['JetBrains Mono'] text-sm">
        {moves.map((move) => (
          <div
            key={`${move.number}-${move.white}-${move.black}`}
            className={`flex items-center space-x-3 rounded-[var(--radius-lg)] ${rowPadding} ${
              move.isLatest
                ? "border border-[color-mix(in_srgb,var(--color-primary)_36%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
                : "hover:bg-[var(--color-surface-strong)]"
            } transition-colors`}
          >
            <span className={`text-[var(--color-text-tertiary)] ${numberClass}`}>
              {move.number}.
            </span>
            <span
              className={`flex-1 ${
                !move.white || move.white === "-"
                  ? "text-[var(--color-text-tertiary)]"
                  : "text-[var(--color-text-primary)]"
              } ${moveTextClass}`}
            >
              {move.white}
            </span>
            <span
              className={`flex-1 ${
                !move.black ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"
              } ${moveTextClass}`}
            >
              {move.black}
            </span>
          </div>
        ))}
        {moves.length === 0 && (
          <div className="py-4 text-center text-sm text-[var(--color-text-tertiary)]">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
