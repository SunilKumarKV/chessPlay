import Board from "../../chess/components/Board";

function squareFromCoords(row, col) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

export default function PuzzleBoard({
  game,
  selectedSquare,
  lastMove,
  completed,
  shake,
  onSquareClick,
}) {
  return (
    <div className={`mx-auto w-full max-w-[min(92vw,620px)] ${shake ? "animate-[puzzleShake_0.32s_ease-in-out]" : ""}`}>
      <style>{`@keyframes puzzleShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
      <Board
        board={game.board()}
        onSquareClick={onSquareClick}
        flipped={false}
        isSelected={(row, col) => selectedSquare === squareFromCoords(row, col)}
        isLastMove={(row, col) => {
          const square = squareFromCoords(row, col);
          return square === lastMove?.from || square === lastMove?.to;
        }}
        disabled={completed}
      />
    </div>
  );
}
