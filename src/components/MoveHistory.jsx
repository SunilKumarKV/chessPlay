export default function MoveHistory({ history }) {
  return (
    <div className="scrollbar-thin overflow-y-auto" style={{ maxHeight: 200 }}>
      {history.length === 0 ? (
        <span className="text-xs opacity-40" style={{ color: "#e8dcc8" }}>
          No moves yet
        </span>
      ) : (
        history.map((move, i) => (
          <div
            key={i}
            className="text-xs py-0.5 font-mono"
            style={{ color: move.color === "w" ? "#f5e4b0" : "#a8b8d8" }}
          >
            {i + 1}. {move.text}
          </div>
        ))
      )}
    </div>
  );
}
