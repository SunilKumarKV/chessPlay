import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Chess } from "chess.js";
import { INITIAL_BOARD, INITIAL_CASTLING } from "../constants/board";
import {
  colorOf,
  typeOf,
  opponent,
  buildMoveLabel,
  toAlgebraic,
} from "../utils/boardUtils";
import { getLegalMoves, getGameStatus } from "../utils/moveValidation";
import { applyMove } from "../utils/applyMove";
import { boardToFen, uciToMove } from "../utils/fen";
import { exportPGN, downloadPGN } from "../utils/pgn";
import { detectOpening, normalizeSan } from "../utils/openings";
import {
  isDrawStatus,
  isPlayableStatus,
} from "../utils/gamePresentation";
import { useStockfish } from "./useStockfish";
import { useChessClock, TIME_CONTROLS } from "./useChessClock";
import { useSoundEffects } from "./useSoundEffects";
import { BACKEND_URL } from "../../../config/runtime";

function toSquareName([row, col]) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function getPositionKey(board, turn, castling, enPassant) {
  return boardToFen(board, turn, castling, enPassant, 0, 1)
    .split(" ")
    .slice(0, 4)
    .join(" ");
}


function findLegalMoveFromUci(board, uci, aiColor, enPassant, castling) {
  const parsedMove = uciToMove(uci);
  if (!parsedMove) return null;

  const [fromRow, fromCol] = parsedMove.from;
  const [toRow, toCol] = parsedMove.to;
  const piece = board[fromRow]?.[fromCol];

  if (!piece || colorOf(piece) !== aiColor) return null;

  const legalMoves = getLegalMoves(board, fromRow, fromCol, enPassant, castling);
  const isLegalDestination = legalMoves.some(
    ([legalRow, legalCol]) => legalRow === toRow && legalCol === toCol,
  );

  if (!isLegalDestination) return null;

  const isPromotion = typeOf(piece) === "P" && (toRow === 0 || toRow === 7);
  return {
    from: parsedMove.from,
    to: parsedMove.to,
    promotion: isPromotion ? (parsedMove.promotion || "Q").toUpperCase() : null,
  };
}

function findFallbackAiMove(board, aiColor, enPassant, castling) {
  const legalCandidates = [];

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece || colorOf(piece) !== aiColor) continue;

      const moves = getLegalMoves(board, row, col, enPassant, castling);
      for (const [toRow, toCol] of moves) {
        const isPromotion = typeOf(piece) === "P" && (toRow === 0 || toRow === 7);
        legalCandidates.push({
          from: [row, col],
          to: [toRow, toCol],
          promotion: isPromotion ? "Q" : null,
          isCapture: Boolean(board[toRow][toCol]),
        });
      }
    }
  }

  if (legalCandidates.length === 0) return null;

  const captures = legalCandidates.filter((move) => move.isCapture);
  const pool = captures.length > 0 ? captures : legalCandidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

function hasThreefoldRepetition(positionHistory) {
  const counts = new Map();
  return positionHistory.some((position) => {
    const nextCount = (counts.get(position) || 0) + 1;
    counts.set(position, nextCount);
    return nextCount >= 3;
  });
}

export function useChessGame({
  initialAiEnabled = false,
  initialAiColor = "b",
  initialAiDifficulty = 10,
  initialTimeControlIdx = 7,
  socket = null,
  playerColor = null,
} = {}) {
  const [board, setBoard] = useState(() =>
    INITIAL_BOARD.map((rank) => [...rank]),
  );
  const [turn, setTurn] = useState("w");
  const [enPassant, setEnPassant] = useState(null);
  const [castling, setCastling] = useState(INITIAL_CASTLING);
  const [fullmove, setFullmove] = useState(1);
  const [halfmoveClock, setHalfmoveClock] = useState(0);
  const positionHistory = useRef([
    getPositionKey(INITIAL_BOARD, "w", INITIAL_CASTLING, null),
  ]);
  const [isRepetitionDraw, setIsRepetitionDraw] = useState(false);
  const chessInstanceRef = useRef(null);

  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [promotion, setPromotion] = useState(null);
  const [lastMove, setLastMove] = useState(null);

  const [history, setHistory] = useState([]);
  const [capturedW, setCapturedW] = useState([]);
  const [capturedB, setCapturedB] = useState([]);
  const [hasRecordedGame, setHasRecordedGame] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState(null);
  const [drawPending, setDrawPending] = useState(false);
  const [sanHistory, setSanHistory] = useState([]);

  const [flipped, setFlipped] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(initialAiEnabled);
  const [aiColor, setAiColor] = useState(initialAiColor);
  const [aiDifficulty, setAiDifficulty] = useState(initialAiDifficulty);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeControlIdx, setTimeControlIdx] = useState(initialTimeControlIdx);
  const timeControl = TIME_CONTROLS[timeControlIdx];
  const {
    ready: sfReady,
    thinking: sfThinking,
    engineName: sfEngineName,
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
  const currentOpening = useMemo(() => {
    return detectOpening(sanHistory);
  }, [sanHistory]);

  const getPlayerColor = useCallback(() => {
    if (playerColor) return playerColor;
    if (aiEnabled) return aiColor === "w" ? "b" : "w";
    return turn;
  }, [aiEnabled, aiColor, playerColor, turn]);

  const recordGameResult = useCallback(
    async (result, winnerColor = null) => {
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
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      setHasRecordedGame(true);
      return true;
    },
    [aiDifficulty, aiEnabled, getPlayerColor, history],
  );

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

    if (isPlayableStatus(status) || hasRecordedGame || history.length === 0) return;

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

  const aiMoveInFlightRef = useRef(false);
  const commitMoveRef = useRef(null);
  const moveTimeoutRef = useRef(null);

  useEffect(() => {
    if (!aiEnabled) return undefined;
    if (turn !== aiColor) return undefined;
    if (!isPlayableStatus(status)) return undefined;
    if (aiMoveInFlightRef.current) return undefined;

    let cancelled = false;

    const commitAiMove = (selectedMove, delayMs = 300) => {
      if (cancelled || !selectedMove) return;

      moveTimeoutRef.current = setTimeout(() => {
        if (cancelled || !commitMoveRef.current) return;
        commitMoveRef.current(
          selectedMove.from,
          selectedMove.to,
          selectedMove.promotion,
        );
      }, delayMs);
    };

    const getFallbackMove = () => {
      const fallbackMove = findFallbackAiMove(board, aiColor, enPassant, castling);
      if (fallbackMove) {
        console.log("AI fallback used", fallbackMove);
      } else {
        console.warn("AI: No legal fallback move available");
      }
      return fallbackMove;
    };

    aiMoveInFlightRef.current = true;

    const playFallbackMove = (delayMs = 350) => {
      aiMoveInFlightRef.current = false;
      commitAiMove(getFallbackMove(), delayMs);
    };

    if (!sfReady) {
      // Production-safe fallback: Play vs AI must never freeze while Stockfish boots/fails.
      console.log("AI engine:", sfEngineName || "fallback");
      playFallbackMove(450);
      return () => {
        cancelled = true;
        if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
      };
    }

    const fen = boardToFen(
      board,
      turn,
      castling,
      enPassant,
      halfmoveClock,
      fullmove,
    );

    const thinkingTime = 300 + aiDifficulty * 85;

    getBestMove(fen, { movetime: thinkingTime })
      .then((uci) => {
        if (cancelled) return;
        aiMoveInFlightRef.current = false;

        let selectedMove = null;

        console.log("AI engine:", sfEngineName || "stockfish");
        console.log("AI move:", uci || "none");

        if (uci) {
          selectedMove = findLegalMoveFromUci(board, uci, aiColor, enPassant, castling);
          if (!selectedMove) {
            console.warn("AI: Stockfish returned invalid/unplayable move, using fallback:", uci);
          }
        } else {
          console.warn("AI: No move returned from Stockfish");
        }

        if (!selectedMove) selectedMove = getFallbackMove();
        if (!selectedMove) return;

        commitAiMove(selectedMove, 300 + Math.random() * 200);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("AI: getBestMove error:", error);
        playFallbackMove(300);
      });

    return () => {
      cancelled = true;
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
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
    sfEngineName,
  ]);

  const commitMove = useCallback(
    (from, to, promotionPiece = null) => {
      const [fromRow, fromCol] = from;
      const [toRow, toCol] = to;

      const movingPiece = board[fromRow][fromCol];

      const color = colorOf(movingPiece);
      const type = typeOf(movingPiece);

      let capturedPiece = board[toRow][toCol];

      if (type === "P" && toCol !== fromCol && !board[toRow][toCol]) {
        capturedPiece = board[fromRow][toCol];
      }

      const isCastle = type === "K" && Math.abs(toCol - fromCol) === 2;
      const isPromotion = type === "P" && (toRow === 0 || toRow === 7);
      const isCapture = !!capturedPiece;

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
      setTurn((currentTurn) => opponent(currentTurn));
      setLastMove({ from, to });
      setHalfmoveClock((moveCount) =>
        type === "P" || isCapture ? 0 : moveCount + 1,
      );

      const nextPositionHistory = [
        ...positionHistory.current,
        getPositionKey(newBoard, opponent(color), newCastling, newEnPassant),
      ];
      positionHistory.current = nextPositionHistory;
      setIsRepetitionDraw(hasThreefoldRepetition(nextPositionHistory));

      setSelected(null);
      setLegalMoves([]);

      if (color === "b") setFullmove((moveNumber) => moveNumber + 1);

      if (isCastle) sound.castle();
      else if (isPromotion) sound.promote();
      else if (isCapture) sound.capture();
      else sound.move();

      clock.switchClock(color);

      if (capturedPiece) {
        if (colorOf(capturedPiece) === "b")
          setCapturedW((capturedPieces) => [
            ...capturedPieces,
            capturedPiece,
          ]);
        else {
          setCapturedB((capturedPieces) => [
            ...capturedPieces,
            capturedPiece,
          ]);
        }
      }

      setHistory((moves) => [
        ...moves,
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
            from: toAlgebraic(fromRow, fromCol),
            to: toAlgebraic(toRow, toCol),
            promotion: promotionPiece?.toLowerCase(),
          },
          { strict: false },
        );
        if (result) {
          setSanHistory((prev) => [...prev, normalizeSan(result.san)]);
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

  const handleSquareClick = useCallback(
    (row, col) => {
      if (aiEnabled && turn === aiColor) return;
      if (!isPlayableStatus(status)) return;

      const clickedPiece = board[row][col];

      if (selected) {
        const isLegalMove = legalMoves.some(
          ([legalRow, legalCol]) => legalRow === row && legalCol === col,
        );

        if (isLegalMove) {
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

  const handlePromotion = useCallback(
    (pieceType) => {
      if (!promotion) return;

      commitMove(promotion.from, promotion.to, pieceType);

      setPromotion(null);

      clock.resume(turn);
    },
    [promotion, commitMove, clock, turn],
  );

  const buildCurrentPGN = useCallback(() => {
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

    return exportPGN(history, meta, currentOpening);
  }, [history, status, aiEnabled, aiColor, aiDifficulty, turn, currentOpening]);

  const handleExportPGN = useCallback(() => {
    downloadPGN(
      buildCurrentPGN(),
      `chess-${Date.now()}.pgn`,
    );
  }, [buildCurrentPGN]);

  const resetGame = useCallback(() => {
    setBoard(INITIAL_BOARD.map((rank) => [...rank]));

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
    setSanHistory([]);

    clock.reset();

    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }

    aiMoveInFlightRef.current = false;
  }, [clock]);

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

  const isSelected = (row, col) =>
    selected?.[0] === row && selected?.[1] === col;

  const isLegalDest = (row, col) =>
    legalMoves.some(
      ([legalRow, legalCol]) => legalRow === row && legalCol === col,
    );

  const isLastMove = (row, col) =>
    lastMove &&
    ((lastMove.from[0] === row && lastMove.from[1] === col) ||
      (lastMove.to[0] === row && lastMove.to[1] === col));

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
    buildCurrentPGN,
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
    sfEngineName,

    clock,
    timeControl,
    timeControlIdx,
    setTimeControlIdx,

    soundEnabled,
    setSoundEnabled,
  };
}
