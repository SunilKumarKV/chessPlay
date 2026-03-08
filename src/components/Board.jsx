import BoardSquare from "./BoardSquare";

export default function Board({
  board,
  flipped,
  isSelected,
  isLegalDest,
  isLastMove,
  onSquareClick,
}) {
  const rows = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const files = flipped ? "hgfedcba" : "abcdefgh";
  const ranks = flipped ? "12345678" : "87654321";

  return (
    <div className="relative">
      {/* Rank labels — left side */}
      <div className="absolute -left-5 top-0 flex flex-col h-full pointer-events-none">
        {ranks.split("").map((label, i) => (
          <div
            key={i}
            className="flex-1 flex items-center justify-center text-xs font-mono opacity-50"
            style={{ color: "#e8dcc8" }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* The board */}
      <div
        className="grid overflow-hidden rounded-sm"
        style={{
          gridTemplateColumns: "repeat(8, 1fr)",
          border: "3px solid #c8943a",
          boxShadow:
            "0 0 40px rgba(200,148,58,0.3), inset 0 0 0 1px rgba(255,255,255,0.05)",
          width: "min(480px, 90vw)",
          height: "min(480px, 90vw)",
        }}
      >
        {rows.map((r) =>
          cols.map((c) => (
            <BoardSquare
              key={`${r}-${c}`}
              row={r}
              col={c}
              piece={board[r][c]}
              isLight={(r + c) % 2 === 0}
              isSelected={isSelected(r, c)}
              isLegalDest={isLegalDest(r, c)}
              isLastMove={isLastMove(r, c)}
              onClick={() => onSquareClick(r, c)}
            />
          )),
        )}
      </div>

      {/* File labels — bottom */}
      <div className="flex mt-1">
        {files.split("").map((label, i) => (
          <div
            key={i}
            className="flex-1 text-center text-xs font-mono opacity-50"
            style={{ color: "#e8dcc8" }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
