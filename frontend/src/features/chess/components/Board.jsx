import React, { useState, useRef, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import { selectSquare, makeMove } from "../../../store/slices/chessGameSlice";
import { motion, AnimatePresence } from "framer-motion";
import { soundManager } from "../../../utils/sounds/soundManager";

// Fallback text pieces for when images fail to load
const PIECE_TEXT = {
  wP: "♙",
  wN: "♘",
  wB: "♗",
  wR: "♖",
  wQ: "♕",
  wK: "♔",
  bP: "♟",
  bN: "♞",
  bB: "♝",
  bR: "♜",
  bQ: "♛",
  bK: "♚",
};

const PIECE_IMAGES = {
  wP: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wP.svg",
  wN: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wN.svg",
  wB: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wB.svg",
  wR: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wR.svg",
  wQ: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wQ.svg",
  wK: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/wK.svg",
  bP: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bP.svg",
  bN: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bN.svg",
  bB: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bB.svg",
  bR: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bR.svg",
  bQ: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bQ.svg",
  bK: "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/bK.svg",
};

function pieceKeyFromCell(cell) {
  if (!cell) return null;
  if (typeof cell === "string") return cell;
  if (typeof cell === "object" && cell.color && cell.type) {
    return `${cell.color}${String(cell.type).toUpperCase()}`;
  }
  return null;
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
    onSquareClick: externalOnSquareClick,
    promotion: externalPromotion,
    handlePromotion: externalHandlePromotion,
  } = props || {};

  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.chessGame);
  const settings = useAppSelector((state) => state.chessSettings);

  const [draggedPiece, setDraggedPiece] = useState(null);
  const [, setDragStart] = useState(null);
  const [promotionPending, setPromotionPending] = useState(null);
  const boardRef = useRef(null);
  const isExternalBoard = Array.isArray(externalBoard);

  // Convert board array to the format expected by the component
  const board = isExternalBoard ? externalBoard : gameState.game.board();
  const flipped = isExternalBoard
    ? Boolean(externalFlipped)
    : gameState.flipped ||
      (settings.whiteAlwaysOnBottom && gameState.aiColor === "w");

  const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  // Convert square notation to coordinates
  const squareToCoords = useCallback((square) => {
    const file = square.charCodeAt(0) - 97; // 'a' = 0
    const rank = parseInt(square[1]) - 1; // '1' = 0
    return [rank, file];
  }, []);

  const coordsToSquare = useCallback((row, col) => {
    return `${String.fromCharCode(97 + col)}${row + 1}`;
  }, []);

  // Handle square click
  const handleSquareClick = useCallback(
    (row, col) => {
      if (gameState.isGameOver || gameState.aiThinking) return;
      if (isExternalBoard && externalOnSquareClick) {
        externalOnSquareClick(row, col);
        return;
      }

      const square = coordsToSquare(row, col);
      const piece = board[row][col];

      if (settings.moveMethod === "click") {
        if (gameState.selectedSquare) {
          // Try to make a move
          const from = gameState.selectedSquare;
          const to = square;

          try {
            const move = gameState.game.move({ from, to, promotion: "q" }); // Default to queen
            if (move) {
              dispatch(makeMove({ from, to, promotion: "q" }));

              // Play sound
              if (settings.playSounds) {
                if (move.captured) {
                  soundManager.playCapture();
                } else if (
                  move.flags.includes("k") ||
                  move.flags.includes("q")
                ) {
                  soundManager.playCastle();
                } else {
                  soundManager.playMove();
                }
              }

              // Check for promotion
              if (move.flags.includes("p")) {
                setPromotionPending({ from, to, color: move.color });
              }
            }
          } catch {
            // Invalid move, select new square
            if (piece && gameState.game.turn() === piece.color) {
              dispatch(selectSquare(square));
            }
          }
        } else {
          // Select piece
          if (piece && gameState.game.turn() === piece.color) {
            dispatch(selectSquare(square));
          }
        }
      } else {
        // Drag & drop mode - just select
        if (piece && gameState.game.turn() === piece.color) {
          dispatch(selectSquare(square));
        }
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
    ],
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (e, row, col) => {
      if (settings.moveMethod !== "drag") return;
      if (isExternalBoard) return;

      const piece = board[row][col];
      if (!piece || gameState.game.turn() !== piece.color) return;

      setDraggedPiece({ piece, row, col });
      setDragStart({ row, col });
      dispatch(selectSquare(coordsToSquare(row, col)));

      // Create drag image
      const img = new Image();
      img.src = PIECE_IMAGES[piece];
      e.dataTransfer.setDragImage(img, 32, 32);
    },
    [
      board,
      gameState.game,
      settings.moveMethod,
      dispatch,
      coordsToSquare,
      isExternalBoard,
    ],
  );

  // Handle drag over
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (e, row, col) => {
      e.preventDefault();

      if (!draggedPiece) return;

      const from = coordsToSquare(draggedPiece.row, draggedPiece.col);
      const to = coordsToSquare(row, col);

      try {
        const move = gameState.game.move({ from, to, promotion: "q" });
        if (move) {
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

          if (move.flags.includes("p")) {
            setPromotionPending({ from, to, color: move.color });
          }
        }
      } catch {
        console.log("Invalid move");
      }

      setDraggedPiece(null);
      setDragStart(null);
    },
    [
      draggedPiece,
      gameState.game,
      dispatch,
      coordsToSquare,
      settings.playSounds,
    ],
  );

  // Handle promotion
  const handlePromotion = useCallback(
    (piece) => {
      if (!promotionPending) return;

      const { from, to } = promotionPending;
      const promotion = piece.toLowerCase();

      try {
        const move = gameState.game.move({ from, to, promotion });
        if (move) {
          dispatch(makeMove({ from, to, promotion }));

          if (settings.playSounds) {
            soundManager.playPromote();
          }
        }
      } catch (error) {
        console.error("Promotion failed:", error);
      }

      setPromotionPending(null);
    },
    [promotionPending, gameState.game, dispatch, settings.playSounds],
  );

  // Check if square is selected
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

  // Check if square is a legal destination
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

  // Check if square is part of last move
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

  return (
    <div
      ref={boardRef}
      className="relative w-full aspect-square border-4 border-[#282828] rounded-md overflow-hidden shadow-2xl select-none flex"
    >
      {/* 8x8 Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        <AnimatePresence>
          {rows.map((r) =>
            cols.map((c) => {
              const piece = board[r][c];
              const pieceKey = pieceKeyFromCell(piece);
              const isLightSquare = (r + c) % 2 === 0;

              // Chess.com standard styling
              const bgColor = isLightSquare ? "bg-[#ebecd0]" : "bg-[#739552]";
              const selectedStyle = isSelected(r, c) ? "bg-yellow-400/50" : "";
              const lastMoveStyle = isLastMove(r, c) ? "bg-yellow-400/30" : "";
              const legalMoveStyle =
                settings.highlightLegalMoves && isLegalDest(r, c)
                  ? "bg-blue-400/30"
                  : "";

              return (
                <MotionDiv
                  key={`${r}-${c}`}
                  layout={settings.pieceAnimations !== "none"}
                  transition={{ duration: settings.animationDuration / 1000 }}
                  className={`relative flex items-center justify-center ${bgColor} ${selectedStyle} ${lastMoveStyle} ${legalMoveStyle} cursor-pointer`}
                  onClick={() => handleSquareClick(r, c)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, r, c)}
                >
                  {/* Square Coordinates */}
                  {settings.showCoordinates && (
                    <>
                      {c === (flipped ? 7 : 0) && (
                        <span
                          className={`absolute top-1 left-1 text-[10px] font-bold ${isLightSquare ? "text-[#739552]" : "text-[#ebecd0]"}`}
                        >
                          {8 - r}
                        </span>
                      )}
                      {r === (flipped ? 0 : 7) && (
                        <span
                          className={`absolute bottom-0 right-1 text-[10px] font-bold ${isLightSquare ? "text-[#739552]" : "text-[#ebecd0]"}`}
                        >
                          {String.fromCharCode(97 + c)}
                        </span>
                      )}
                    </>
                  )}

                  {/* Piece Image/Text */}
                  {pieceKey &&
                    draggedPiece?.row !== r &&
                    draggedPiece?.col !== c && (
                      <MotionDiv
                        className="w-[90%] h-[90%] z-10 drop-shadow-sm pointer-events-none select-none flex items-center justify-center"
                        draggable={settings.moveMethod === "drag"}
                        onDragStart={(e) => handleDragStart(e, r, c)}
                        layout={settings.pieceAnimations !== "none"}
                        transition={{
                          duration: settings.animationDuration / 1000,
                        }}
                      >
                        <img
                          src={PIECE_IMAGES[pieceKey]}
                          alt={pieceKey}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback to text piece if image fails to load
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "block";
                          }}
                        />
                        <span
                          className="text-4xl font-bold select-none"
                          style={{ display: "none" }}
                        >
                          {PIECE_TEXT[pieceKey]}
                        </span>
                      </MotionDiv>
                    )}

                  {/* Valid Move Indicator */}
                  {settings.showLegalMoves && isLegalDest(r, c) && (
                    <MotionDiv
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`absolute z-20 ${piece ? "w-full h-full border-[5px] border-black/20 rounded-full" : "w-1/3 h-1/3 bg-black/20 rounded-full"}`}
                    />
                  )}
                </MotionDiv>
              );
            }),
          )}
        </AnimatePresence>
      </div>

      {/* Pawn Promotion Overlay Dialog */}
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
              {["Q", "R", "B", "N"].map((pt) => {
                const promoColor = promotionPending?.color || externalPromotion?.color;
                const promoPiece = `${promoColor}${pt}`;
                return (
                  <MotionButton
                    key={pt}
                    onClick={() =>
                      isExternalBoard && externalHandlePromotion
                        ? externalHandlePromotion(pt)
                        : handlePromotion(pt)
                    }
                    className="w-20 h-20 bg-[#ebecd0] rounded-lg flex items-center justify-center hover:bg-white hover:-translate-y-1 transition-all shadow-lg text-black"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img
                      src={PIECE_IMAGES[promoPiece]}
                      alt={pt}
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
