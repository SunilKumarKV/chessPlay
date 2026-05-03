import { Chess } from "chess.js";
import openings from "../constants/openings.json";
import { toAlgebraic } from "./boardUtils";

function stripMoveNumbers(pgn) {
  return pgn
    .replace(/\d+\.(\.\.)?/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, " ")
    .trim();
}

function normalizeSan(move) {
  return move.replace(/[!?]+/g, "");
}

function pgnToMoves(pgn) {
  return stripMoveNumbers(pgn).split(/\s+/).filter(Boolean).map(normalizeSan);
}

const OPENINGS_BY_LENGTH = openings
  .map((opening) => ({
    ...opening,
    moves: pgnToMoves(opening.pgn),
  }))
  .filter((opening) => opening.moves.length > 0)
  .sort((a, b) => b.moves.length - a.moves.length);

function historyToSanMoves(moveHistory) {
  const chess = new Chess();
  const moves = [];

  for (const move of moveHistory) {
    if (!move?.from || !move?.to) return moves;

    let result = null;
    try {
      result = chess.move(
        {
          from: toAlgebraic(...move.from),
          to: toAlgebraic(...move.to),
          promotion: move.promotion?.toLowerCase(),
        },
        { strict: false },
      );
    } catch {
      return moves;
    }

    if (!result) return moves;
    moves.push(normalizeSan(result.san));
  }

  return moves;
}

export function detectOpening(moveHistory) {
  const playedMoves = historyToSanMoves(moveHistory);
  if (playedMoves.length === 0) return null;

  return (
    OPENINGS_BY_LENGTH.find(
      (opening) =>
        opening.moves.length <= playedMoves.length &&
        opening.moves.every((move, index) => move === playedMoves[index]),
    ) || null
  );
}
