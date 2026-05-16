import Board from "../../chess/components/Board";

function squareFromCoords(row, col) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

export default function PuzzleBoard({
  game,
  selectedSquare,
  lastMove,
  completed,
  onSquareClick,
}) {
  return (
    <div className="mx-auto w-full max-w-[min(82vw,620px)]">
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
