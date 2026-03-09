import { useState, useCallback, useEffect } from "react";
import { INITIAL_BOARD, INITIAL_CASTLING } from "../constants/board";
import { colorOf, typeOf, opponent, buildMoveLabel } from "../utils/boardUtils";
import { getLegalMoves, getGameStatus } from "../utils/moveValidation";
import { applyMove } from "../utils/applyMove";

export function useChessGame() {
  // ── Core game state
  const [board, setBoard] = useState(() => INITIAL_BOARD.map((r) => [...r]));
  const [turn, setTurn] = useState("w");
  const [enPassant, setEnPassant] = useState(null);
  const [castling, setCastling] = useState(INITIAL_CASTLING);
  const [status, setStatus] = useState("playing"); // playing | check | checkmate | stalemate

  // ── Interaction state
  const [selected, setSelected] = useState(null); // [row, col] | null
  const [legalMoves, setLegalMoves] = useState([]); // [[r,c], …]
  const [promotion, setPromotion] = useState(null); // { from, to } | null
  const [lastMove, setLastMove] = useState(null); // { from, to } | null

  // ── History / captured pieces
  const [history, setHistory] = useState([]); // [{ text, color }, …]
  const [capturedW, setCapturedW] = useState([]); // pieces white has captured
  const [capturedB, setCapturedB] = useState([]); // pieces black has captured

  // ── Board orientation
  const [flipped, setFlipped] = useState(false);

  // ── Recompute status after every move
  useEffect(() => {
    setStatus(getGameStatus(board, turn, enPassant, castling));
  }, [board, turn, enPassant, castling]);

  // ──────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────
  const commitMove = useCallback(
    (from, to, promotionPiece = null) => {
      const [fr, fc] = from;
      const [tr, tc] = to;
      const movingPiece = board[fr][fc];

      // Determine captured piece (including en passant)
      let capturedPiece = board[tr][tc];
      if (typeOf(movingPiece) === "P" && tc !== fc && !board[tr][tc]) {
        capturedPiece = board[fr][tc]; // en passant
      }

      const { newBoard, newEnPassant, newCastling } = applyMove(
        board,
        from,
        to,
        castling,
        promotionPiece || "Q",
      );

      setBoard(newBoard);
      setEnPassant(newEnPassant);
      setCastling(newCastling);
      setTurn((t) => opponent(t));
      setLastMove({ from, to });
      setSelected(null);
      setLegalMoves([]);

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
    },
    [board, castling],
  );

  // ──────────────────────────────────────────
  // Public handlers
  // ──────────────────────────────────────────

  /** Called when the user clicks a board square */
  const handleSquareClick = useCallback(
    (row, col) => {
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

      // ── Nothing selected yet — select a friendly piece
      if (clickedPiece && colorOf(clickedPiece) === turn) {
        const moves = getLegalMoves(board, row, col, enPassant, castling);
        setSelected([row, col]);
        setLegalMoves(moves);
      }
    },
    [
      board,
      turn,
      selected,
      legalMoves,
      enPassant,
      castling,
      status,
      commitMove,
    ],
  );

  /** Called when the user picks a promotion piece */
  const handlePromotion = useCallback(
    (pieceType) => {
      if (!promotion) return;
      commitMove(promotion.from, promotion.to, pieceType);
      setPromotion(null);
    },
    [promotion, commitMove],
  );

  /** Reset everything to the starting position */
  const resetGame = useCallback(() => {
    setBoard(INITIAL_BOARD.map((r) => [...r]));
    setTurn("w");
    setEnPassant(null);
    setCastling(INITIAL_CASTLING);
    setStatus("playing");
    setSelected(null);
    setLegalMoves([]);
    setPromotion(null);
    setLastMove(null);
    setHistory([]);
    setCapturedW([]);
    setCapturedB([]);
  }, []);

  const toggleFlip = useCallback(() => setFlipped((f) => !f), []);

  // ── Derived square-state helpers (used by BoardSquare)
  const isSelected = (r, c) => selected?.[0] === r && selected?.[1] === c;
  const isLegalDest = (r, c) =>
    legalMoves.some(([lr, lc]) => lr === r && lc === c);
  const isLastMove = (r, c) =>
    lastMove &&
    ((lastMove.from[0] === r && lastMove.from[1] === c) ||
      (lastMove.to[0] === r && lastMove.to[1] === c));

  return {
    // State
    board,
    turn,
    status,
    history,
    capturedW,
    capturedB,
    promotion,
    flipped,
    // Square helpers
    isSelected,
    isLegalDest,
    isLastMove,
    // Handlers
    handleSquareClick,
    handlePromotion,
    resetGame,
    toggleFlip,
  };
}
