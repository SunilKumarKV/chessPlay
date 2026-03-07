import { useState, useCallback, useEffect } from "react";
// ─────────────────────────────────────────────────────────────
// useChessGame
// Encapsulates 100% of the game state and logic.
// Returns everything the UI needs: board, handlers, derived state.
// ─────────────────────────────────────────────────────────────
export function useChessGame() {
  // ── History / captured pieces
  const [history, setHistory] = useState([]); // [{ text, color }, …]
  const [capturedW, setCapturedW] = useState([]); // pieces white has captured
  const [capturedB, setCapturedB] = useState([]); // pieces black has captured
  // ──────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────
  const commitMove = useCallback((from, to, promotionPiece = null) => {
    const [fr, fc] = from;
    const [tr, tc] = to;
    const movingPiece = board[fr][fc];

    if (capturedPiece) {
      if (colorOf(capturedPiece) === "b")
        setCapturedW((p) => [...p, capturedPiece]);
      else setCapturedB((p) => [...p, capturedPiece]);
    }

    setHistory((h) => [
      ...h,
      {
        text: buildMoveLabel(movingPiece, from, to, promotionPiece),
        color: colorOf(movingPiece),
      },
    ]);
  });

  // ──────────────────────────────────────────
  // Public handlers
  // ──────────────────────────────────────────

  /** Called when the user clicks a board square */
  const handleSquareClick = useCallback((row, col) => {
    if (status === "checkmate" || status === "stalemate") return;

    const clickedPiece = board[row][col];

    // ── A piece is already selected
    if (selected) {
      const isLegal = legalMoves.some(([r, c]) => r === row && c === col);

      if (isLegal) {
        const movingPiece = board[selected[0]][selected[1]];
        // Pawn reaching last rank → ask for promotion choice
        if (typeOf(movingPiece) === "P" && (row === 0 || row === 7)) {
          setPromotion({ from: selected, to: [row, col] });
          setSelected(null);
          setLegalMoves([]);
          return;
        }
        commitMove(selected, [row, col]);
        return;
      }

      // Clicked another friendly piece → re-select
      if (colorOf(clickedPiece) === turn) {
        const moves = getLegalMoves(board, row, col, enPassant, castling);
        setSelected([row, col]);
        setLegalMoves(moves);
        return;
      }

      // Clicked an invalid square → deselect
      setSelected(null);
      setLegalMoves([]);
      return;
    }
  });
  /** Reset everything to the starting position */
  const resetGame = useCallback(() => {
    setHistory([]);
    setCapturedW([]);
    setCapturedB([]);
  }, []);

  return {
    // State

    history,
    capturedW,
    capturedB,
  };
}
