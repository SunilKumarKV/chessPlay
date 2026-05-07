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
            className={`flex items-center space-x-3 rounded ${rowPadding} ${
              move.isLatest
                ? "border border-[#81b64c]/30 bg-[#81b64c]/10"
                : "hover:bg-[#2a2a2a]"
            } transition-colors`}
          >
            <span className={`text-[#7a7a7a] ${numberClass}`}>
              {move.number}.
            </span>
            <span
              className={`flex-1 ${
                !move.white || move.white === "-"
                  ? "text-[#7a7a7a]"
                  : "text-[#e0e0e0]"
              } ${moveTextClass}`}
            >
              {move.white}
            </span>
            <span
              className={`flex-1 ${
                !move.black ? "text-[#7a7a7a]" : "text-[#e0e0e0]"
              } ${moveTextClass}`}
            >
              {move.black}
            </span>
          </div>
        ))}
        {moves.length === 0 && (
          <div className="py-4 text-center text-sm text-[#7a7a7a]">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
