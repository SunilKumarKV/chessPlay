// Chess utilities for backend - simplified version

// Piece color and type utilities
function colorOf(piece) {
  return piece ? piece[0] : null;
}

function typeOf(piece) {
  return piece ? piece[1] : null;
}

function opponent(color) {
  return color === "w" ? "b" : "w";
}

// Clone board for move validation
function cloneBoard(board) {
  return board.map((row) => [...row]);
}

// Basic move validation (simplified)
function isValidMove(gameState, fromRow, fromCol, toRow, toCol) {
  const piece = gameState.board[fromRow][fromCol];
  if (!piece) return false;

  const color = colorOf(piece);
  if (color !== gameState.turn) return false;

  // Basic bounds check
  if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;

  const targetPiece = gameState.board[toRow][toCol];
  if (targetPiece && colorOf(targetPiece) === color) return false; // Can't capture own piece

  const pieceType = typeOf(piece);
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;

  switch (pieceType) {
    case "P": // Pawn
      const direction = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;

      // Forward move
      if (colDiff === 0 && !targetPiece) {
        if (rowDiff === direction) return true;
        if (fromRow === startRow && rowDiff === 2 * direction) return true;
      }
      // Capture diagonally
      if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece) {
        return true;
      }
      return false;

    case "R": // Rook
      // Horizontal or vertical movement
      if (
        (rowDiff === 0 || colDiff === 0) &&
        !hasPiecesInPath(gameState.board, fromRow, fromCol, toRow, toCol)
      ) {
        return true;
      }
      return false;

    case "N": // Knight
      if (
        (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) ||
        (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2)
      ) {
        return true;
      }
      return false;

    case "B": // Bishop
      if (
        Math.abs(rowDiff) === Math.abs(colDiff) &&
        !hasPiecesInPath(gameState.board, fromRow, fromCol, toRow, toCol)
      ) {
        return true;
      }
      return false;

    case "Q": // Queen
      if (
        (Math.abs(rowDiff) === Math.abs(colDiff) ||
          rowDiff === 0 ||
          colDiff === 0) &&
        !hasPiecesInPath(gameState.board, fromRow, fromCol, toRow, toCol)
      ) {
        return true;
      }
      return false;

    case "K": // King
      if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) {
        return true;
      }
      return false;

    default:
      return false;
  }
}

// Check if there are pieces in the path (for sliding pieces)
function hasPiecesInPath(board, fromRow, fromCol, toRow, toCol) {
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;

  const stepRow = rowDiff === 0 ? 0 : rowDiff > 0 ? 1 : -1;
  const stepCol = colDiff === 0 ? 0 : colDiff > 0 ? 1 : -1;

  let currentRow = fromRow + stepRow;
  let currentCol = fromCol + stepCol;

  while (currentRow !== toRow || currentCol !== toCol) {
    if (board[currentRow][currentCol]) {
      return true; // Piece in path
    }
    currentRow += stepRow;
    currentCol += stepCol;
  }

  return false;
}

module.exports = {
  colorOf,
  typeOf,
  opponent,
  cloneBoard,
  isValidMove,
};
