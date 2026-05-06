function formatMove(move, pieceNotation = "algebraic") {
  if (!move) return "";
  if (typeof move === "string") return move;

  const text = move.san || move.lan || move.text || "";
  if (pieceNotation !== "figurine") return text;

  return text
    .replace(/^K/, "♔")
    .replace(/^Q/, "♕")
    .replace(/^R/, "♖")
    .replace(/^B/, "♗")
    .replace(/^N/, "♘");
}

export default function MoveHistory({
  movePairs = [],
  currentMove = 0,
  pieceNotation = "algebraic",
}) {
  return (
    <div className="scrollbar-thin overflow-y-auto" style={{ maxHeight: 240 }}>
      {movePairs.length === 0 ? (
        <span className="text-xs opacity-40" style={{ color: "#e8dcc8" }}>
          No moves yet
        </span>
      ) : (
        movePairs.map((pair, i) => (
          <div
            key={i}
            className="grid grid-cols-[2rem_1fr_1fr] gap-2 rounded px-2 py-1 text-xs font-mono"
            style={{ color: "#e8dcc8" }}
          >
            <span className="opacity-50">{i + 1}.</span>
            <span
              className={
                currentMove === i * 2 + 1 ? "text-blue-300" : undefined
              }
            >
              {formatMove(pair.white, pieceNotation)}
            </span>
            <span
              className={
                currentMove === i * 2 + 2 ? "text-blue-300" : undefined
              }
            >
              {formatMove(pair.black, pieceNotation)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
