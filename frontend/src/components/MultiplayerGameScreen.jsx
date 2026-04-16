import { useState, useEffect, useRef } from "react";
import { useMultiplayerChess } from "../hooks/useMultiplayerChess";
import { useChessClock, TIME_CONTROLS } from "../hooks/useChessClock";
import { getLegalMoves } from "../utils/moveValidation";
import Board from "./Board";
import MoveHistory from "./MoveHistory";
import ChatBox from "./ChatBox";
import CapturedPieces from "./CapturedPieces";
import ChessClock from "./ChessClock";
import GoldButton from "./GoldButton";

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
          makeMove(selRow, selCol, row, col);
          setSelected(null);
          setLegalMoves([]);
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
          if (piece[0] === 'w') whiteMaterial += value;
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
      moves.push({
        number: Math.floor(i / 2) + 1,
        white: history[i],
        black: history[i + 1] || '',
      });
    }
    return moves;
  };

  const materialAdvantage = calculateMaterialAdvantage();
  const moves = formatMoves(gameState?.moveHistory || []);

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white font-['Inter']">
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-xl font-semibold text-green-400">Multiplayer Chess</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
            <span className="text-sm text-gray-400">
              Room: {roomId}
            </span>
          </div>
        </div>
      </header>

      {/* Main Game Layout */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Game Info & Captured Pieces */}
          <div className="lg:col-span-3 space-y-6">
            {/* Game Status */}
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">Game Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Turn:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    isMyTurn ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {isMyTurn ? 'Your turn' : 'Opponent\'s turn'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Status:</span>
                  <span className="text-sm text-white">
                    {gameState?.status === 'checkmate' && 'Checkmate'}
                    {gameState?.status === 'stalemate' && 'Stalemate'}
                    {gameState?.status === 'check' && 'Check'}
                    {gameState?.status === 'normal' && 'In progress'}
                  </span>
                </div>
                {error && (
                  <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Player Cards */}
            <div className="space-y-4">
              {/* White Player */}
              <div className={`bg-[#1a1a1a] rounded-lg p-4 border ${
                gameState?.turn === 'w' ? 'border-[#81b64c] bg-[#81b64c]/5' : 'border-[#2a2a2a]'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                    <span className="font-medium text-white">
                      {playerColor === 'w' ? playerName : opponentName || 'Opponent'}
                    </span>
                  </div>
                  {gameState?.turn === 'w' && (
                    <div className="w-2 h-2 bg-[#81b64c] rounded-full animate-pulse"></div>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {timeControl.label}
                </div>
              </div>

              {/* Black Player */}
              <div className={`bg-[#1a1a1a] rounded-lg p-4 border ${
                gameState?.turn === 'b' ? 'border-[#81b64c] bg-[#81b64c]/5' : 'border-[#2a2a2a]'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                    <span className="font-medium text-white">
                      {playerColor === 'b' ? playerName : opponentName || 'Opponent'}
                    </span>
                  </div>
                  {gameState?.turn === 'b' && (
                    <div className="w-2 h-2 bg-[#81b64c] rounded-full animate-pulse"></div>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {timeControl.label}
                </div>
              </div>
            </div>

            {/* Captured Pieces */}
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">Captured by White</h3>
              <CapturedPieces pieces={gameState?.capturedB || []} label="" />
            </div>

            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">Captured by Black</h3>
              <CapturedPieces pieces={gameState?.capturedW || []} label="" />
            </div>

            {/* Game Controls */}
            <div className="space-y-3">
              <GoldButton onClick={leaveRoom} className="w-full">
                Leave Game
              </GoldButton>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Back to Setup
              </button>
            </div>
          </div>

          {/* Center - Board and Clock */}
          <div className="lg:col-span-6 flex flex-col items-center">
            {/* Clock */}
            <div className="mb-4 w-full max-w-md">
              <ChessClock
                clock={clock}
                turn={gameState?.turn}
                status={gameState?.status}
                flipped={flipped}
              />
            </div>

            {/* Board */}
            <div className="mb-6">
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

            {/* Material Advantage */}
            <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] text-center">
              <div className="text-sm text-gray-400 mb-1">Material</div>
              <div className={`text-lg font-semibold ${
                materialAdvantage > 0 ? 'text-white' : materialAdvantage < 0 ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {materialAdvantage > 0 ? `+${materialAdvantage}` : materialAdvantage}
              </div>
            </div>
          </div>

          {/* Right Panel - Move History & Chat */}
          <div className="lg:col-span-3 space-y-6">
            {/* Move History */}
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">Move History</h3>
              <div className="max-h-64 overflow-y-auto">
                <MoveHistory history={gameState?.moveHistory || []} />
              </div>
            </div>

            {/* Chat */}
            <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <ChatBox
                messages={chatMessages}
                onSend={sendMessage}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}