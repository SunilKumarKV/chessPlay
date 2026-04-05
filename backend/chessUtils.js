// Chess utilities for backend with better rule support

function colorOf(piece) {
  return piece ? piece[0] : null;
}

function typeOf(piece) {
  return piece ? piece[1] : null;
}

function opponent(color) {
  return color === "w" ? "b" : "w";
}

function isOpponentPiece(piece, color) {
  return piece && colorOf(piece) === opponent(color);
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function hasPiecesInPath(board, fromRow, fromCol, toRow, toCol) {
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;

  const stepRow = rowDiff === 0 ? 0 : rowDiff > 0 ? 1 : -1;
  const stepCol = colDiff === 0 ? 0 : colDiff > 0 ? 1 : -1;

  let currentRow = fromRow + stepRow;
  let currentCol = fromCol + stepCol;

  while (currentRow !== toRow || currentCol !== toCol) {
    if (board[currentRow][currentCol]) {
      return true;
    }
    currentRow += stepRow;
    currentCol += stepCol;
  }

  return false;
}

function isValidMove(gameState, fromRow, fromCol, toRow, toCol) {
  const board = gameState.board;
  const piece = board[fromRow][fromCol];
  if (!piece) return false;

  const color = colorOf(piece);
  if (color !== gameState.turn) return false;

  if (
    fromRow < 0 ||
    fromRow > 7 ||
    fromCol < 0 ||
    fromCol > 7 ||
    toRow < 0 ||
    toRow > 7 ||
    toCol < 0 ||
    toCol > 7
  ) {
    return false;
  }

  if (fromRow === toRow && fromCol === toCol) return false;

  const targetPiece = board[toRow][toCol];
  if (targetPiece && colorOf(targetPiece) === color) return false;

  const type = typeOf(piece);
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  const absRow = Math.abs(rowDiff);
  const absCol = Math.abs(colDiff);

  switch (type) {
    case "P": {
      const direction = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;

      // Single square move
      if (colDiff === 0 && rowDiff === direction && !targetPiece) {
        return true;
      }

      // Double pawn push
      if (
        colDiff === 0 &&
        fromRow === startRow &&
        rowDiff === 2 * direction &&
        !targetPiece &&
        !board[fromRow + direction][fromCol]
      ) {
        return true;
      }

      // Capture diagonally
      if (absCol === 1 && rowDiff === direction) {
        if (targetPiece && colorOf(targetPiece) === opponent(color)) {
          return true;
        }

        // En passant
        if (
          gameState.enPassant &&
          gameState.enPassant[0] === toRow &&
          gameState.enPassant[1] === toCol
        ) {
          const capturedPawn = board[fromRow][toCol];
          return (
            capturedPawn &&
            typeOf(capturedPawn) === "P" &&
            colorOf(capturedPawn) === opponent(color)
          );
        }
      }

      return false;
    }

    case "N":
      return (absRow === 2 && absCol === 1) || (absRow === 1 && absCol === 2);

    case "B":
      return (
        absRow === absCol &&
        !hasPiecesInPath(board, fromRow, fromCol, toRow, toCol)
      );

    case "R":
      return (
        (rowDiff === 0 || colDiff === 0) &&
        !hasPiecesInPath(board, fromRow, fromCol, toRow, toCol)
      );

    case "Q":
      return (
        (absRow === absCol || rowDiff === 0 || colDiff === 0) &&
        !hasPiecesInPath(board, fromRow, fromCol, toRow, toCol)
      );

    case "K": {
      if (absRow <= 1 && absCol <= 1) {
        return true;
      }

      // Castling
      if (rowDiff === 0 && absCol === 2) {
        const rights = gameState.castling[color];
        if (!rights) return false;

        const baseRow = color === "w" ? 7 : 0;
        if (fromRow !== baseRow || fromCol !== 4) return false;

        const isKingSide = colDiff === 2;
        if (isKingSide && !rights.kingSide) return false;
        if (!isKingSide && !rights.queenSide) return false;

        const rookCol = isKingSide ? 7 : 0;
        const pathCols = isKingSide ? [5, 6] : [1, 2, 3];

        if (
          !board[baseRow][rookCol] ||
          typeOf(board[baseRow][rookCol]) !== "R"
        ) {
          return false;
        }

        for (const c of pathCols) {
          if (board[baseRow][c]) return false;
        }

        return true;
      }

      return false;
    }

    default:
      return false;
  }
}

function applyMove(gameState, fromRow, fromCol, toRow, toCol) {
  const board = gameState.board;
  const piece = board[fromRow][fromCol];
  const type = typeOf(piece);
  const color = colorOf(piece);
  const targetPiece = board[toRow][toCol];

  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  const isEnPassant = type === "P" && colDiff !== 0 && !targetPiece;
  const capturedPiece = isEnPassant ? board[fromRow][toCol] : targetPiece;

  // Move the piece first
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = null;

  // En passant capture
  if (isEnPassant) {
    const captureRow = fromRow;
    board[captureRow][toCol] = null;
  }

  // Castling rook move
  if (type === "K" && Math.abs(colDiff) === 2) {
    const baseRow = color === "w" ? 7 : 0;
    if (toCol === 6) {
      board[baseRow][5] = board[baseRow][7];
      board[baseRow][7] = null;
    } else if (toCol === 2) {
      board[baseRow][3] = board[baseRow][0];
      board[baseRow][0] = null;
    }
  }

  // Pawn promotion
  if (type === "P" && (toRow === 0 || toRow === 7)) {
    board[toRow][toCol] = color + "Q";
  }

  // Update castling rights
  const newCastling = {
    w: { ...gameState.castling.w },
    b: { ...gameState.castling.b },
  };

  if (type === "K") {
    newCastling[color].kingSide = false;
    newCastling[color].queenSide = false;
  }

  if (type === "R") {
    const baseRow = color === "w" ? 7 : 0;
    if (fromRow === baseRow && fromCol === 7)
      newCastling[color].kingSide = false;
    if (fromRow === baseRow && fromCol === 0)
      newCastling[color].queenSide = false;
  }

  if (targetPiece && typeOf(targetPiece) === "R") {
    const capturedColor = colorOf(targetPiece);
    const baseRow = capturedColor === "w" ? 7 : 0;
    if (toRow === baseRow && toCol === 7)
      newCastling[capturedColor].kingSide = false;
    if (toRow === baseRow && toCol === 0)
      newCastling[capturedColor].queenSide = false;
  }

  if (isEnPassant) {
    const capturedColor = opponent(color);
    const baseRow = capturedColor === "w" ? 7 : 0;
    const captureCol = toCol;
    const captureRow = fromRow;
    if (
      captureRow === baseRow &&
      typeOf(board[captureRow][captureCol]) === "R"
    ) {
      if (captureCol === 7) newCastling[capturedColor].kingSide = false;
      if (captureCol === 0) newCastling[capturedColor].queenSide = false;
    }
  }

  gameState.castling = newCastling;
  gameState.enPassant =
    type === "P" && Math.abs(rowDiff) === 2
      ? [fromRow + rowDiff / 2, fromCol]
      : null;

  gameState.turn = opponent(color);
  gameState.moveHistory.push({
    from: [fromRow, fromCol],
    to: [toRow, toCol],
    piece,
    captured: capturedPiece || null,
    timestamp: Date.now(),
  });

  return gameState;
}

module.exports = {
  colorOf,
  typeOf,
  opponent,
  cloneBoard,
  isValidMove,
  applyMove,
};
