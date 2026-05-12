import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import {
  resetGame,
  makeMove,
  resignGame,
  setAiEnabled,
  setAiColor,
  setFlipped,
  setHint,
  setTimeControl,
  undoLastTurn,
  updateClock,
  TIME_CONTROLS,
} from "../../../store/slices/chessGameSlice";
import Board from "../components/Board";
import BoardThemeSelector from "../components/BoardThemeSelector";
import ChessClock from "../components/ChessClock";
import MoveHistory from "../components/MoveHistory";
import ChessSettingsModal from "../../../components/ChessSettingsModal";
import EvaluationBar from "../../../components/EvaluationBar";
import { useStockfish } from "../hooks/useStockfish";
import { soundManager } from "../../../utils/sounds/soundManager";
import { loadSettings } from "../../../utils/settingsPersistence";
import { Chess as ChessEngine } from "chess.js";

const TIME_CONTROL_KEY_BY_SETUP = {
  "1+0": "bullet",
  "2+1": "bullet",
  "3+0": "blitz",
  "5+3": "blitz",
  "10+0": "rapid",
  "10+5": "rapid",
  "30+0": "rapid",
};

export default function Chess({
  onBack,
  initialAiEnabled = true,
  timeControl = "3+0",
  title = initialAiEnabled ? "Play AI" : "Play vs Player",
  opponentName: opponentNameProp,
  playerName: playerNameProp,
}) {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.chessGame);
  const settings = useAppSelector((state) => state.chessSettings);

  const [showSettings, setShowSettings] = useState(false);
  const humanColor = gameState.aiColor === "w" ? "b" : "w";
  const isHumanTurn =
    !gameState.isGameOver && gameState.game.turn() === humanColor;
  const selectedTimeControlKey =
    Object.entries(TIME_CONTROLS).find(
      ([, control]) =>
        control.initial === gameState.timeControl.initial &&
        control.increment === gameState.timeControl.increment,
    )?.[0] || "blitz";

  const initialTimeControlKey = TIME_CONTROL_KEY_BY_SETUP[timeControl] || null;

  const stockfish = useStockfish({
    enabled: gameState.aiEnabled,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    dispatch(setAiEnabled(initialAiEnabled));
    if (initialTimeControlKey) {
      dispatch(setTimeControl(initialTimeControlKey));
    }
    // Apply only when the chess screen is opened so an in-progress game is not
    // reset by unrelated parent renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    soundManager.init();
    soundManager.setEnabled(settings.playSounds);
    soundManager.setTheme(settings.soundTheme);
    soundManager.setVolume(settings.soundVolume);
  }, [settings.playSounds, settings.soundTheme, settings.soundVolume]);

  useEffect(() => {
    if (
      gameState.isGameOver ||
      !gameState.gameStarted ||
      gameState.timeControl.initial === null
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const color = gameState.activeClock;
      const currentTime = color === "w" ? gameState.whiteTime : gameState.blackTime;
      dispatch(updateClock({ color, time: Math.max(0, currentTime - 1) }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    dispatch,
    gameState.activeClock,
    gameState.blackTime,
    gameState.gameStarted,
    gameState.isGameOver,
    gameState.timeControl.initial,
    gameState.whiteTime,
  ]);

  useEffect(() => {
    if (
      !gameState.aiEnabled ||
      !stockfish.ready ||
      gameState.isGameOver ||
      gameState.game.turn() !== gameState.aiColor
    ) {
      return;
    }

    const thinkingTime = 300 + settings.evaluationDepth * 90;

    stockfish
      .getBestMove(gameState.fen, { movetime: thinkingTime })
      .then((uci) => {
        if (!uci) return;
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci[4] || undefined;

        try {
          const testGame = new ChessEngine(gameState.fen);
          const move = testGame.move({ from, to, promotion });
          if (move) {
            dispatch(makeMove({ from, to, promotion }));

            if (settings.playSounds) {
              if (move.captured) {
                soundManager.playCapture();
              } else {
                soundManager.playMove();
              }
            }
          }
        } catch (error) {
          console.error("AI move failed:", error);
        }
      })
      .catch((error) => {
        console.warn("Stockfish getBestMove:", error.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.fen, gameState.aiEnabled, stockfish.ready]);

  const moveHistoryPairs = [];
  for (
    let moveIndex = 0;
    moveIndex < gameState.history.length;
    moveIndex += 2
  ) {
    moveHistoryPairs.push({
      white: gameState.history[moveIndex],
      black: gameState.history[moveIndex + 1] || null,
    });
  }

  const opponentName = opponentNameProp || (gameState.aiEnabled
    ? `Stockfish Lv ${gameState.aiDifficulty}`
    : "Player 2");
  const playerName = playerNameProp || "Player 1";

  const handleNewGame = () => {
    dispatch(resetGame());
    if (settings.playSounds) {
      soundManager.playGameStart();
    }
  };

  const handleHint = async () => {
    if (!isHumanTurn || !stockfish.ready) return;
    dispatch(setHint(null));

    try {
      const uci = await stockfish.getBestMove(gameState.fen, {
        movetime: 700 + settings.evaluationDepth * 60,
      });
      if (!uci) return;

      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const testGame = new ChessEngine(gameState.fen);
      const move = testGame.move({ from, to, promotion: uci[4] || undefined });
      if (move) {
        dispatch(setHint({ from, to, san: move.san }));
      }
    } catch (error) {
      console.warn("Hint unavailable:", error.message);
    }
  };

  const statusLabel = gameState.isGameOver
    ? gameState.result === "checkmate"
      ? "Checkmate"
      : gameState.result === "stalemate"
        ? "Stalemate"
        : gameState.result === "draw"
          ? "Draw"
          : gameState.result === "resigned"
            ? "Resigned"
            : gameState.result === "timeout"
              ? "Time out"
              : "Game over"
    : stockfish.thinking
      ? "AI thinking"
      : `${gameState.game.turn() === "w" ? "White" : "Black"} to move`;

  return (
    <div className="relative min-h-full w-full p-4 text-white md:p-6 xl:p-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <header className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/10 p-4 shadow-xl shadow-black/20 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="mb-2 text-sm font-bold text-slate-400 transition hover:text-white"
                >
                  Back to Dashboard
                </button>
              )}
              <h1 className="font-['Montserrat'] text-2xl font-black text-white md:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {opponentName} · {statusLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BoardThemeSelector compact />
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/15"
              >
                Settings
              </button>
            </div>
          </header>

          <div className="grid gap-4">
            <div className="rounded-xl border border-white/10 bg-white/10 p-3 shadow-xl shadow-black/20 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-xl shadow-inner">
                    {gameState.flipped ? "P" : "AI"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-100">
                      {gameState.flipped ? playerName : opponentName}
                    </div>
                    <ChessClock
                      time={
                        gameState.flipped
                          ? gameState.whiteTime
                          : gameState.blackTime
                      }
                      active={
                        gameState.activeClock === (gameState.flipped ? "w" : "b")
                      }
                      color={gameState.flipped ? "white" : "black"}
                    />
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    gameState.isGameOver
                      ? "bg-rose-400/15 text-rose-300"
                      : stockfish.thinking
                        ? "bg-cyan-400/15 text-cyan-300"
                        : "bg-[#81b64c]/15 text-[#9bd767]"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="relative mx-auto max-w-[min(72vh,680px)]">
                <Board />
                {settings.showEvaluationBar && (
                  <div className="absolute -right-10 top-0 hidden h-full md:block">
                    <EvaluationBar evaluation={0} isThinking={stockfish.thinking} />
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between px-1">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#81b64c] text-sm font-black text-[#07100a] shadow-inner">
                    YOU
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-100">
                      {gameState.flipped ? opponentName : playerName}
                    </div>
                    <ChessClock
                      time={
                        gameState.flipped
                          ? gameState.blackTime
                          : gameState.whiteTime
                      }
                      active={
                        gameState.activeClock === (gameState.flipped ? "b" : "w")
                      }
                      color={gameState.flipped ? "black" : "white"}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch(setFlipped(!gameState.flipped))}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Flip Board
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-xl border border-white/10 bg-white/10 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
            <h2 className="font-['Montserrat'] text-lg font-black text-white">
              Game Controls
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleNewGame}
                className="rounded-lg bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a] transition hover:bg-[#93c85f]"
              >
                New Game
              </button>
              <button
                type="button"
                onClick={() => dispatch(undoLastTurn())}
                disabled={gameState.history.length === 0 || gameState.isGameOver}
                className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/10 disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={handleHint}
                disabled={!isHumanTurn || !stockfish.ready}
                className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-40"
              >
                Hint
              </button>
              <button
                type="button"
                onClick={() => dispatch(resignGame())}
                disabled={gameState.isGameOver || gameState.history.length === 0}
                className="rounded-lg border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-100 transition hover:bg-rose-400/15 disabled:opacity-40"
              >
                Resign
              </button>
            </div>
            {gameState.hint && (
              <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
                Hint: {gameState.hint.san} ({gameState.hint.from} to{" "}
                {gameState.hint.to})
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
            <h2 className="font-['Montserrat'] text-lg font-black text-white">
              Options
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Time Control
                </span>
                <select
                  value={selectedTimeControlKey}
                  onChange={(e) => dispatch(setTimeControl(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-[#111827] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-[#81b64c]"
                >
                  <option value="none">No timer</option>
                  <option value="bullet">Bullet · 1+0</option>
                  <option value="blitz">Blitz · 5+0</option>
                  <option value="rapid">Rapid · 10+0</option>
                </select>
              </label>

              <div>
                <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Play As
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["b", "White"],
                    ["w", "Black"],
                  ].map(([color, label]) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => dispatch(setAiColor(color))}
                      className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                        gameState.aiColor === color
                          ? "bg-[#81b64c] text-[#07100a]"
                          : "border border-white/10 bg-black/20 text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {settings.showMoveHistory && (
            <div className="rounded-xl border border-white/10 bg-white/10 shadow-xl shadow-black/20 backdrop-blur-xl">
              <div className="border-b border-white/10 p-4">
                <h2 className="font-['Montserrat'] text-lg font-black text-white">
                  Moves
                </h2>
              </div>
              <div className="max-h-80 overflow-y-auto p-4 custom-scrollbar">
                <MoveHistory
                  movePairs={moveHistoryPairs}
                  currentMove={gameState.currentMove}
                  pieceNotation={settings.pieceNotation}
                />
              </div>
            </div>
          )}
        </aside>
      </div>

      <div className="fixed bottom-5 right-5 z-20 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleNewGame}
          className="grid h-12 w-12 place-items-center rounded-full bg-[#81b64c] text-sm font-black text-[#07100a] shadow-2xl shadow-[#81b64c]/25 transition hover:-translate-y-1"
          aria-label="New game"
        >
          New
        </button>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-slate-950/80 text-xs font-black text-slate-100 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-1"
          aria-label="Open settings"
        >
          Set
        </button>
      </div>

      <ChessSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
