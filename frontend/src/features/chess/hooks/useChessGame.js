import { useState, useCallback, useEffect, useMemo, useRef } from "react";
/* =====================
   CORE GAME CONSTANTS
   ==================== */
import { INITIAL_BOARD, INITIAL_CASTLING } from "../constants/board";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

function toSquareName([row, col]) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function getPositionKey(board, turn, castling, enPassant) {
  return boardToFen(board, turn, castling, enPassant, 0, 1)
    .split(" ")
    .slice(0, 4)
    .join(" ");
}

function hasThreefoldRepetition(positionHistory) {
  const counts = new Map();
  return positionHistory.some((position) => {
    const nextCount = (counts.get(position) || 0) + 1;
    counts.set(position, nextCount);
    return nextCount >= 3;
  });
}

const DRAW_STATUSES = new Set([
  "draw",
  "draw-50move",
  "draw-repetition",
  "stalemate",
]);

function isDrawStatus(status) {
  return DRAW_STATUSES.has(status);
}

function isPlayableStatus(status) {
  return status === "playing" || status === "check";
}
/* =====================
   BOARD UTILITY FUNCTIONS
   ==================== */

import { colorOf, typeOf, opponent, buildMoveLabel, toAlgebraic } from "../utils/boardUtils";

import { getLegalMoves, getGameStatus } from "../utils/moveValidation";

import { applyMove } from "../utils/applyMove";

/* =================
   OPTIONAL FEATURES
   ================ */

import { boardToFen, uciToMove } from "../utils/fen";
import { exportPGN, downloadPGN } from "../utils/pgn";
import { Chess } from "chess.js";
import { detectOpening, normalizeSan } from "../utils/openings";

import { useStockfish } from "./useStockfish";
import { useChessClock, TIME_CONTROLS } from "./useChessClock";
import { useSoundEffects } from "./useSoundEffects";

export function useChessGame({
  initialAiEnabled = false,
  initialAiColor = "b",
  initialAiDifficulty = 10,
  initialTimeControlIdx = 7,
  socket = null,
  playerColor = null,
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
  const [halfmoveClock, setHalfmoveClock] = useState(0);
  const positionHistory = useRef([
    getPositionKey(INITIAL_BOARD, "w", INITIAL_CASTLING, null),
  ]);
  const [isRepetitionDraw, setIsRepetitionDraw] = useState(false);
  const chessInstanceRef = useRef(null);
  const sanHistoryRef = useRef([]);

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
  const [terminalStatus, setTerminalStatus] = useState(null);
  const [drawPending, setDrawPending] = useState(false);

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

  const boardStatus = useMemo(() => {
    if (clock.flagged) return "checkmate";
    if (halfmoveClock >= 100) return "draw-50move";
    if (isRepetitionDraw) return "draw-repetition";
    return getGameStatus(board, turn, enPassant, castling);
  }, [
    board,
    turn,
    enPassant,
    castling,
    clock.flagged,
    halfmoveClock,
    isRepetitionDraw,
  ]);
  const status = terminalStatus || boardStatus;
  const currentOpening = useMemo(
    () => detectOpening(sanHistoryRef.current),
    [history],
  );

  const getPlayerColor = useCallback(() => {
    if (playerColor) return playerColor;
    if (aiEnabled) return aiColor === "w" ? "b" : "w";
    return turn;
  }, [aiEnabled, aiColor, playerColor, turn]);

  const recordGameResult = useCallback(
    async (result, winnerColor = null) => {
      const token = localStorage.getItem("token");
      if (!token) return false;

      const currentPlayerColor = getPlayerColor();
      const payload = {
        moves: history.map((move) => ({
          from: toSquareName(move.from),
          to: toSquareName(move.to),
          piece: move.piece,
          promotion: move.promotion,
          timestamp: move.timestamp,
        })),
        aiOpponent: aiEnabled,
        aiDifficulty: aiEnabled ? aiDifficulty : 0,
        playerColor: currentPlayerColor,
        result,
        winnerColor,
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
      return true;
    },
    [aiDifficulty, aiEnabled, getPlayerColor, history],
  );

  /* =================================================
     9️⃣ GAME STATUS CHECKER
     Runs after every move
     ================================================= */

  useEffect(() => {
    if (status === "resigned") {
      clock.pause();
    } else if (isDrawStatus(status)) {
      sound.stalemate();
      clock.pause();
    } else if (status === "checkmate") {
      sound.gameEnd(
        clock.flagged ? clock.flagged === aiColor : turn !== aiColor,
      );
      clock.pause();
    } else if (status === "check") {
      sound.check();
    }
  }, [status, sound, clock, aiColor, turn]);

  useEffect(() => {
    if (!aiEnabled) {
      return;
    }

    if (isPlayableStatus(status)) {
      setHasRecordedGame(false);
      return;
    }

    if (hasRecordedGame || history.length === 0) return;

    const recordCompletedAIGame = async () => {
      try {
        const winnerColor =
          status === "checkmate" ? (turn === "w" ? "b" : "w") : null;
        const gameResult = isDrawStatus(status)
          ? "draw"
          : winnerColor === "w"
            ? "white"
            : "black";

        await recordGameResult(gameResult, winnerColor);
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
    recordGameResult,
  ]);

  /* ====================================================
     11️⃣ AI MOVE ENGINE - Stockfish Integration
     
     Waits for AI's turn, requests best move, applies it.
     Flow:
     1. Check preconditions (AI enabled, it's AI's turn, game running)
     2. Generate FEN for current position
     3. Request best move from Stockfish
     4. Parse UCI move (e.g. "e2e4" → {from, to, promotion})
     5. Apply move with slight delay for UX
     ================================================= */

  const aiThinking = useRef(false);
  const commitMoveRef = useRef(null);
  const moveTimeoutRef = useRef(null);

  useEffect(() => {
    // Precondition checks
    if (!aiEnabled) return;
    if (!sfReady) return;
    if (turn !== aiColor) return;
    if (!isPlayableStatus(status)) return;

    // Prevent concurrent AI moves
    if (aiThinking.current) return;

    aiThinking.current = true;

    // Generate FEN string for current position
    const fen = boardToFen(
      board,
      turn,
      castling,
      enPassant,
      halfmoveClock,
      fullmove,
    );

    // Calculate thinking time based on difficulty
    // Easy (3) → ~555ms, Medium (6) → ~810ms, Hard (10) → ~1150ms
    const thinkingTime = 300 + aiDifficulty * 85;

    // Request best move from Stockfish
    getBestMove(fen, { movetime: thinkingTime })
      .then((uci) => {
        aiThinking.current = false;

        // Null = Stockfish error or no legal moves (shouldn't happen)
        if (!uci) {
          console.warn("AI: No move returned from Stockfish");
          return;
        }

        // Parse UCI move string (e.g. "e2e4" → {from: [6,4], to: [4,4]})
        const parsed = uciToMove(uci);
        if (!parsed) {
          console.warn("AI: Failed to parse move:", uci);
          return;
        }

        // Add 300-500ms delay for natural feel (prevent instant moves)
        const delayMs = 300 + Math.random() * 200;
        moveTimeoutRef.current = setTimeout(() => {
          // Double-check commitMoveRef is set (it should be from useEffect below)
          if (commitMoveRef.current) {
            commitMoveRef.current(parsed.from, parsed.to, parsed.promotion);
          }
        }, delayMs);
      })
      .catch((err) => {
        aiThinking.current = false;
        console.error("AI: getBestMove error:", err);
      });

    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
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
    halfmoveClock,
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
      setHalfmoveClock((n) => (type === "P" || isCapture ? 0 : n + 1));

      const nextPositionHistory = [
        ...positionHistory.current,
        getPositionKey(newBoard, opponent(color), newCastling, newEnPassant),
      ];
      positionHistory.current = nextPositionHistory;
      setIsRepetitionDraw(hasThreefoldRepetition(nextPositionHistory));

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

      if (!chessInstanceRef.current) {
        chessInstanceRef.current = new Chess();
      }
      try {
        const result = chessInstanceRef.current.move(
          {
            from: toAlgebraic(fr, fc),
            to: toAlgebraic(tr, tc),
            promotion: promotionPiece?.toLowerCase(),
          },
          { strict: false },
        );
        if (result) {
          sanHistoryRef.current = [
            ...sanHistoryRef.current,
            normalizeSan(result.san),
          ];
        }
      } catch {
        // ignore invalid SAN conversion and keep the incremental history intact
      }
    },
    [board, castling, clock, sound],
  );

  useEffect(() => {
    commitMoveRef.current = commitMove;
  }, [commitMove]);

  /* ====================================================
   13️⃣ BOARD CLICK HANDLER
   Handles user interaction with squares.
   Prevents moves when AI is thinking.
   ================================================= */

  const handleSquareClick = useCallback(
    (row, col) => {
      // Prevent user moves when it's AI's turn
      if (aiEnabled && turn === aiColor) return;

      // Prevent moves after game ends
      if (!isPlayableStatus(status)) return;

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
          : isDrawStatus(status)
            ? "1/2-1/2"
            : "*",
    };

    downloadPGN(
      exportPGN(history, meta, currentOpening),
      `chess-${Date.now()}.pgn`,
    );
  }, [history, status, aiEnabled, aiColor, aiDifficulty, turn, currentOpening]);

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
    setHasRecordedGame(false);
    setTerminalStatus(null);
    setDrawPending(false);
    setIsRepetitionDraw(false);

    setFullmove(1);
    setHalfmoveClock(0);
    positionHistory.current = [
      getPositionKey(INITIAL_BOARD, "w", INITIAL_CASTLING, null),
    ];
    chessInstanceRef.current = null;
    sanHistoryRef.current = [];

    clock.reset();

    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }

    aiThinking.current = false;
  }, [clock]);

  /* ====================================================
     17️⃣ RESIGN GAME
     ================================================= */

  const resignGame = useCallback(() => {
    const resignedColor = getPlayerColor();
    const winnerColor = opponent(resignedColor);
    const result = winnerColor === "w" ? "white" : "black";

    const finishResignation = async () => {
      try {
        setTerminalStatus("resigned");
        clock.pause();
        await recordGameResult(result, winnerColor);
      } catch (error) {
        console.error("Failed to record resignation:", error);
      }
    };

    finishResignation();
  }, [clock, getPlayerColor, recordGameResult]);

  /* ====================================================
     18️⃣ DRAW GAME
     ================================================= */

  const completeDraw = useCallback(async () => {
    try {
      setDrawPending(false);
      setTerminalStatus("draw");
      clock.pause();
      await recordGameResult("draw", null);
    } catch (error) {
      console.error("Failed to record accepted draw:", error);
    }
  }, [clock, recordGameResult]);

  const acceptDraw = useCallback(() => {
    if (socket) {
      socket.emit("drawAccepted");
      setDrawPending(false);
      return;
    }

    completeDraw();
  }, [completeDraw, socket]);

  const declineDraw = useCallback(() => {
    if (socket) {
      socket.emit("drawDeclined");
    }
    setDrawPending(false);
  }, [socket]);

  const confirmReset = useCallback(() => {
    setTerminalStatus(null);
    resetGame();
  }, [resetGame]);

  const offerDraw = useCallback(() => {
    setDrawPending(true);

    if (socket) {
      socket.emit("drawOffer", { fromColor: getPlayerColor() });
      return;
    }
  }, [getPlayerColor, socket]);

  const drawGame = offerDraw;

  useEffect(() => {
    if (!socket) return undefined;

    const handleDrawOffer = () => {
      setDrawPending(true);
    };

    const handleDrawAccepted = () => {
      completeDraw();
    };

    const handleDrawDeclined = () => {
      setDrawPending(false);
    };

    socket.on("drawOffer", handleDrawOffer);
    socket.on("drawAccepted", handleDrawAccepted);
    socket.on("drawDeclined", handleDrawDeclined);

    return () => {
      socket.off("drawOffer", handleDrawOffer);
      socket.off("drawAccepted", handleDrawAccepted);
      socket.off("drawDeclined", handleDrawDeclined);
    };
  }, [completeDraw, socket]);

  /* ====================================================
     19️⃣ BOARD HELPERS
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
    currentOpening,
    capturedW,
    capturedB,
    drawPending,

    promotion,

    isSelected,
    isLegalDest,
    isLastMove,

    handleSquareClick,
    handlePromotion,

    resetGame,
    confirmReset,
    resignGame,
    drawGame,
    offerDraw,
    acceptDraw,
    declineDraw,
    drawPending,
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
