import { useState, useEffect, useRef } from "react";
import { useMultiplayerChess } from "../hooks/useMultiplayerChess";
import { useChessClock, TIME_CONTROLS } from "../hooks/useChessClock";
import { getLegalMoves } from "../utils/moveValidation";
import Board from "./Board";
import ChatBox from "./ChatBox";

// High-quality SVG URLs for authentic Chess.com / Lichess feel
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

export default function MultiplayerGameScreen({
  onBack,
  serverUrl,
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
  isConnected,
  error,
}) {
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [pendingMove, setPendingMove] = useState(null); // { fromRow, fromCol, toRow, toCol }

  const timeControl = TIME_CONTROLS[timeControlIdx];
  const clock = useChessClock({
    initialSeconds: timeControl.initial,
    increment: timeControl.increment,
    enabled: timeControl.initial !== null,
  });

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser).username : "";

  const prevTurnRef = useRef(gameState?.turn);

  useEffect(() => {
    if (gameState) {
      clock.reset();
      prevTurnRef.current = gameState.turn;
    }
  }, [gameState?.roomId, timeControlIdx]);

  useEffect(() => {
    if (!gameState) return;
    const previousTurn = prevTurnRef.current;
    const currentTurn = gameState.turn;

    if (previousTurn && previousTurn !== currentTurn) {
      clock.switchClock(previousTurn);
    }

    prevTurnRef.current = currentTurn;
  }, [gameState?.turn]);

  // Handle square click for multiplayer
  const handleSquareClick = (row, col) => {
    if (!gameState || !isMyTurn) return;

    if (selected) {
      const [selRow, selCol] = selected;
      if (selRow === row && selCol === col) {
        // Deselect
        setSelected(null);
        setLegalMoves([]);
      } else {
        const isLegalMove = legalMoves.some(([r, c]) => r === row && c === col);
        if (isLegalMove) {
          const piece = gameState.board[selRow][selCol];
          const isPawn = piece && piece[1] === "P";
          const isPromotion = isPawn && (row === 0 || row === 7);

          if (isPromotion) {
            setPendingMove({ fromRow: selRow, fromCol: selCol, toRow: row, toCol: col });
          } else {
            makeMove(selRow, selCol, row, col);
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

  const flipped = playerColor === "b"; // Black player sees board flipped

  const topPlayerColor = playerColor === "w" ? "b" : "w";
  const bottomPlayerColor = playerColor || "w";

  const topPlayer = {
    name: opponentName || "Opponent",
    avatar: "👤",
    color: topPlayerColor,
  };

  const bottomPlayer = {
    name: playerName || "You",
    avatar: "👤",
    color: bottomPlayerColor,
  };

  const formatTime = (time) => {
    if (time === null || time === undefined) return "∞";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const getCapturedPieces = (color) => {
    const captured =
      color === "w" ? gameState?.capturedW : gameState?.capturedB;
    if (!captured) return [];
    return [...captured].sort(
      (a, b) =>
        "PNBRQK".indexOf(b[1].toUpperCase()) -
        "PNBRQK".indexOf(a[1].toUpperCase()),
    );
  };

  const calculateMaterialAdvantage = () => {
    if (!gameState) return 0;

    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let whiteMaterial = 0;
    let blackMaterial = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = gameState.board[row][col];
        if (piece) {
          const value = pieceValues[piece[1]];
          if (piece[0] === "w") whiteMaterial += value;
          else blackMaterial += value;
        }
      }
    }

    return whiteMaterial - blackMaterial;
  };

  const formatMoves = (history) => {
    if (!history) return [];
    const moves = [];
    for (let i = 0; i < history.length; i += 2) {
      const whiteText =
        typeof history[i] === "object"
          ? history[i].text || history[i].san
          : history[i];
      const blackText = history[i + 1]
        ? typeof history[i + 1] === "object"
          ? history[i + 1].text || history[i + 1].san
          : history[i + 1]
        : "";
      moves.push({
        number: Math.floor(i / 2) + 1,
        white: whiteText,
        black: blackText,
        isLatest: i + 1 >= history.length - 1,
      });
    }
    return moves;
  };

  const materialAdvantage = calculateMaterialAdvantage();
  const moves = formatMoves(gameState?.moveHistory || []);

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
      {/* Promotion Modal */}
      {pendingMove && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#2a2a2a] shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-center mb-6 text-[#e0e0e0]">
              Choose Promotion Piece
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {["Q", "R", "B", "N"].map((type) => (
                <button
                  key={type}
                  onClick={() => handlePromotionSelect(type)}
                  className="flex flex-col items-center justify-center p-4 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg transition-all group"
                >
                  <img
                    src={PIECE_IMAGES[playerColor + type]}
                    alt={type}
                    className="w-16 h-16 mb-2 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-bold text-[#7a7a7a] group-hover:text-[#e0e0e0]">
                    {type === "Q"
                      ? "Queen"
                      : type === "R"
                        ? "Rook"
                        : type === "B"
                          ? "Bishop"
                          : "Knight"}
                  </span>
                </button>
              ))}
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
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
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

      {/* Main Game Layout */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Center - Eval Bar & Board */}
        <div className="flex items-stretch justify-center w-full max-w-[800px]">
          {/* Evaluation Bar */}
          <div className="hidden md:flex w-8 flex-shrink-0 bg-[#ffffff] rounded-l-md overflow-hidden relative flex-col border-y-4 border-l-4 border-[#282828] my-[52px] mr-[-4px] z-0">
            <div
              className="w-full bg-[#404040] transition-all duration-500 ease-in-out"
              style={{
                height: `${Math.max(5, Math.min(95, 50 - materialAdvantage * 5))}%`,
              }}
            ></div>
            <span
              className={`absolute left-0 right-0 text-center text-[10px] font-bold ${
                materialAdvantage >= 0
                  ? "bottom-1 text-[#404040]"
                  : "top-1 text-[#ffffff]"
              }`}
            >
              {materialAdvantage === 0
                ? "0.0"
                : materialAdvantage > 0
                  ? `+${materialAdvantage}`
                  : materialAdvantage}
            </span>
          </div>

          {/* Board & Plates Column */}
          <div className="flex flex-col w-full max-w-[650px] z-10">
            {/* Top Player Plate */}
            <div className="flex justify-between items-center py-2 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2a2a2a] rounded-sm flex items-center justify-center text-xl shadow-sm">
                  {topPlayer.avatar}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 leading-tight">
                    <span className="font-bold text-[#e0e0e0] text-sm">
                      {topPlayer.name}
                    </span>
                  </div>
                  <div className="flex items-center h-4 mt-0.5">
                    {getCapturedPieces(topPlayer.color).map((p, i) => (
                      <img
                        key={i}
                        src={PIECE_IMAGES[p]}
                        className="w-4 h-4 -ml-1.5 first:ml-0 drop-shadow-sm"
                        alt={p}
                      />
                    ))}
                    {((topPlayer.color === "w" && materialAdvantage > 0) ||
                      (topPlayer.color === "b" && materialAdvantage < 0)) && (
                      <span className="text-[#7a7a7a] text-xs ml-1 font-semibold">
                        +{Math.abs(materialAdvantage)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div
                className={`px-3 py-1 font-mono text-2xl font-bold rounded-sm transition-colors ${
                  gameState?.turn === topPlayer.color
                    ? "bg-[#ffffff] text-[#212121]"
                    : "bg-[#2a2a2a] text-[#7a7a7a]"
                }`}
              >
                {formatTime(clock.times?.[topPlayer.color])}
              </div>
            </div>

            {/* Board */}
            <div className="relative my-1">
              <Board
                board={gameState?.board}
                flipped={flipped}
                isSelected={(r, c) =>
                  selected && selected[0] === r && selected[1] === c
                }
                isLegalDest={(r, c) =>
                  legalMoves.some(([lr, lc]) => lr === r && lc === c)
                }
                isLastMove={() => false}
                onSquareClick={handleSquareClick}
              />
            </div>

            {/* Bottom Player Plate */}
            <div className="flex justify-between items-center py-2 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2a2a2a] rounded-sm flex items-center justify-center text-xl shadow-sm">
                  {bottomPlayer.avatar}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 leading-tight">
                    <span className="font-bold text-[#e0e0e0] text-sm">
                      {bottomPlayer.name}
                    </span>
                  </div>
                  <div className="flex items-center h-4 mt-0.5">
                    {getCapturedPieces(bottomPlayer.color).map((p, i) => (
                      <img
                        key={i}
                        src={PIECE_IMAGES[p]}
                        className="w-4 h-4 -ml-1.5 first:ml-0 drop-shadow-sm"
                        alt={p}
                      />
                    ))}
                    {((bottomPlayer.color === "w" && materialAdvantage > 0) ||
                      (bottomPlayer.color === "b" &&
                        materialAdvantage < 0)) && (
                      <span className="text-[#7a7a7a] text-xs ml-1 font-semibold">
                        +{Math.abs(materialAdvantage)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div
                className={`px-3 py-1 font-mono text-2xl font-bold rounded-sm transition-colors ${
                  gameState?.turn === bottomPlayer.color
                    ? "bg-[#ffffff] text-[#212121]"
                    : "bg-[#2a2a2a] text-[#7a7a7a]"
                }`}
              >
                {formatTime(clock.times?.[bottomPlayer.color])}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Game Status */}
          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#7a7a7a] text-sm font-['Inter']">
                Status
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  isMyTurn
                    ? "bg-[#81b64c]/20 text-[#81b64c]"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {gameState?.status === "checkmate"
                  ? "Checkmate"
                  : gameState?.status === "stalemate"
                    ? "Stalemate"
                    : gameState?.status === "check"
                      ? "Check"
                      : isMyTurn
                        ? "Your turn"
                        : "Opponent's turn"}
              </span>
            </div>
            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 p-2 rounded">
                {error}
              </div>
            )}
            <button
              onClick={leaveRoom}
              className="w-full py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-lg text-sm transition-colors font-['Inter']"
            >
              Leave Room
            </button>
          </div>

          {/* Move History */}
          <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden flex flex-col max-h-[250px] flex-shrink-0">
            <div className="p-3 border-b border-[#2a2a2a] bg-[#212121]">
              <h3 className="font-bold text-[#e0e0e0] text-sm font-['Montserrat']">
                Moves
              </h3>
            </div>
            <div className="p-3 overflow-y-auto scrollbar-thin">
              <div className="space-y-1 font-['JetBrains Mono'] text-sm">
                {moves.map((move, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-1.5 rounded ${
                      move.isLatest
                        ? "bg-[#81b64c]/10 border border-[#81b64c]/30"
                        : "hover:bg-[#2a2a2a]"
                    } transition-colors`}
                  >
                    <span className="text-[#7a7a7a] w-6 text-xs">
                      {move.number}.
                    </span>
                    <span
                      className={`flex-1 text-xs ${!move.white ? "text-[#7a7a7a]" : "text-[#e0e0e0]"}`}
                    >
                      {move.white}
                    </span>
                    <span
                      className={`flex-1 text-xs ${!move.black ? "text-[#7a7a7a]" : "text-[#e0e0e0]"}`}
                    >
                      {move.black}
                    </span>
                  </div>
                ))}
                {moves.length === 0 && (
                  <div className="text-[#7a7a7a] text-center py-2 text-sm">
                    No moves yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Box */}
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
