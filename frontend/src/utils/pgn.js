import { fenToBoard } from "./fen";
import { INITIAL_BOARD, INITIAL_CASTLING } from "../constants/board";

export function exportPGN(history, meta = {}) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
  const white = meta.white ?? "Player";
  const black = meta.black ?? "Opponent";
  const result = meta.result ?? "*";
  const event = meta.event ?? "Chess Game";

  const headers = [
    `[Event "${event}"]`,
    `[Site "Chess App — github.com"]`,
    `[Date "${date}"]`,
    `[White "${white}"]`,
    `[Black "${black}"]`,
    `[Result "${result}"]`,
  ].join("\n");

  const moves = [];
  for (let i = 0; i < history.length; i += 2) {
    const num = Math.floor(i / 2) + 1;
    const white = history[i]?.text ?? "";
    const black = history[i + 1]?.text ?? "";
    moves.push(black ? `${num}. ${white} ${black}` : `${num}. ${white}`);
  }

  return `${headers}\n\n${moves.join(" ")} ${result}`;
}

export function parsePGN(pgn) {
  try {
    const lines = pgn.trim().split("\n");
    const meta = {};
    const bodyLines = [];

    for (const line of lines) {
      const headerMatch = line.match(/^\[(\w+)\s+"([^"]*)"\]/);
      if (headerMatch) {
        meta[headerMatch[1].toLowerCase()] = headerMatch[2];
      } else if (line.trim()) {
        bodyLines.push(line.trim());
      }
    }

    // Strip move numbers and result tokens
    const body = bodyLines.join(" ");
    const clean = body
      .replace(/\d+\./g, "") // remove move numbers
      .replace(/\{[^}]*\}/g, "") // remove comments
      .replace(/\([^)]*\)/g, "") // remove variations
      .replace(/\$\d+/g, "") // remove NAG annotations
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, "") // remove result
      .trim();

    const moves = clean.split(/\s+/).filter(Boolean);
    return { meta, moves };
  } catch {
    return null;
  }
}

export function downloadPGN(pgn, filename = "game.pgn") {
  const blob = new Blob([pgn], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
