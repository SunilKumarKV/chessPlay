// FEN (Forsyth–Edwards Notation) utilities
//
// FEN string has 6 space-separated fields:
//   1. Piece placement    (rank 8 → rank 1, '/' between ranks)
//   2. Active color       w | b
//   3. Castling rights    KQkq or -
//   4. En passant target  e3 | -
//   5. Halfmove clock     (for 50-move rule — we keep at 0 for simplicity)
//   6. Fullmove number
// ─────────────────────────────────────────────────────────────

import { colorOf, typeOf } from "./boardUtils";
import { FILES, RANKS } from "../constants/board";

// Map piece codes → FEN characters
const PIECE_TO_FEN = {
  wK: "K",
  wQ: "Q",
  wR: "R",
  wB: "B",
  wN: "N",
  wP: "P",
  bK: "k",
  bQ: "q",
  bR: "r",
  bB: "b",
  bN: "n",
  bP: "p",
};

// Map FEN characters → piece codes
const FEN_TO_PIECE = Object.fromEntries(
  Object.entries(PIECE_TO_FEN).map(([k, v]) => [v, k]),
);

export function boardToFen(
  board,
  turn,
  castlingRights,
  enPassant,
  halfmove = 0,
  fullmove = 1,
) {
  // 1. Piece placement
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let row = "";
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) {
        empty++;
      } else {
        if (empty > 0) {
          row += empty;
          empty = 0;
        }
        row += PIECE_TO_FEN[piece] ?? "?";
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  const placement = rows.join("/");

  // 2. Active color
  const active = turn;

  // 3. Castling
  let castling = "";
  if (castlingRights.w.kingSide) castling += "K";
  if (castlingRights.w.queenSide) castling += "Q";
  if (castlingRights.b.kingSide) castling += "k";
  if (castlingRights.b.queenSide) castling += "q";
  if (!castling) castling = "-";

  // 4. En passant
  const ep = enPassant ? `${FILES[enPassant[1]]}${RANKS[enPassant[0]]}` : "-";

  return `${placement} ${active} ${castling} ${ep} ${halfmove} ${fullmove}`;
}
export function fenToBoard(fen) {
  const [placement, active, castling, ep] = fen.split(" ");

  // Board
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  placement.split("/").forEach((row, r) => {
    let c = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        c += parseInt(ch, 10);
      } else {
        board[r][c] = FEN_TO_PIECE[ch] ?? null;
        c++;
      }
    }
  });

  // Castling rights
  const castlingRights = {
    w: { kingSide: castling.includes("K"), queenSide: castling.includes("Q") },
    b: { kingSide: castling.includes("k"), queenSide: castling.includes("q") },
  };

  // En passant
  let enPassant = null;
  if (ep && ep !== "-") {
    const col = FILES.indexOf(ep[0]);
    const row = RANKS.indexOf(ep[1]);
    if (col >= 0 && row >= 0) enPassant = [row, col];
  }

  return { board, turn: active, castlingRights, enPassant };
}
export function uciToMove(uciMove) {
  if (!uciMove || uciMove.length < 4) return null;
  const fc = FILES.indexOf(uciMove[0]);
  const fr = RANKS.indexOf(uciMove[1]);
  const tc = FILES.indexOf(uciMove[2]);
  const tr = RANKS.indexOf(uciMove[3]);
  const promotion = uciMove[4] ? uciMove[4].toUpperCase() : null;
  return { from: [fr, fc], to: [tr, tc], promotion };
}
