import React, { useState, useRef, useCallback, useMemo } from "react";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import { selectSquare, makeMove } from "../../../store/slices/chessGameSlice";
import { motion, AnimatePresence } from "framer-motion";
import { soundManager } from "../../../utils/sounds/soundManager";
import { Chess } from "chess.js";
import { getBoardTheme } from "../constants/boardThemes";
import {
  PIECE_IMAGE_URLS,
  PIECE_SYMBOLS,
  PROMOTION_PIECES,
} from "../constants/pieces";

function pieceKeyFromCell(cell) {
  if (!cell) return null;
  if (typeof cell === "string") return cell;
  if (typeof cell === "object" && cell.color && cell.type) {
    return `${cell.color}${String(cell.type).toUpperCase()}`;
  }
  return null;
}

function confirmMoveIfNeeded(confirmMove, from, to) {
  if (!confirmMove) return true;
  return window.confirm(`Play ${from}-${to}?`);
}

export default function Board(props) {
  const MotionDiv = motion.div;
  const MotionButton = motion.button;
  const {
    board: externalBoard,
    flipped: externalFlipped,
    isSelected: externalIsSelected,
    isLegalDest: externalIsLegalDest,
    isLastMove: externalIsLastMove,
    isInCheck: externalIsInCheck,
    onSquareClick: externalOnSquareClick,
    promotion: externalPromotion,
    handlePromotion: externalHandlePromotion,
    disabled: externalDisabled = false,
  } = props || {};

  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.chessGame);
  const settings = useAppSelector((state) => state.chessSettings);

  const [draggedPiece, setDraggedPiece] = useState(null);
  const [, setDragStart] = useState(null);
  const [promotionPending, setPromotionPending] = useState(null);
  const boardRef = useRef(null);
  const isExternalBoard = Array.isArray(externalBoard);
  const boardTheme = useMemo(
    () => getBoardTheme(settings.boardTheme),
    [settings.boardTheme],
  );

  const board = isExternalBoard ? externalBoard : gameState.game.board();
  const flipped = isExternalBoard
    ? Boolean(externalFlipped)
    : gameState.flipped ||
      (settings.whiteAlwaysOnBottom && gameState.aiColor === "w");

  const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const latestInternalMove = isExternalBoard
    ? null
    : gameState.history[gameState.history.length - 1];
  const moveEffect =
    !isExternalBoard && gameState.lastMove
      ? {
          from: gameState.lastMove.from,
          to: gameState.lastMove.to,
          key: `${gameState.lastMove.from}-${gameState.lastMove.to}-${gameState.history.length}`,
          isCapture: Boolean(latestInternalMove?.captured),
        }
      : null;

  const squareToCoords = useCallback((square) => {
    const file = square.charCodeAt(0) - 97;
    const rank = parseInt(square[1], 10);
    return [8 - rank, file];
  }, []);

  const coordsToSquare = useCallback((row, col) => {
    return `${String.fromCharCode(97 + col)}${8 - row}`;
  }, []);

  const handleSquareClick = useCallback(
    (row, col) => {
      if (isExternalBoard) {
        externalOnSquareClick?.(row, col);
        return;
      }
      if (externalDisabled || gameState.isGameOver || gameState.aiThinking) return;

      const square = coordsToSquare(row, col);
      const piece = board[row][col];

      if (gameState.selectedSquare) {
        const from = gameState.selectedSquare;
        const to = square;

        try {
          const testGame = new Chess(gameState.fen);
          const move = testGame.move({ from, to, promotion: "q" });
          if (move) {
            if (!confirmMoveIfNeeded(settings.confirmMove, from, to)) return;
            if (move.flags.includes("p") && !settings.autoQueen) {
              setPromotionPending({ from, to, color: move.color });
              return;
            }
            dispatch(makeMove({ from, to, promotion: "q" }));

            if (settings.playSounds) {
              if (move.captured) {
                soundManager.playCapture();
              } else if (move.flags.includes("k") || move.flags.includes("q")) {
                soundManager.playCastle();
              } else {
                soundManager.playMove();
              }
            }

            return;
          }
        } catch {
          // Invalid move, select new square below if it contains a friendly piece.
        }
      }

      if (piece && gameState.game.turn() === piece.color) {
        dispatch(selectSquare(square));
      } else if (gameState.selectedSquare) {
        dispatch(selectSquare(null));
      }
    },
    [
      gameState,
      settings,
      board,
      dispatch,
      coordsToSquare,
      isExternalBoard,
      externalOnSquareClick,
      externalDisabled,
    ],
  );

  const handleDragStart = useCallback(
    (e, row, col) => {
      if (settings.moveMethod !== "drag") return;
      if (externalDisabled || isExternalBoard) return;

      const piece = board[row][col];
      if (!piece || gameState.game.turn() !== piece.color) return;

      setDraggedPiece({ piece, row, col });
      setDragStart({ row, col });
      dispatch(selectSquare(coordsToSquare(row, col)));

      const img = new Image();
      img.src = PIECE_IMAGE_URLS[pieceKeyFromCell(piece)];
      e.dataTransfer.setDragImage(img, 32, 32);
    },
    [
      board,
      gameState.game,
      settings.moveMethod,
      dispatch,
      coordsToSquare,
      isExternalBoard,
      externalDisabled,
    ],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e, row, col) => {
      e.preventDefault();

      if (externalDisabled || !draggedPiece) return;

      const from = coordsToSquare(draggedPiece.row, draggedPiece.col);
      const to = coordsToSquare(row, col);

      try {
        const testGame = new Chess(gameState.fen);
        const move = testGame.move({ from, to, promotion: "q" });
        if (move) {
          if (!confirmMoveIfNeeded(settings.confirmMove, from, to)) {
            setDraggedPiece(null);
            setDragStart(null);
            return;
          }
          if (move.flags.includes("p") && !settings.autoQueen) {
            setPromotionPending({ from, to, color: move.color });
            setDraggedPiece(null);
            setDragStart(null);
            return;
          }
          dispatch(makeMove({ from, to, promotion: "q" }));

          if (settings.playSounds) {
            if (move.captured) {
              soundManager.playCapture();
            } else if (move.flags.includes("k") || move.flags.includes("q")) {
              soundManager.playCastle();
            } else {
              soundManager.playMove();
            }
          }

        }
      } catch {
        // chess.js rejects illegal drops; the board selection is cleared below.
      }

      setDraggedPiece(null);
      setDragStart(null);
    },
    [
      draggedPiece,
      gameState.fen,
      dispatch,
      coordsToSquare,
      settings.playSounds,
      settings.confirmMove,
      settings.autoQueen,
      externalDisabled,
    ],
  );

  const handlePromotion = useCallback(
    (piece) => {
      if (!promotionPending) return;

      const { from, to } = promotionPending;
      const promotion = piece.toLowerCase();

      try {
        const testGame = new Chess(gameState.fen);
        const move = testGame.move({ from, to, promotion });
        if (move) {
          dispatch(makeMove({ from, to, promotion }));

          if (settings.playSounds) {
            soundManager.playPromote();
          }
        }
      } catch {
        // Invalid promotion state; keep the board stable and let the user continue.
      }

      setPromotionPending(null);
    },
    [promotionPending, gameState.fen, dispatch, settings.playSounds],
  );

  const isSelected = useCallback(
    (row, col) => {
      if (isExternalBoard && typeof externalIsSelected === "function") {
        return externalIsSelected(row, col);
      }
      if (!gameState.selectedSquare) return false;
      const [selRow, selCol] = squareToCoords(gameState.selectedSquare);
      return row === selRow && col === selCol;
    },
    [gameState.selectedSquare, squareToCoords, isExternalBoard, externalIsSelected],
  );

  const isLegalDest = useCallback(
    (row, col) => {
      if (isExternalBoard && typeof externalIsLegalDest === "function") {
        return externalIsLegalDest(row, col);
      }
      return gameState.possibleMoves.includes(coordsToSquare(row, col));
    },
    [
      gameState.possibleMoves,
      coordsToSquare,
      isExternalBoard,
      externalIsLegalDest,
    ],
  );

  const isLastMove = useCallback(
    (row, col) => {
      if (isExternalBoard && typeof externalIsLastMove === "function") {
        return externalIsLastMove(row, col);
      }
      if (!gameState.lastMove) return false;
      const [fromRow, fromCol] = squareToCoords(gameState.lastMove.from);
      const [toRow, toCol] = squareToCoords(gameState.lastMove.to);
      return (
        (row === fromRow && col === fromCol) || (row === toRow && col === toCol)
      );
    },
    [gameState.lastMove, squareToCoords, isExternalBoard, externalIsLastMove],
  );

  const isKingInCheckSquare = useCallback(
    (pieceKey) => {
      if (!pieceKey || pieceKey[1] !== "K") return false;

      if (isExternalBoard) {
        return Boolean(externalIsInCheck);
      }

      return gameState.game.isCheck() && pieceKey[0] === gameState.game.turn();
    },
    [externalIsInCheck, gameState.game, isExternalBoard],
  );

  return (
    <div
      ref={boardRef}
      className={`premium-chess-board relative flex aspect-square w-full select-none overflow-hidden rounded-xl border-[6px] ${externalDisabled ? "pointer-events-none opacity-90" : ""}`}
      style={{
        "--board-glow": boardTheme.glow,
        "--board-legal": boardTheme.legal,
        "--board-legal-capture": boardTheme.legalCapture,
        "--board-last-move": boardTheme.lastMove,
        "--board-selected": boardTheme.selected,
        "--board-check": boardTheme.check,
        "--board-trail": boardTheme.trail,
        borderColor: boardTheme.border,
        boxShadow: boardTheme.shadow,
        background: boardTheme.border,
      }}
    >
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        <AnimatePresence>
          {rows.map((r) =>
            cols.map((c) => {
              const piece = board[r][c];
              const pieceKey = pieceKeyFromCell(piece);
              const isLightSquare = (r + c) % 2 === 0;
              const useTextPieces = ["minimal", "neo", "modern"].includes(
                settings.pieceSet,
              );
              const squareName = coordsToSquare(r, c);
              const isSelectedSquare = isSelected(r, c);
              const isLastMoveSquare = isLastMove(r, c);
              const isLegalSquare = isLegalDest(r, c);
              const hasHint =
                gameState.hint &&
                (gameState.hint.from === squareName ||
                  gameState.hint.to === squareName);
              const hasMoveTrail =
                moveEffect?.from === squareName || moveEffect?.to === squareName;
              const hasCaptureEffect =
                moveEffect?.isCapture && moveEffect.to === squareName;
              const isCheckSquare = isKingInCheckSquare(pieceKey);
              const squareColor = isLightSquare ? boardTheme.light : boardTheme.dark;
              const coordinateColor = isLightSquare
                ? boardTheme.lightText
                : boardTheme.darkText;

              return (
                <MotionDiv
                  key={`${r}-${c}`}
                  layout={settings.pieceAnimations !== "none"}
                  transition={{ duration: settings.animationDuration / 1000 }}
                  className={`premium-board-square relative flex items-center justify-center overflow-hidden ${externalDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                  style={{
                    background: squareColor,
                    backgroundImage: boardTheme.texture,
                  }}
                  onClick={() => handleSquareClick(r, c)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, r, c)}
                >
                  {hasMoveTrail && (
                    <MotionDiv
                      key={`trail-${moveEffect.key}-${squareName}`}
                      className="pointer-events-none absolute inset-0 z-[1]"
                      initial={{ opacity: 0.58 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      style={{ background: boardTheme.trail }}
                    />
                  )}

                  {isLastMoveSquare && (
                    <MotionDiv
                      className="pointer-events-none absolute inset-0 z-[2]"
                      initial={{ opacity: 0.12 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      style={{ background: boardTheme.lastMove }}
                    />
                  )}

                  {isSelectedSquare && (
                    <div
                      className="pointer-events-none absolute inset-0 z-[3]"
                      style={{
                        boxShadow: `inset 0 0 0 4px ${boardTheme.selected}`,
                        background: boardTheme.selected,
                      }}
                    />
                  )}

                  {hasHint && (
                    <div className="pointer-events-none absolute inset-0 z-[4] ring-4 ring-blue-400/80 ring-inset" />
                  )}

                  {settings.highlightLegalMoves && isLegalSquare && (
                    <div
                      className="pointer-events-none absolute inset-0 z-[4]"
                      style={{
                        background: piece
                          ? "transparent"
                          : "radial-gradient(circle, var(--board-legal) 0 18%, transparent 19%)",
                        boxShadow: piece
                          ? `inset 0 0 0 5px ${boardTheme.legalCapture}`
                          : `inset 0 0 22px ${boardTheme.legal}`,
                      }}
                    />
                  )}

                  {isCheckSquare && (
                    <div className="premium-check-warning pointer-events-none absolute inset-0 z-[5]" />
                  )}

                  {settings.showCoordinates && (
                    <>
                      {c === (flipped ? 7 : 0) && (
                        <span
                          className="board-coordinate absolute left-1 top-1 z-20 text-[10px] font-black"
                          style={{ color: coordinateColor }}
                        >
                          {8 - r}
                        </span>
                      )}
                      {r === (flipped ? 0 : 7) && (
                        <span
                          className="board-coordinate absolute bottom-0 right-1 z-20 text-[10px] font-black"
                          style={{ color: coordinateColor }}
                        >
                          {String.fromCharCode(97 + c)}
                        </span>
                      )}
                    </>
                  )}

                  {pieceKey &&
                    !(draggedPiece?.row === r && draggedPiece?.col === c) && (
                      <MotionDiv
                        className="premium-piece z-10 flex h-[90%] w-[90%] select-none items-center justify-center drop-shadow-sm"
                        draggable={settings.moveMethod === "drag"}
                        onDragStart={(e) => handleDragStart(e, r, c)}
                        layout={settings.pieceAnimations !== "none"}
                        initial={
                          settings.pieceAnimations === "none"
                            ? false
                            : { scale: 0.92, opacity: 0.78 }
                        }
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.82, opacity: 0 }}
                        whileHover={
                          settings.pieceAnimations === "none"
                            ? undefined
                            : { y: -5, scale: 1.05 }
                        }
                        whileTap={
                          settings.pieceAnimations === "none"
                            ? undefined
                            : { scale: 0.96 }
                        }
                        transition={{
                          duration: settings.animationDuration / 1000,
                          ease: [0.2, 0.8, 0.2, 1],
                        }}
                      >
                        {!useTextPieces && (
                          <img
                            src={PIECE_IMAGE_URLS[pieceKey]}
                            alt={pieceKey}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "block";
                            }}
                          />
                        )}
                        <span
                          className="text-5xl font-bold select-none leading-none"
                          style={{
                            display: useTextPieces ? "block" : "none",
                            color: pieceKey.startsWith("w") ? "#f8fafc" : "#111827",
                            textShadow:
                              pieceKey.startsWith("w")
                                ? "0 2px 3px rgba(0,0,0,.55)"
                                : "0 1px 2px rgba(255,255,255,.35)",
                            fontFamily:
                              settings.pieceSet === "minimal"
                                ? "'JetBrains Mono', monospace"
                                : "Georgia, serif",
                          }}
                        >
                          {settings.pieceSet === "minimal"
                            ? pieceKey.slice(1)
                            : PIECE_SYMBOLS[pieceKey]}
                        </span>
                      </MotionDiv>
                  )}

                  {settings.showLegalMoves && isLegalDest(r, c) && (
                    <MotionDiv
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`pointer-events-none absolute z-20 rounded-full ${
                        piece ? "h-[82%] w-[82%]" : "h-[28%] w-[28%]"
                      }`}
                      style={{
                        background: piece ? "transparent" : boardTheme.legal,
                        border: piece
                          ? `5px solid ${boardTheme.legalCapture}`
                          : "none",
                        boxShadow: `0 0 18px ${boardTheme.glow}`,
                      }}
                    />
                  )}

                  {hasCaptureEffect && (
                    <div
                      key={`capture-${moveEffect.key}-${squareName}`}
                      className="premium-capture-burst pointer-events-none absolute inset-0 z-30"
                    >
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </MotionDiv>
              );
            }),
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {(promotionPending || externalPromotion) && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm"
          >
            <MotionDiv
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-[#262421] p-6 rounded-xl flex gap-4 shadow-2xl border border-white/10"
            >
              {PROMOTION_PIECES.map((promotionPieceType) => {
                const externalPromotionPiece = externalPromotion
                  ? pieceKeyFromCell(
                      board[externalPromotion.from?.[0]]?.[
                        externalPromotion.from?.[1]
                      ],
                    )
                  : null;
                const promotionColor =
                  promotionPending?.color ||
                  externalPromotion?.color ||
                  externalPromotionPiece?.[0] ||
                  "w";
                const promotionPiece = `${promotionColor}${promotionPieceType}`;
                return (
                  <MotionButton
                    key={promotionPieceType}
                    onClick={() =>
                      isExternalBoard && externalHandlePromotion
                        ? externalHandlePromotion(promotionPieceType)
                        : handlePromotion(promotionPieceType)
                    }
                    className="w-20 h-20 bg-[#ebecd0] rounded-lg flex items-center justify-center hover:bg-white hover:-translate-y-1 transition-all shadow-lg text-black"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img
                      src={PIECE_IMAGE_URLS[promotionPiece]}
                      alt={promotionPieceType}
                      className="w-16 h-16"
                    />
                  </MotionButton>
                );
              })}
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
