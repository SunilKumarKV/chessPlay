import { useState, useEffect, useRef } from "react";
import { useChessClock, TIME_CONTROLS } from "../hooks/useChessClock";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { getLegalMoves } from "../utils/moveValidation";
import Board from "./Board";
import ChatBox from "./ChatBox";
import ErrorBoundary from "../../../components/ErrorBoundary";
import MaterialBalanceBar from "./MaterialBalanceBar";
import MoveListPanel from "./MoveListPanel";
import PlayerClockPlate from "./PlayerClockPlate";
import {
  DRAW_STATUSES,
  formatClockTime,
  getBoardMaterialBalance,
  getMultiplayerStatusLabel,
  pairMoveHistory,
  sortCapturedPieces,
} from "../utils/gamePresentation";
import {
  PIECE_IMAGE_URLS,
  PIECE_NAMES,
  PIECE_SYMBOLS,
  PROMOTION_PIECES,
} from "../constants/pieces";

export default function MultiplayerGameScreen({
  onBack,
  timeControlIdx,
  playerName,
  roomId,
  playerColor,
  opponentName,
  gameState,
  isMyTurn,
  makeMove,
  leaveRoom,
  chatMessages,
  sendMessage,
  drawOffered,
  drawOfferedBy,
  offerDraw,
  acceptDraw,
  declineDraw,
  isConnected,
  error,
  isSpectating = false,
  spectatorCount = 0,
  resign,
}) {
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [pendingMove, setPendingMove] = useState(null);

  const timeControl = TIME_CONTROLS[timeControlIdx];
  const clock = useChessClock({
    initialSeconds: timeControl.initial,
    increment: timeControl.increment,
    enabled: timeControl.initial !== null,
  });

  const { user } = useCurrentUser();
  const currentUser = user?.username || "";
  const currentRating = user?.rating;

  const prevTurnRef = useRef(gameState?.turn);
  const currentTurn = gameState?.turn;

  const { reset: resetClock, switchClock } = clock;

  useEffect(() => {
    resetClock();
    prevTurnRef.current = currentTurn;
    // Reset only when a new room/time control starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetClock, roomId, timeControlIdx]);

  useEffect(() => {
    if (!currentTurn) return;
    const previousTurn = prevTurnRef.current;

    if (previousTurn && previousTurn !== currentTurn) {
      switchClock(previousTurn);
    }

    prevTurnRef.current = currentTurn;
  }, [currentTurn, switchClock]);

  const handleBackToDashboard = () => {
    if (!["playing", "check"].includes(gameState?.status)) {
      leaveRoom?.();
    }
    onBack?.();
  };

  const handleSquareClick = (row, col) => {
    if (!gameState || !isMyTurn) return;

    if (selected) {
      const [selectedRow, selectedCol] = selected;
      if (selectedRow === row && selectedCol === col) {
        setSelected(null);
        setLegalMoves([]);
      } else {
        const isLegalMove = legalMoves.some(
          ([legalRow, legalCol]) => legalRow === row && legalCol === col,
        );
        if (isLegalMove) {
          const piece = gameState.board[selectedRow][selectedCol];
          const isPawn = piece && piece[1] === "P";
          const isPromotion = isPawn && (row === 0 || row === 7);

          if (isPromotion) {
            setPendingMove({
              fromRow: selectedRow,
              fromCol: selectedCol,
              toRow: row,
              toCol: col,
            });
          } else {
            makeMove(selectedRow, selectedCol, row, col);
            setSelected(null);
            setLegalMoves([]);
          }
        }
      }
      return;
    }

    const piece = gameState.board[row][col];
    if (piece && piece[0] === playerColor) {
      setSelected([row, col]);
      setLegalMoves(
        getLegalMoves(
          gameState.board,
          row,
          col,
          gameState.enPassant,
          gameState.castling,
        ),
      );
    }
  };

  const flipped = playerColor === "b";

  const topPlayerColor = isSpectating
    ? flipped
      ? "w"
      : "b"
    : playerColor === "w"
      ? "b"
      : "w";
  const bottomPlayerColor = isSpectating
    ? flipped
      ? "b"
      : "w"
    : playerColor || "w";

  const whiteName = gameState?.players?.w?.name || "Player 1";
  const blackName = gameState?.players?.b?.name || "Player 2";
  const topName = isSpectating
    ? flipped
      ? whiteName
      : blackName
    : opponentName || "Opponent";
  const bottomName = isSpectating
    ? flipped
      ? blackName
      : whiteName
    : user?.username || playerName || "You";

  const topPlayer = {
    name: topName,
    rating: null,
    avatar: "👤",
    color: topPlayerColor,
  };

  const bottomPlayer = {
    name: bottomName,
    rating: currentRating,
    avatar: "👤",
    color: bottomPlayerColor,
  };

  const materialAdvantage = getBoardMaterialBalance(gameState?.board || []);
  const moves = pairMoveHistory(gameState?.moveHistory || []);
  const topCapturedPieces = sortCapturedPieces(
    topPlayer.color === "w" ? gameState?.capturedW : gameState?.capturedB,
  );
  const bottomCapturedPieces = sortCapturedPieces(
    bottomPlayer.color === "w" ? gameState?.capturedW : gameState?.capturedB,
  );
  const topMaterialBonus =
    (topPlayer.color === "w" && materialAdvantage > 0) ||
    (topPlayer.color === "b" && materialAdvantage < 0)
      ? Math.abs(materialAdvantage)
      : 0;
  const bottomMaterialBonus =
    (bottomPlayer.color === "w" && materialAdvantage > 0) ||
    (bottomPlayer.color === "b" && materialAdvantage < 0)
      ? Math.abs(materialAdvantage)
      : 0;

  const handlePromotionSelect = (pieceType) => {
    if (pendingMove) {
      makeMove(
        pendingMove.fromRow,
        pendingMove.fromCol,
        pendingMove.toRow,
        pendingMove.toCol,
        pieceType,
      );
      setPendingMove(null);
      setSelected(null);
      setLegalMoves([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-[#e0e0e0] font-['Inter'] flex flex-col">
      {pendingMove && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#2a2a2a] shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-center mb-6 text-[#e0e0e0]">
              Choose Promotion Piece
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {PROMOTION_PIECES.map((pieceType) => {
                const promotionPiece = `${playerColor || "w"}${pieceType}`;
                return (
                  <button
                    key={pieceType}
                    onClick={() => handlePromotionSelect(pieceType)}
                    className="flex flex-col items-center justify-center p-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg transition-all group"
                  >
                    <img
                      src={PIECE_IMAGE_URLS[promotionPiece]}
                      alt={PIECE_NAMES[pieceType]}
                      className="w-16 h-16 mb-2 group-hover:scale-110 transition-transform"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextElementSibling.style.display = "block";
                      }}
                    />
                    <span
                      className="hidden w-16 h-16 mb-2 text-4xl flex items-center justify-center"
                      style={{ display: "none" }}
                    >
                      {PIECE_SYMBOLS[promotionPiece]}
                    </span>
                    <span className="text-xs font-bold text-[#7a7a7a] group-hover:text-[#e0e0e0]">
                      {PIECE_NAMES[pieceType]}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPendingMove(null)}
              className="w-full mt-6 py-2 text-sm text-[#7a7a7a] hover:text-[#e0e0e0] transition-colors"
            >
              Cancel Move
            </button>
          </div>
        </div>
      )}
      <header className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center space-x-2 text-[#7a7a7a] hover:text-[#e0e0e0] transition-colors text-sm md:text-base"
          >
            <span>←</span>
            <span className="font-['Inter']">Back to Dashboard</span>
          </button>
          <div className="flex items-center space-x-4">
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isConnected
                  ? "bg-[#81b64c]/20 text-[#81b64c]"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </div>
            <span className="text-sm text-[#7a7a7a]">Room: {roomId}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full">
        <div className="flex items-stretch justify-center w-full max-w-[800px]">
          <MaterialBalanceBar
            materialAdvantage={materialAdvantage}
            scale={2.5}
          />

          <div className="flex flex-col w-full max-w-[650px] z-10">
            <PlayerClockPlate
              player={topPlayer}
              capturedPieces={topCapturedPieces}
              materialBonus={topMaterialBonus}
              timeLabel={formatClockTime(clock.times?.[topPlayer.color])}
              isClockActive={gameState?.turn === topPlayer.color}
            />

            <div className="relative my-1">
              <ErrorBoundary>
                <Board
                  board={gameState?.board}
                  flipped={flipped}
                  isSelected={(row, col) =>
                    Boolean(
                      selected && selected[0] === row && selected[1] === col,
                    )
                  }
                  isLegalDest={(row, col) =>
                    legalMoves.some(
                      ([legalRow, legalCol]) =>
                        legalRow === row && legalCol === col,
                    )
                  }
                  isLastMove={() => false}
                  onSquareClick={handleSquareClick}
                />
              </ErrorBoundary>
            </div>

            <PlayerClockPlate
              player={bottomPlayer}
              capturedPieces={bottomCapturedPieces}
              materialBonus={bottomMaterialBonus}
              timeLabel={formatClockTime(clock.times?.[bottomPlayer.color])}
              isClockActive={gameState?.turn === bottomPlayer.color}
            />
          </div>
        </div>

        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#7a7a7a] text-sm font-['Inter']">
                Status
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  isSpectating
                    ? "bg-cyan-500/20 text-cyan-300"
                    : isMyTurn
                    ? "bg-[#81b64c]/20 text-[#81b64c]"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {isSpectating
                  ? "Spectating"
                  : getMultiplayerStatusLabel(gameState?.status, isMyTurn)}
              </span>
            </div>
            {isSpectating && (
              <div className="text-cyan-300 text-xs bg-cyan-500/10 p-2 rounded">
                Spectators: {spectatorCount}
              </div>
            )}
            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 p-2 rounded">
                {error}
              </div>
            )}
            {drawOffered && drawOfferedBy !== playerColor && (
              <div className="space-y-2 bg-[#1f3b2a] border border-[#81b64c]/20 p-3 rounded">
                <div className="text-[#81b64c] text-sm font-semibold">
                  Opponent offers a draw
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={acceptDraw}
                    className="flex-1 py-2 bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] rounded-lg text-sm font-semibold transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={declineDraw}
                    className="flex-1 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg text-sm transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}
            {drawOffered && drawOfferedBy === playerColor && (
              <div className="text-[#81b64c] text-xs bg-[#81b64c]/10 p-2 rounded">
                Draw offer sent
              </div>
            )}
            {!isSpectating && (
              <button
                onClick={offerDraw}
                disabled={drawOffered || DRAW_STATUSES.has(gameState?.status)}
                className="w-full py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed text-[#e0e0e0] rounded-lg text-sm transition-colors font-['Inter']"
              >
                Offer Draw
              </button>
            )}
            {!isSpectating &&
            gameState &&
            ["playing", "check"].includes(gameState.status) ? (
              <button
                onClick={resign}
                className="w-full py-2 bg-[#b12f2f] hover:bg-[#992828] text-white rounded-lg text-sm transition-colors font-['Inter']"
              >
                Resign
              </button>
            ) : !isSpectating ? (
              <button
                onClick={leaveRoom}
                className="w-full py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg text-sm transition-colors font-['Inter']"
              >
                Leave Room
              </button>
            ) : null}
          </div>

          <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden flex flex-col max-h-[250px] flex-shrink-0">
            <div className="p-3 border-b border-[#2a2a2a] bg-[#212121]">
              <h3 className="font-bold text-[#e0e0e0] text-sm font-['Montserrat']">
                Moves
              </h3>
            </div>
            <MoveListPanel
              moves={moves}
              compact
              emptyMessage="Moves will appear once the game starts."
            />
          </div>

          <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] flex-1 min-h-[250px] overflow-hidden flex flex-col">
            <ChatBox
              messages={chatMessages}
              onSend={sendMessage}
              currentUser={currentUser}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
