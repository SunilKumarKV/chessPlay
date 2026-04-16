import { useMemo, useState } from "react";
import Board from "./Board";
import GoldButton from "./GoldButton";
import { applyMove } from "../utils/applyMove";
import { INITIAL_BOARD, INITIAL_CASTLING } from "../constants/board";

function parseSquare(square) {
  const file = square?.[0];
  const rank = Number(square?.[1]);
  const col = file ? file.charCodeAt(0) - 97 : 0;
  const row = Number.isFinite(rank) ? 8 - rank : 7;
  return [row, col];
}

export default function GameReplay({ game, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const positions = useMemo(() => {
    const boards = [INITIAL_BOARD.map((row) => [...row])];
    let castling = {
      w: { ...INITIAL_CASTLING.w },
      b: { ...INITIAL_CASTLING.b },
    };

    for (const move of game.moves || []) {
      const from = parseSquare(move.from);
      const to = parseSquare(move.to);
      const promotion = move.promotion || "Q";
      const { newBoard, newCastling } = applyMove(
        boards[boards.length - 1],
        from,
        to,
        castling,
        promotion,
      );
      boards.push(newBoard);
      castling = newCastling;
    }

    return boards;
  }, [game.moves]);

  const currentBoard = positions[Math.min(currentStep, positions.length - 1)];

  const lastMove = useMemo(() => {
    if (currentStep === 0) return null;
    return game.moves?.[currentStep - 1] ?? null;
  }, [currentStep, game.moves]);

  const isLastMove = (row, col) => {
    if (!lastMove) return false;
    const from = parseSquare(lastMove.from);
    const to = parseSquare(lastMove.to);
    return (
      (from[0] === row && from[1] === col) || (to[0] === row && to[1] === col)
    );
  };

  const resultLabel = (() => {
    if (game.result === "draw") return "Draw";
    if (game.winner?.username) return `${game.winner.username} won`;
    if (game.result === "white") return "White won";
    if (game.result === "black") return "Black won";
    return "Completed";
  })();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start p-5"
      style={{
        background:
          "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        color: "#e8dcc8",
        fontFamily: "'Crimson Text', Georgia, serif",
      }}
    >
      <div className="w-full max-w-6xl mb-4 flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-widest">Replay Game</h1>
          <p className="text-sm opacity-70 mt-2">
            {resultLabel} • {game.moves?.length ?? 0} moves •{" "}
            {new Date(game.endTime).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <GoldButton onClick={onClose}>← Back to History</GoldButton>
        </div>
      </div>

      <div className="w-full max-w-6xl grid gap-4 xl:grid-cols-[minmax(520px,1fr)_320px]">
        <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="text-xs uppercase opacity-60">Step</div>
              <div className="mt-2 text-2xl font-semibold">{currentStep}</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="text-xs uppercase opacity-60">Total moves</div>
              <div className="mt-2 text-2xl font-semibold">
                {game.moves?.length ?? 0}
              </div>
            </div>
          </div>

          <Board
            board={currentBoard}
            flipped={false}
            isSelected={() => false}
            isLegalDest={() => false}
            isLastMove={isLastMove}
            onSquareClick={() => null}
          />

          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            <GoldButton onClick={() => setCurrentStep(0)}>First</GoldButton>
            <GoldButton
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
            >
              Prev
            </GoldButton>
            <GoldButton
              onClick={() =>
                setCurrentStep((s) => Math.min(game.moves?.length ?? 0, s + 1))
              }
              disabled={currentStep === (game.moves?.length ?? 0)}
            >
              Next
            </GoldButton>
            <GoldButton onClick={() => setCurrentStep(game.moves?.length ?? 0)}>
              Last
            </GoldButton>
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 border border-white/10 p-4 overflow-hidden">
          <h2 className="text-xl font-semibold mb-3">Move List</h2>
          <div className="space-y-2 max-h-[56vh] overflow-y-auto">
            {(game.moves || []).map((move, index) => {
              const label = `${index + 1}. ${move.piece ?? "?"} ${move.from} → ${move.to}`;
              const active = index + 1 === currentStep;
              return (
                <button
                  key={`${move.from}-${move.to}-${index}`}
                  className={`w-full text-left rounded-2xl px-3 py-2 transition ${
                    active
                      ? "bg-yellow-400/20 text-white"
                      : "bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                  onClick={() => setCurrentStep(index + 1)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
