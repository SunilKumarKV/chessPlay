export const DRAW_STATUSES = new Set([
  "draw",
  "draw-50move",
  "draw-repetition",
  "stalemate",
]);

export const PLAYABLE_STATUSES = new Set(["playing", "check"]);

const PIECE_VALUES = {
  P: 1,
  N: 3,
  B: 3,
  R: 5,
  Q: 9,
  K: 0,
};

const PIECE_SORT_ORDER = "PNBRQK";

export function isDrawStatus(status) {
  return DRAW_STATUSES.has(status);
}

export function isPlayableStatus(status) {
  return PLAYABLE_STATUSES.has(status);
}

export function formatClockTime(seconds) {
  if (seconds === null || seconds === undefined) return "∞";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function sortCapturedPieces(capturedPieces = []) {
  return [...capturedPieces].sort(
    (leftPiece, rightPiece) =>
      PIECE_SORT_ORDER.indexOf(rightPiece[1].toUpperCase()) -
      PIECE_SORT_ORDER.indexOf(leftPiece[1].toUpperCase()),
  );
}

export function getCapturedMaterialBalance(
  whiteCapturedPieces = [],
  blackCapturedPieces = [],
) {
  const whiteCapturedValue = getCapturedPieceValue(whiteCapturedPieces);
  const blackCapturedValue = getCapturedPieceValue(blackCapturedPieces);
  return whiteCapturedValue - blackCapturedValue;
}

export function getBoardMaterialBalance(board = []) {
  let whiteMaterial = 0;
  let blackMaterial = 0;

  for (const rank of board) {
    for (const piece of rank) {
      if (!piece) continue;

      const pieceValue = PIECE_VALUES[piece[1].toUpperCase()] || 0;
      if (piece[0] === "w") {
        whiteMaterial += pieceValue;
      } else {
        blackMaterial += pieceValue;
      }
    }
  }

  return whiteMaterial - blackMaterial;
}

export function pairMoveHistory(history = []) {
  const moves = [];

  for (let historyIndex = 0; historyIndex < history.length; historyIndex += 2) {
    moves.push({
      number: Math.floor(historyIndex / 2) + 1,
      white: getMoveText(history[historyIndex], "-"),
      black: getMoveText(history[historyIndex + 1], ""),
      isLatest: historyIndex + 1 >= history.length - 1,
    });
  }

  return moves;
}

export function getMoveText(move, fallback = "") {
  if (!move) return fallback;
  if (typeof move === "string") return move;
  return move.san || move.lan || move.text || fallback;
}

export function getGameOverMessage(status, turn) {
  if (status === "checkmate") {
    return `${turn === "w" ? "Black" : "White"} wins by checkmate!`;
  }

  if (status === "draw-50move") return "Draw by 50-move rule!";
  if (status === "draw-repetition") return "Draw by threefold repetition!";
  return "Stalemate - Draw!";
}

export function getMultiplayerStatusLabel(status, isMyTurn) {
  if (status === "checkmate") return "Checkmate";
  if (status === "draw-50move") return "50-move draw";
  if (status === "draw-repetition") return "Repetition draw";
  if (isDrawStatus(status)) return "Draw";
  if (status === "check") return "Check";
  return isMyTurn ? "Your turn" : "Opponent's turn";
}

function getCapturedPieceValue(capturedPieces) {
  return capturedPieces.reduce((total, piece) => {
    return total + (PIECE_VALUES[piece[1].toUpperCase()] || 0);
  }, 0);
}
