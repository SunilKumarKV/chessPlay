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

function isKingInCheckAfterMove(gameState, fromRow, fromCol, toRow, toCol, color) {
  const tempBoard = cloneBoard(gameState.board);
  const piece = tempBoard[fromRow][fromCol];
  const type = typeOf(piece);
  const targetPiece = tempBoard[toRow][toCol];
  const colDiff = toCol - fromCol;
  const isEnPassant = type === "P" && colDiff !== 0 && !targetPiece;

  // Simulate the move
  tempBoard[toRow][toCol] = piece;
  tempBoard[fromRow][fromCol] = null;
  if (isEnPassant) {
    tempBoard[fromRow][toCol] = null;
  }

  // Find king position
  let kingRow, kingCol;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = tempBoard[r][c];
      if (p === color + "K") {
        kingRow = r;
        kingCol = c;
        break;
      }
    }
    if (kingRow !== undefined) break;
  }

  // Check if any opponent piece can attack the king
  const oppColor = opponent(color);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = tempBoard[r][c];
      if (p && colorOf(p) === oppColor) {
        // Create a mini-gameState for validation
        const miniState = {
          board: tempBoard,
          turn: oppColor,
          enPassant: null, // En passant can't check a king
          castling: { w: {}, b: {} }, // Castling can't check a king
        };
        if (isValidMove(miniState, r, c, kingRow, kingCol, true)) {
          return true;
        }
      }
    }
  }
  return false;
}

function isValidMove(gameState, fromRow, fromCol, toRow, toCol, skipCheckValidation = false) {
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

  let isMoveValid = false;

  switch (type) {
    case "P": {
      const direction = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;

      // Single square move
      if (colDiff === 0 && rowDiff === direction && !targetPiece) {
        isMoveValid = true;
      }
      // Double pawn push
      else if (
        colDiff === 0 &&
        fromRow === startRow &&
        rowDiff === 2 * direction &&
        !targetPiece &&
        !board[fromRow + direction][fromCol]
      ) {
        isMoveValid = true;
      }
      // Capture diagonally
      else if (absCol === 1 && rowDiff === direction) {
        if (targetPiece && colorOf(targetPiece) === opponent(color)) {
          isMoveValid = true;
        }
        // En passant
        else if (
          gameState.enPassant &&
          gameState.enPassant[0] === toRow &&
          gameState.enPassant[1] === toCol
        ) {
          const capturedPawn = board[fromRow][toCol];
          isMoveValid = (
            capturedPawn &&
            typeOf(capturedPawn) === "P" &&
            colorOf(capturedPawn) === opponent(color)
          );
        }
      }
      break;
    }

    case "N":
      isMoveValid = (absRow === 2 && absCol === 1) || (absRow === 1 && absCol === 2);
      break;

    case "B":
      isMoveValid = (
        absRow === absCol &&
        !hasPiecesInPath(board, fromRow, fromCol, toRow, toCol)
      );
      break;

    case "R":
      isMoveValid = (
        (rowDiff === 0 || colDiff === 0) &&
        !hasPiecesInPath(board, fromRow, fromCol, toRow, toCol)
      );
      break;

    case "Q":
      isMoveValid = (
        (absRow === absCol || rowDiff === 0 || colDiff === 0) &&
        !hasPiecesInPath(board, fromRow, fromCol, toRow, toCol)
      );
      break;

    case "K": {
      if (absRow <= 1 && absCol <= 1) {
        isMoveValid = true;
      }
      // Castling
      else if (rowDiff === 0 && absCol === 2) {
        const rights = gameState.castling[color];
        if (!rights) {
          isMoveValid = false;
        } else {
          const baseRow = color === "w" ? 7 : 0;
          if (fromRow !== baseRow || fromCol !== 4) {
            isMoveValid = false;
          } else {
            const isKingSide = colDiff === 2;
            if (isKingSide && !rights.kingSide) {
              isMoveValid = false;
            } else if (!isKingSide && !rights.queenSide) {
              isMoveValid = false;
            } else {
              const rookCol = isKingSide ? 7 : 0;
              const pathCols = isKingSide ? [5, 6] : [1, 2, 3];

              if (
                !board[baseRow][rookCol] ||
                typeOf(board[baseRow][rookCol]) !== "R"
              ) {
                isMoveValid = false;
              } else {
                let pathClear = true;
                for (const c of pathCols) {
                  if (board[baseRow][c]) {
                    pathClear = false;
                    break;
                  }
                }
                isMoveValid = pathClear;
              }
            }
          }
        }
      }
      break;
    }
  }

  if (!isMoveValid) return false;

  // If we are just checking if a piece attacks a square, skip the king-safety check
  if (skipCheckValidation) return true;

  // Final check: does this move leave the king in check?
  return !isKingInCheckAfterMove(gameState, fromRow, fromCol, toRow, toCol, color);
}

function toAlgebraic(row, col) {
  return String.fromCharCode(97 + col) + (8 - row);
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
  let promotionLabel = null;
  if (type === "P" && (toRow === 0 || toRow === 7)) {
    board[toRow][toCol] = color + "Q";
    promotionLabel = "=Q";
  }

  // Update captured arrays
  if (capturedPiece) {
    if (color === "w") {
      gameState.capturedB.push(capturedPiece);
    } else {
      gameState.capturedW.push(capturedPiece);
    }
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

  const moveText = `${piece}@${toAlgebraic(fromRow, fromCol)}→${toAlgebraic(
    toRow,
    toCol,
  )}${promotionLabel || ""}`;

  gameState.moveHistory.push({
    from: [fromRow, fromCol],
    to: [toRow, toCol],
    piece,
    color,
    text: moveText,
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
