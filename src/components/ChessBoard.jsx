import { useState } from "react";
import initialBoard from "./pieces";
import Square from "./Square";

const ChessBoard = () => {
  const [board, setBoard] = useState(initialBoard);
  const [selected, setSelected] = useState(null);
  const [turn, setTurn] = useState("w");

  const isValidMove = (fromRow, fromCol, toRow, toCol) => {
    const piece = board[fromRow][fromCol];
    const target = board[toRow][toCol];

    if (!piece || piece[0] !== turn) return false;

    const type = piece[1];

    // Pawn
    if (type === "p") {
      const direction = turn === "w" ? -1 : 1;

      if (toCol === fromCol && !target) {
        if (toRow === fromRow + direction) return true;
      }

      if (
        Math.abs(toCol - fromCol) === 1 &&
        toRow === fromRow + direction &&
        target &&
        target[0] !== turn
      ) {
        return true;
      }
    }

    // Rook (no blocking yet)
    if (type === "r") {
      if (fromRow === toRow || fromCol === toCol) return true;
    }

    return false;
  };

  const handleClick = (row, col) => {
    if (selected) {
      const [fromRow, fromCol] = selected;

      if (isValidMove(fromRow, fromCol, row, col)) {
        const newBoard = board.map((r) => [...r]);
        newBoard[row][col] = newBoard[fromRow][fromCol];
        newBoard[fromRow][fromCol] = "";

        setBoard(newBoard);
        setTurn(turn === "w" ? "b" : "w");
      }

      setSelected(null);
    } else {
      if (board[row][col] && board[row][col][0] === turn) {
        setSelected([row, col]);
      }
    }
  };

  return (
    <div>
      <h2 className="text-white text-center mb-4">
        Turn: {turn === "w" ? "White" : "Black"}
      </h2>

      <div className="grid grid-cols-8 w-fit mx-auto border-4 border-black">
        {board.map((rowData, rowIndex) =>
          rowData.map((square, colIndex) => {
            const isDark = (rowIndex + colIndex) % 2 === 1;

            const isHighlighted =
              selected && selected[0] === rowIndex && selected[1] === colIndex;

            return (
              <Square
                key={`${rowIndex}-${colIndex}`}
                piece={square}
                isDark={isDark}
                isHighlighted={isHighlighted}
                onClick={() => handleClick(rowIndex, colIndex)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
};

export default ChessBoard;
