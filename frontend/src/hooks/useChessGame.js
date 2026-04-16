import { useState, useCallback, useEffect, useMemo, useRef } from "react";
/* =====================
   CORE GAME CONSTANTS
   ==================== */
import { INITIAL_BOARD, INITIAL_CASTLING } from "../constants/board";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

function toSquareName([row, col]) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}
/* =====================
   BOARD UTILITY FUNCTIONS
   ==================== */

import { colorOf, typeOf, opponent, buildMoveLabel } from "../utils/boardUtils";

import { getLegalMoves, getGameStatus } from "../utils/moveValidation";

import { applyMove } from "../utils/applyMove";

/* =================
   OPTIONAL FEATURES
   ================ */

import { boardToFen, uciToMove } from "../utils/fen";
import { exportPGN, downloadPGN } from "../utils/pgn";

import { useStockfish } from "./useStockfish";
import { useChessClock, TIME_CONTROLS } from "./useChessClock";
import { useSoundEffects } from "./useSoundEffects";

export function useChessGame({
  initialAiEnabled = false,
  initialAiColor = "b",
  initialAiDifficulty = 10,
  initialTimeControlIdx = 7,
} = {}) {
  /* =====================
     1️⃣ CORE BOARD STATE
     Stores the actual chess position
     ====================== */

  const [board, setBoard] = useState(() => INITIAL_BOARD.map((r) => [...r]));

  const [turn, setTurn] = useState("w"); // whose turn: w | b
  const [enPassant, setEnPassant] = useState(null);
  const [castling, setCastling] = useState(INITIAL_CASTLING);

  // used for FEN generation
  const [fullmove, setFullmove] = useState(1);

  /* =================================
     2️⃣ USER INTERACTION STATE
     Used by UI for board highlighting
     ================================= */

  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [promotion, setPromotion] = useState(null);
  const [lastMove, setLastMove] = useState(null);

  /* ====================================
     3️⃣ GAME HISTORY
     Tracks moves and captured pieces
     ==================================== */

  const [history, setHistory] = useState([]);
  const [capturedW, setCapturedW] = useState([]);
  const [capturedB, setCapturedB] = useState([]);
  const [hasRecordedGame, setHasRecordedGame] = useState(false);

  /* ========================================
     4️⃣ UI STATE
     ======================================== */

  const [flipped, setFlipped] = useState(false);

  /* ===========================================
     5️⃣ AI SETTINGS (Stockfish)
     =========================================== */

  const [aiEnabled, setAiEnabled] = useState(initialAiEnabled);
  const [aiColor, setAiColor] = useState(initialAiColor);
  const [aiDifficulty, setAiDifficulty] = useState(initialAiDifficulty);

  /* ==============================================
     6️⃣ SOUND SETTINGS
     ============================================== */

  const [soundEnabled, setSoundEnabled] = useState(true);

  /* ==============================================
     7️⃣ CHESS CLOCK
     ============================================== */

  const [timeControlIdx, setTimeControlIdx] = useState(initialTimeControlIdx);
  const timeControl = TIME_CONTROLS[timeControlIdx];

  /* ==============================================
     8️⃣ SUB HOOKS
     Initialize external systems
     ============================================== */

  const {
    ready: sfReady,
    thinking: sfThinking,
    getBestMove,
  } = useStockfish({
    enabled: aiEnabled,
    difficulty: aiDifficulty,
  });

  const clock = useChessClock({
    initialSeconds: timeControl.initial,
    increment: timeControl.increment,
    enabled: timeControl.initial !== null,
  });

  const sound = useSoundEffects({ enabled: soundEnabled });

  const status = useMemo(() => {
    if (clock.flagged) return "checkmate";
    return getGameStatus(board, turn, enPassant, castling);
  }, [board, turn, enPassant, castling, clock.flagged]);

  /* =================================================
     9️⃣ GAME STATUS CHECKER
     Runs after every move
     ================================================= */

  useEffect(() => {
    if (status === "checkmate") {
      sound.gameEnd(
        clock.flagged ? clock.flagged === aiColor : turn !== aiColor,
      );
      clock.pause();
    } else if (status === "stalemate") {
      sound.stalemate();
      clock.pause();
    } else if (status === "check") {
      sound.check();
    }
  }, [status, sound, clock, aiColor, turn]);

  useEffect(() => {
    if (!aiEnabled) {
      return;
    }

    if (status === "playing") {
      setHasRecordedGame(false);
      return;
    }

    if (hasRecordedGame || history.length === 0) return;

    const recordCompletedAIGame = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const userColor = aiColor === "w" ? "b" : "w";
        const winnerColor =
          status === "checkmate" ? (turn === "w" ? "b" : "w") : null;
        const gameResult =
          status === "checkmate"
            ? winnerColor === "w"
              ? "white"
              : "black"
            : "draw";

        const payload = {
          moves: history.map((move) => ({
            from: toSquareName(move.from),
            to: toSquareName(move.to),
            piece: move.piece,
            promotion: move.promotion,
            timestamp: move.timestamp,
          })),
          aiOpponent: true,
          aiDifficulty,
          playerColor: userColor,
          result: gameResult,
          winnerColor: winnerColor === null ? null : winnerColor,
          duration: null,
        };

        await fetch(`${BACKEND_URL}/api/games/record`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        setHasRecordedGame(true);
      } catch (error) {
        console.error("Failed to record completed AI game:", error);
      }
    };

    recordCompletedAIGame();
  }, [
    status,
    aiEnabled,
    hasRecordedGame,
    history,
    aiColor,
    turn,
    aiDifficulty,
  ]);

  /* ====================================================
     11️⃣ AI MOVE ENGINE
     ================================================= */

  const aiThinking = useRef(false);

  const commitMoveRef = useRef(null);

  useEffect(() => {
    if (!aiEnabled) return;
    if (!sfReady) return;
    if (turn !== aiColor) return;

    if (status !== "playing" && status !== "check") return;
    if (aiThinking.current) return;

    aiThinking.current = true;

    const fen = boardToFen(board, turn, castling, enPassant, 0, fullmove);

    const thinkingTime = 300 + aiDifficulty * 85;

    getBestMove(fen, thinkingTime).then((uci) => {
      aiThinking.current = false;

      if (!uci) return;

      const parsed = uciToMove(uci);

      if (parsed)
        commitMoveRef.current(parsed.from, parsed.to, parsed.promotion);
    });
  }, [
    board,
    turn,
    aiEnabled,
    sfReady,
    status,
    aiColor,
    getBestMove,
    castling,
    enPassant,
    fullmove,
    aiDifficulty,
  ]);

  /* ====================================================
     12️⃣ MOVE EXECUTION ENGINE
     The core function that updates the board
     ================================================= */

  const commitMove = useCallback(
    (from, to, promotionPiece = null) => {
      const [fr, fc] = from;
      const [tr, tc] = to;

      const movingPiece = board[fr][fc];

      const color = colorOf(movingPiece);
      const type = typeOf(movingPiece);

      let capturedPiece = board[tr][tc];

      // detect en passant capture

      if (type === "P" && tc !== fc && !board[tr][tc])
        capturedPiece = board[fr][tc];

      const isCastle = type === "K" && Math.abs(tc - fc) === 2;
      const isPromotion = type === "P" && (tr === 0 || tr === 7);
      const isCapture = !!capturedPiece;

      const { newBoard, newEnPassant, newCastling } = applyMove(
        board,
        from,
        to,
        castling,
        promotionPiece || "Q",
      );

      /* update core state */

      setBoard(newBoard);
      setEnPassant(newEnPassant);
      setCastling(newCastling);
      setTurn((t) => opponent(t));
      setLastMove({ from, to });

      setSelected(null);
      setLegalMoves([]);

      if (color === "b") setFullmove((n) => n + 1);

      /* sound effects */

      if (isCastle) sound.castle();
      else if (isPromotion) sound.promote();
      else if (isCapture) sound.capture();
      else sound.move();

      /* chess clock */

      clock.switchClock(color);

      /* captured pieces */

      if (capturedPiece) {
        if (colorOf(capturedPiece) === "b")
          setCapturedW((p) => [...p, capturedPiece]);
        else setCapturedB((p) => [...p, capturedPiece]);
      }

      /* move history */

      setHistory((h) => [
        ...h,
        {
          text: buildMoveLabel(movingPiece, from, to, promotionPiece),
          color,
          from,
          to,
          piece: movingPiece,
          promotion: promotionPiece || null,
          timestamp: Date.now(),
        },
      ]);
    },
    [board, castling, clock, sound],
  );

  useEffect(() => {
    commitMoveRef.current = commitMove;
  }, [commitMove]);

  /* ====================================================
   13️⃣ BOARD CLICK HANDLER
   Handles user interaction with squares
   ================================================= */

  const handleSquareClick = useCallback(
    (row, col) => {
      if (aiEnabled && turn === aiColor) return;
      if (status === "checkmate" || status === "stalemate") return;

      const clickedPiece = board[row][col];

      if (selected) {
        const isLegal = legalMoves.some(([r, c]) => r === row && c === col);

        if (isLegal) {
          const movingPiece = board[selected[0]][selected[1]];

          if (typeOf(movingPiece) === "P" && (row === 0 || row === 7)) {
            clock.pause();

            setPromotion({ from: selected, to: [row, col] });

            setSelected(null);
            setLegalMoves([]);

            return;
          }

          commitMove(selected, [row, col]);
          return;
        }

        if (colorOf(clickedPiece) === turn) {
          setSelected([row, col]);

          setLegalMoves(getLegalMoves(board, row, col, enPassant, castling));

          return;
        }

        setSelected(null);
        setLegalMoves([]);

        return;
      }

      if (clickedPiece && colorOf(clickedPiece) === turn) {
        setSelected([row, col]);

        setLegalMoves(getLegalMoves(board, row, col, enPassant, castling));
      }
    },
    [
      board,
      turn,
      selected,
      legalMoves,
      aiEnabled,
      aiColor,
      status,
      enPassant,
      castling,
      clock,
      commitMove,
    ],
  );

  /* ====================================================
     14️⃣ PROMOTION HANDLER
     ================================================= */

  const handlePromotion = useCallback(
    (pieceType) => {
      if (!promotion) return;

      commitMove(promotion.from, promotion.to, pieceType);

      setPromotion(null);

      clock.resume(turn);
    },
    [promotion, commitMove, clock, turn],
  );

  /* ====================================================
     15️⃣ EXPORT GAME AS PGN
     ================================================= */

  const handleExportPGN = useCallback(() => {
    const meta = {
      white:
        aiEnabled && aiColor === "w" ? `Stockfish Lv${aiDifficulty}` : "Player",

      black:
        aiEnabled && aiColor === "b" ? `Stockfish Lv${aiDifficulty}` : "Player",

      result:
        status === "checkmate"
          ? turn === "w"
            ? "0-1"
            : "1-0"
          : status === "stalemate"
            ? "1/2-1/2"
            : "*",
    };

    downloadPGN(exportPGN(history, meta), `chess-${Date.now()}.pgn`);
  }, [history, status, aiEnabled, aiColor, aiDifficulty, turn]);

  /* ====================================================
     16️⃣ RESET GAME
     ================================================= */

  const resetGame = useCallback(() => {
    setBoard(INITIAL_BOARD.map((r) => [...r]));

    setTurn("w");
    setEnPassant(null);
    setCastling(INITIAL_CASTLING);

    setSelected(null);
    setLegalMoves([]);

    setPromotion(null);
    setLastMove(null);

    setHistory([]);
    setCapturedW([]);
    setCapturedB([]);

    setFullmove(1);

    clock.reset();

    aiThinking.current = false;
  }, [clock]);

  /* ====================================================
     17️⃣ BOARD HELPERS
     Used by BoardSquare component
     ================================================= */

  const isSelected = (r, c) => selected?.[0] === r && selected?.[1] === c;

  const isLegalDest = (r, c) =>
    legalMoves.some(([lr, lc]) => lr === r && lc === c);

  const isLastMove = (r, c) =>
    lastMove &&
    ((lastMove.from[0] === r && lastMove.from[1] === c) ||
      (lastMove.to[0] === r && lastMove.to[1] === c));

  /* ====================================================
     PUBLIC API
     Everything UI components can access
     ================================================= */

  return {
    board,
    turn,
    status,
    flipped,

    history,
    capturedW,
    capturedB,

    promotion,

    isSelected,
    isLegalDest,
    isLastMove,

    handleSquareClick,
    handlePromotion,

    resetGame,
    handleExportPGN,

    toggleFlip: () => setFlipped((f) => !f),

    aiEnabled,
    setAiEnabled,

    aiColor,
    setAiColor,

    aiDifficulty,
    setAiDifficulty,

    sfReady,
    sfThinking,

    clock,
    timeControl,
    timeControlIdx,
    setTimeControlIdx,

    soundEnabled,
    setSoundEnabled,
  };
}
