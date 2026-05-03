export default function MoveHistory({ movePairs }) {
  return (
    <div className="scrollbar-thin overflow-y-auto" style={{ maxHeight: 200 }}>
      {movePairs.length === 0 ? (
        <span className="text-xs opacity-40" style={{ color: "#e8dcc8" }}>
          No moves yet
        </span>
      ) : (
        movePairs.map((pair, i) => (
          <div
            key={i}
            className="text-xs py-0.5 font-mono"
            style={{ color: "#e8dcc8" }}
          >
            {i + 1}. {pair.white || ""} {pair.black || ""}
          </div>
        ))
      )}
    </div>
  );
}
