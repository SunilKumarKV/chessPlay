export default function AIThinkingIndicator({ thinking, ready, enabled }) {
  if (!enabled) return null;

  return (
    <div className="flex items-center gap-2 justify-center py-1">
      {!ready ? (
        <span
          className="text-xs opacity-40 tracking-widest"
          style={{ color: "#e8dcc8" }}
        >
          Loading engine…
        </span>
      ) : thinking ? (
        <>
          <span className="text-xs tracking-wider" style={{ color: "#a8b8d8" }}>
            Stockfish is thinking
          </span>
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background: "#7a8bb5",
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </span>
          <style>{`
            @keyframes bounce {
              0%,80%,100% { transform:translateY(0) }
              40%          { transform:translateY(-5px) }
            }
          `}</style>
        </>
      ) : (
        <span
          className="text-xs opacity-30 tracking-widest"
          style={{ color: "#e8dcc8" }}
        >
          ◆ Stockfish ready
        </span>
      )}
    </div>
  );
}
