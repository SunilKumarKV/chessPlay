const express = require("express");
const rateLimit = require("express-rate-limit");
const { spawn } = require("child_process");
const { Chess } = require("chess.js");
const auth = require("../middleware/auth");

const router = express.Router();

const AI_LEVELS = {
  easy: { depth: 2, skill: 1, movetime: 450 },
  medium: { depth: 6, skill: 8, movetime: 800 },
  hard: { depth: 12, skill: 16, movetime: 1300 },
  pro: { depth: 16, skill: 20, movetime: 2000 },
};

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20_000 };
const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many AI requests. Please slow down." },
});

function normalizeLevel(value) {
  return AI_LEVELS[value] ? value : "medium";
}

function boardToFenPlacement(board) {
  if (!Array.isArray(board) || board.length !== 8) throw new Error("Board must be an 8x8 array.");
  return board.map((row) => {
    if (!Array.isArray(row) || row.length !== 8) throw new Error("Board must be an 8x8 array.");
    let rank = "";
    let empty = 0;
    for (const square of row) {
      if (!square) {
        empty += 1;
        continue;
      }
      if (!/^[wb][PNBRQK]$/.test(square)) throw new Error("Board contains an unsupported piece.");
      if (empty) {
        rank += String(empty);
        empty = 0;
      }
      const piece = square[1];
      rank += square[0] === "w" ? piece : piece.toLowerCase();
    }
    return rank + (empty ? String(empty) : "");
  }).join("/");
}

function fenFromRequest(body) {
  if (typeof body.fen === "string" && body.fen.trim()) {
    new Chess(body.fen);
    return body.fen.trim();
  }
  const turn = body.turn === "b" ? "b" : "w";
  const placement = boardToFenPlacement(body.board);
  return `${placement} ${turn} - - 0 1`;
}

function squareToBackend(square) {
  return {
    row: 8 - Number(square[1]),
    col: square.charCodeAt(0) - 97,
  };
}

function moveToPayload(move) {
  const from = squareToBackend(move.from);
  const to = squareToBackend(move.to);
  return {
    fromRow: from.row,
    fromCol: from.col,
    toRow: to.row,
    toCol: to.col,
    promotion: move.promotion || undefined,
  };
}

function uciToPayload(uci, chess) {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.slice(4, 5) || undefined;
  const legal = chess.moves({ verbose: true }).find((move) => move.from === from && move.to === to && (!promotion || move.promotion === promotion));
  if (!legal) return null;
  return moveToPayload({ from, to, promotion });
}

function evaluateFallbackMove(chess, move, level) {
  const next = new Chess(chess.fen());
  next.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
  const captureScore = move.captured ? PIECE_VALUES[move.captured] || 0 : 0;
  const promotionScore = move.promotion ? PIECE_VALUES[move.promotion] || 0 : 0;
  const checkScore = next.inCheck() ? 45 : 0;
  const mateScore = next.isCheckmate() ? 100_000 : 0;
  const developmentScore = "nbrq".includes(move.piece) ? 8 : 0;
  const centerScore = ["d4", "d5", "e4", "e5"].includes(move.to) ? 10 : 0;
  const base = mateScore + captureScore + promotionScore + checkScore + developmentScore + centerScore;
  if (level === "easy") return captureScore ? base : -base;
  if (level === "medium") return base + (move.piece === "p" ? 3 : 0);
  return base;
}

function fallbackMove(chess, level) {
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;
  return [...moves].sort((left, right) => {
    const scoreDiff = evaluateFallbackMove(chess, right, level) - evaluateFallbackMove(chess, left, level);
    if (scoreDiff !== 0) return scoreDiff;
    return `${left.from}${left.to}${left.promotion || ""}`.localeCompare(`${right.from}${right.to}${right.promotion || ""}`);
  })[0];
}

function runStockfish(fen, levelConfig) {
  const executable = process.env.STOCKFISH_PATH || "stockfish";
  const timeoutMs = Math.max(1200, Math.min(4000, Number(levelConfig.movetime || 800) + 1200));

  return new Promise((resolve) => {
    let resolved = false;
    let stderr = "";
    let stdout = "";
    let processRef;

    function finish(result) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      try { processRef?.kill(); } catch { /* noop */ }
      resolve(result);
    }

    const timeout = setTimeout(() => finish({ bestMove: null, error: "Stockfish timed out" }), timeoutMs);

    try {
      processRef = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });
    } catch (error) {
      finish({ bestMove: null, error: error.message });
      return;
    }

    processRef.on("error", (error) => finish({ bestMove: null, error: error.message }));
    processRef.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    processRef.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      const bestMoveMatch = stdout.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/i);
      if (bestMoveMatch) {
        const depthMatches = [...stdout.matchAll(/\bdepth\s+(\d+)/g)];
        const cpMatches = [...stdout.matchAll(/\bscore cp (-?\d+)/g)];
        const mateMatches = [...stdout.matchAll(/\bscore mate (-?\d+)/g)];
        const pvMatch = stdout.match(/\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?(?:\s+[a-h][1-8][a-h][1-8][qrbn]?)*)/i);
        const mate = mateMatches.at(-1)?.[1];
        const cp = cpMatches.at(-1)?.[1];
        finish({
          bestMove: bestMoveMatch[1].toLowerCase(),
          depth: depthMatches.length ? Number(depthMatches.at(-1)[1]) : null,
          evaluation: mate ? { type: "mate", value: Number(mate) } : cp ? { type: "cp", value: Number(cp) / 100 } : null,
          bestLine: pvMatch?.[1]?.trim().split(/\s+/).slice(0, 8) || [],
        });
      }
    });

    processRef.stdin.write("uci\n");
    processRef.stdin.write(`setoption name Skill Level value ${Math.max(0, Math.min(20, Number(levelConfig.skill || 8)))}\n`);
    processRef.stdin.write("isready\n");
    processRef.stdin.write(`position fen ${fen}\n`);
    processRef.stdin.write(`go movetime ${Math.max(250, Math.min(2500, Number(levelConfig.movetime || 800)))}\n`);
    processRef.on("close", () => finish({ bestMove: null, error: stderr || "Stockfish closed without a move" }));
  });
}

router.post("/move", auth, aiLimiter, async (req, res) => {
  try {
    const level = normalizeLevel(req.body.level);
    const levelConfig = AI_LEVELS[level];
    const fen = fenFromRequest(req.body);
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    if (!legalMoves.length) return res.status(400).json({ message: "No legal AI moves are available for this position" });

    const engineResult = await runStockfish(fen, levelConfig);
    const engineMove = engineResult.bestMove ? uciToPayload(engineResult.bestMove, chess) : null;
    if (engineMove) {
      return res.json({
        move: engineMove,
        evaluation: engineResult.evaluation || null,
        bestLine: engineResult.bestLine || [],
        depth: engineResult.depth || levelConfig.depth,
        source: "stockfish",
      });
    }

    const selectedFallback = fallbackMove(chess, level);
    return res.json({
      move: moveToPayload(selectedFallback),
      evaluation: null,
      bestLine: [],
      depth: 1,
      source: "fallback",
    });
  } catch (error) {
    console.error("AI move error:", error);
    res.status(400).json({ message: error.message || "Unable to calculate AI move" });
  }
});

module.exports = router;
