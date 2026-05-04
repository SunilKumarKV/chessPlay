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

export function detectOpening(sanMoves) {
  if (!Array.isArray(sanMoves) || sanMoves.length === 0) return null;

  return (
    OPENINGS_BY_LENGTH.find(
      (opening) =>
        opening.moves.length <= sanMoves.length &&
        opening.moves.every((move, index) => move === sanMoves[index]),
    ) || null
  );
}
