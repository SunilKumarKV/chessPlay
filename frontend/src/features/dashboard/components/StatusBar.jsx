export default function StatusBar({ status, turn }) {
  const turnName = turn === "w" ? "White" : "Black";

  const messages = {
    playing: `${turnName}'s turn`,
    check: `${turnName} is in CHECK!`,
    checkmate: `CHECKMATE — ${turn === "w" ? "Black" : "White"} wins!`,
    stalemate: "STALEMATE — Draw!",
  };

  const isAlert = status === "check" || status === "checkmate";
  return (
    <div
      className="text-center mb-2 text-base font-semibold tracking-wide transition-colors duration-300"
      style={{
        fontFamily: "'Crimson Text', serif",
        color: isAlert ? "#ff7a5c" : "#f5d78e",
      }}
    >
      {messages[status]}
    </div>
  );
}
