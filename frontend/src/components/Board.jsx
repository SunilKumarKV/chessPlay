import BoardSquare from "./BoardSquare";

export default function Board({
  board,
  flipped,
  isSelected,
  isLegalDest,
  isLastMove,
  isInCheck,
  onSquareClick,
}) {
  const rows = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const files = flipped ? "hgfedcba" : "abcdefgh";
  const ranks = flipped ? "12345678" : "87654321";

  return (
    <div className="relative">
      {/* Rank labels — left side (hidden on mobile) */}
      <div className="hidden sm:absolute -left-8 top-0 flex flex-col h-full pointer-events-none z-10">
        {ranks.split("").map((label, i) => (
          <div
            key={i}
            className="flex-1 flex items-center justify-center text-sm font-medium text-[#7a7a7a] font-['JetBrains Mono']"
          >
            {label}
          </div>
        ))}
      </div>

      {/* The board - scales to full width on mobile, center on larger screens */}
      <div
        className="relative grid overflow-hidden rounded-lg mx-auto"
        style={{
          gridTemplateColumns: "repeat(8, 1fr)",
          width: "min(500px, calc(100vw - 16px))",
          height: "min(500px, calc(100vw - 16px))",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          border: "2px solid #2a2a2a",
        }}
      >
        {rows.map((r) =>
          cols.map((c) => (
            <BoardSquare
              key={`${r}-${c}`}
              row={r}
              col={c}
              piece={board?.[r]?.[c]}
              isLight={(r + c) % 2 === 0}
              isSelected={isSelected?.(r, c)}
              isLegalDest={isLegalDest?.(r, c)}
              isLastMove={isLastMove?.(r, c)}
              isInCheck={isInCheck && board?.[r]?.[c]?.toLowerCase() === 'k' && ((board[r][c] === 'wK' && !flipped) || (board[r][c] === 'bK' && flipped))}
              onClick={() => onSquareClick?.(r, c)}
            />
          )),
        )}
      </div>

      {/* File labels — bottom */}
      <div className="flex mt-2">
        {files.split("").map((label, i) => (
          <div
            key={i}
            className="flex-1 text-center text-sm font-medium text-[#7a7a7a] font-['JetBrains Mono']"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
