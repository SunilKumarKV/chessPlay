import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  resetGame,
  setAiEnabled,
  setFlipped,
  setTimeControl,
  undoLastMove,
  updateClock,
  TIME_CONTROLS,
} from "../../../store/slices/chessGameSlice";
import Board from "../components/Board";
import BoardThemeSelector from "../components/BoardThemeSelector";
import ChessClock from "../components/ChessClock";
import MoveHistory from "../components/MoveHistory";
import ChessSettingsModal from "../../../components/ChessSettingsModal";
import { soundManager } from "../../../utils/sounds/soundManager";

const TIME_CONTROL_KEY_BY_SETUP = {
  "1+0": "bullet",
  "2+1": "bullet",
  "3+0": "blitz",
  "5+3": "blitz",
  "10+0": "rapid",
  "10+5": "rapid",
  "30+0": "rapid",
};

function readCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function cleanPlayerName(value, fallback) {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
}

function resultLabel(gameState, localResult) {
  if (localResult?.type === "draw") return "Draw agreed";
  if (localResult?.type === "resigned") return `${localResult.resignedName} resigned`;
  if (gameState.isGameOver) {
    if (gameState.result === "checkmate") return "Checkmate";
    if (gameState.result === "stalemate") return "Stalemate";
    if (gameState.result === "draw") return "Draw";
    if (gameState.result === "timeout") return "Time out";
    return "Game over";
  }
  if (gameState.game.isCheck()) return `${gameState.game.turn() === "w" ? "White" : "Black"} is in check`;
  return `${gameState.game.turn() === "w" ? "White" : "Black"} to move`;
}

function statusTone(gameState, localResult) {
  if (localResult || gameState.isGameOver) return "bg-rose-400/15 text-rose-200 border-rose-300/20";
  if (gameState.game.isCheck()) return "bg-amber-300/15 text-amber-100 border-amber-200/20";
  return "bg-[#81b64c]/15 text-[#b9f18d] border-[#81b64c]/25";
}

function pieceList(pieces = []) {
  return pieces.length ? pieces.join(" ") : "None yet";
}

export default function LocalChessPage({ onBack, onNavigate, timeControl = "3+0" }) {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector((state) => state.chessGame);
  const settings = useAppSelector((state) => state.chessSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [setupOpen, setSetupOpen] = useState(true);
  const [playerOne, setPlayerOne] = useState("Player 1");
  const [playerTwo, setPlayerTwo] = useState("Player 2");
  const [playerOneSide, setPlayerOneSide] = useState("w");
  const [autoFlip, setAutoFlip] = useState(false);
  const [localResult, setLocalResult] = useState(null);
  const [notice, setNotice] = useState({ type: "info", text: "Set up both players, then start a same-device chess match." });
  const [confirmAction, setConfirmAction] = useState(null);
  const [nameError, setNameError] = useState("");
  const [saved, setSaved] = useState(false);
  const currentUser = readCurrentUser();
  const isSupporter = Boolean(currentUser?.isSupporter || currentUser?.supporter || currentUser?.plan === "supporter");
  const isLoggedIn = Boolean(currentUser && !currentUser.isGuest);

  const selectedTimeControlKey =
    Object.entries(TIME_CONTROLS).find(
      ([, control]) =>
        control.initial === gameState.timeControl.initial &&
        control.increment === gameState.timeControl.increment,
    )?.[0] || "blitz";

  const initialTimeControlKey = TIME_CONTROL_KEY_BY_SETUP[timeControl] || null;

  useEffect(() => {
    dispatch(setAiEnabled(false));
    if (initialTimeControlKey) dispatch(setTimeControl(initialTimeControlKey));
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    soundManager.init();
    soundManager.setEnabled(settings.playSounds);
    soundManager.setTheme(settings.soundTheme);
    soundManager.setVolume(settings.soundVolume);
  }, [settings.playSounds, settings.soundTheme, settings.soundVolume]);

  useEffect(() => {
    if (!autoFlip || gameState.aiEnabled || setupOpen || localResult || gameState.isGameOver) return;
    dispatch(setFlipped(gameState.game.turn() === "b"));
  }, [autoFlip, dispatch, gameState.aiEnabled, gameState.game, gameState.history.length, gameState.isGameOver, localResult, setupOpen]);

  useEffect(() => {
    if (setupOpen || localResult || gameState.isGameOver || gameState.timeControl.initial === null) return undefined;
    const timer = window.setInterval(() => {
      const color = gameState.activeClock;
      const currentTime = color === "w" ? gameState.whiteTime : gameState.blackTime;
      // The shared slice handles timeout result safely without changing chess rules.
      dispatch(updateClock({ color, time: Math.max(0, currentTime - 1) }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [dispatch, gameState.activeClock, gameState.blackTime, gameState.isGameOver, gameState.timeControl.initial, gameState.whiteTime, localResult, setupOpen]);

  const names = useMemo(() => {
    const p1 = cleanPlayerName(playerOne, "Player 1");
    const p2 = cleanPlayerName(playerTwo, "Player 2");
    return {
      playerOne: p1,
      playerTwo: p2,
      white: playerOneSide === "w" ? p1 : p2,
      black: playerOneSide === "b" ? p1 : p2,
    };
  }, [playerOne, playerOneSide, playerTwo]);

  const currentTurnName = gameState.game.turn() === "w" ? names.white : names.black;
  const status = resultLabel(gameState, localResult);
  const localGameEnded = Boolean(localResult || gameState.isGameOver);
  const boardDisabled = setupOpen || localGameEnded;
  const winnerName = localResult?.winnerName || (gameState.winner === "w" ? names.white : gameState.winner === "b" ? names.black : null);

  const moveHistoryPairs = [];
  for (let moveIndex = 0; moveIndex < gameState.history.length; moveIndex += 2) {
    moveHistoryPairs.push({
      white: gameState.history[moveIndex],
      black: gameState.history[moveIndex + 1] || null,
    });
  }

  function startGame(options = {}) {
    const p1 = cleanPlayerName(options.playerOne ?? playerOne, "Player 1");
    const p2 = cleanPlayerName(options.playerTwo ?? playerTwo, "Player 2");
    if (!p1 || !p2) {
      setNameError("Add both player names or use Skip setup.");
      return;
    }
    const sideChoice = options.side || playerOneSide;
    const resolvedSide = sideChoice === "random" ? (Math.random() > 0.5 ? "w" : "b") : sideChoice;
    setPlayerOne(p1);
    setPlayerTwo(p2);
    setPlayerOneSide(resolvedSide);
    setNameError("");
    setSetupOpen(false);
    setLocalResult(null);
    setSaved(false);
    setNotice({ type: "success", text: "Game started. White moves first." });
    dispatch(setAiEnabled(false));
    dispatch(resetGame());
    dispatch(setFlipped(resolvedSide === "b"));
    if (settings.playSounds) soundManager.playGameStart();
  }

  function skipSetup() {
    startGame({ playerOne: "White Player", playerTwo: "Black Player", side: "w" });
  }

  function newGameSamePlayers() {
    setLocalResult(null);
    setSaved(false);
    dispatch(resetGame());
    dispatch(setAiEnabled(false));
    dispatch(setFlipped(playerOneSide === "b"));
    setNotice({ type: "success", text: "New local game started with the same players." });
  }

  function resignCurrentPlayer() {
    const resignedColor = gameState.game.turn();
    const resignedName = resignedColor === "w" ? names.white : names.black;
    const winner = resignedColor === "w" ? names.black : names.white;
    setLocalResult({ type: "resigned", resignedColor, resignedName, winnerName: winner });
    setNotice({ type: "success", text: `${winner} wins by resignation.` });
  }

  function agreeDraw() {
    setLocalResult({ type: "draw", winnerName: null });
    setNotice({ type: "success", text: "Draw agreed. Start a rematch when ready." });
  }

  function saveLocalResult() {
    if (!isLoggedIn) {
      setNotice({ type: "info", text: "Sign in to save local games to this browser profile." });
      return;
    }
    const record = {
      id: `local-${Date.now()}`,
      mode: "local",
      white: names.white,
      black: names.black,
      result: localResult?.type || gameState.result || "completed",
      winner: winnerName || "Draw",
      moves: gameState.history.map((move) => move.san),
      savedAt: new Date().toISOString(),
    };
    const previous = JSON.parse(localStorage.getItem("chessplay-local-games") || "[]");
    localStorage.setItem("chessplay-local-games", JSON.stringify([record, ...previous].slice(0, 50)));
    setSaved(true);
    setNotice({ type: "success", text: "Game saved locally. Full cloud history can be connected later without blocking play." });
  }

  function requestConfirm(action, title, message, confirmLabel) {
    setConfirmAction({ action, title, message, confirmLabel });
  }

  function runConfirmedAction() {
    const action = confirmAction?.action;
    setConfirmAction(null);
    action?.();
  }

  const topName = gameState.flipped ? names.white : names.black;
  const bottomName = gameState.flipped ? names.black : names.white;
  const topColor = gameState.flipped ? "w" : "b";
  const bottomColor = gameState.flipped ? "b" : "w";

  return (
    <div className="relative min-h-full w-full p-4 text-white md:p-6 xl:p-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-4">
          <header className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                {onBack && (
                  <button type="button" onClick={onBack} className="mb-2 text-sm font-bold text-slate-400 transition hover:text-white">
                    Back to Dashboard
                  </button>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-['Montserrat'] text-2xl font-black text-white md:text-3xl">Play vs Player</h1>
                  {isSupporter && <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">Supporter</span>}
                </div>
                <p className="mt-1 max-w-2xl text-sm text-slate-400">Play a local chess match on the same device. Core gameplay stays free; supporter benefits are cosmetic and help keep ChessPlay running.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BoardThemeSelector compact />
                <button type="button" onClick={() => setShowSettings(true)} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/15">Settings</button>
              </div>
            </div>
          </header>

          {notice && (
            <div role="status" className={`rounded-xl border p-3 text-sm font-semibold ${notice.type === "success" ? "border-[#81b64c]/30 bg-[#81b64c]/10 text-[#b9f18d]" : notice.type === "error" ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"}`}>
              {notice.text}
            </div>
          )}

          {setupOpen && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-6">
              <h2 className="font-['Montserrat'] text-xl font-black text-white">Set up players</h2>
              <p className="mt-1 text-sm text-slate-400">Names are shown only in this local match. Use Skip setup for quick same-device play.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Player 1</span>
                  <input value={playerOne} onChange={(e) => setPlayerOne(e.target.value)} maxLength={24} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[#81b64c]" placeholder="Player 1 name" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Player 2</span>
                  <input value={playerTwo} onChange={(e) => setPlayerTwo(e.target.value)} maxLength={24} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-[#81b64c]" placeholder="Player 2 name" />
                </label>
              </div>
              <div className="mt-5">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Side assignment</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    ["w", "Player 1 as White"],
                    ["b", "Player 1 as Black"],
                    ["random", "Random sides"],
                  ].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setPlayerOneSide(value)} className={`rounded-xl px-4 py-3 text-sm font-black transition ${playerOneSide === value ? "bg-[#81b64c] text-[#07100a]" : "border border-white/10 bg-black/20 text-slate-100 hover:bg-white/10"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {nameError && <p className="mt-3 text-sm font-semibold text-rose-200">{nameError}</p>}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => startGame()} className="rounded-xl bg-[#81b64c] px-5 py-3 font-black text-[#07100a] transition hover:bg-[#93c85f]">Start Game</button>
                <button type="button" onClick={skipSetup} className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/15">Skip setup</button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-sm font-black shadow-inner">{topColor === "w" ? "W" : "B"}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-100">{topName}</div>
                  <div className="text-xs text-slate-500">{topColor === "w" ? "White" : "Black"}</div>
                  <ChessClock time={topColor === "w" ? gameState.whiteTime : gameState.blackTime} active={!localGameEnded && gameState.activeClock === topColor} color={topColor === "w" ? "white" : "black"} />
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusTone(gameState, localResult)}`}>{status}</span>
            </div>

            <div className="relative mx-auto max-w-[min(92vw,72vh,680px)]">
              <Board disabled={boardDisabled} />
              {boardDisabled && !setupOpen && (
                <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/30 p-4 text-center backdrop-blur-[1px]">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 shadow-xl">
                    <p className="text-lg font-black text-white">{winnerName ? `${winnerName} wins` : status}</p>
                    <p className="mt-1 text-sm text-slate-400">Start a rematch or save this game locally.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#81b64c] text-sm font-black text-[#07100a] shadow-inner">{bottomColor === "w" ? "W" : "B"}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-100">{bottomName}</div>
                  <div className="text-xs text-slate-500">{bottomColor === "w" ? "White" : "Black"}</div>
                  <ChessClock time={bottomColor === "w" ? gameState.whiteTime : gameState.blackTime} active={!localGameEnded && gameState.activeClock === bottomColor} color={bottomColor === "w" ? "white" : "black"} />
                </div>
              </div>
              <button type="button" onClick={() => dispatch(setFlipped(!gameState.flipped))} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Flip chess board manually">Flip Board</button>
            </div>
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
            <h2 className="font-['Montserrat'] text-lg font-black text-white">Local Game Controls</h2>
            <p className="mt-1 text-sm text-slate-400">{setupOpen ? "Complete setup to enable the board." : `${currentTurnName}'s turn.`}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={newGameSamePlayers} disabled={setupOpen} className="rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a] transition hover:bg-[#93c85f] disabled:cursor-not-allowed disabled:opacity-50">New Game</button>
              <button type="button" onClick={() => setSetupOpen(true)} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/10">Change Players</button>
              <button type="button" onClick={() => dispatch(undoLastMove())} disabled={setupOpen || localGameEnded || gameState.history.length === 0} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/10 disabled:opacity-40">Undo Move</button>
              <button type="button" onClick={() => requestConfirm(resignCurrentPlayer, "Confirm resignation", `${currentTurnName} will resign this local game.`, "Resign")} disabled={setupOpen || localGameEnded || gameState.history.length === 0} className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-100 transition hover:bg-rose-400/15 disabled:opacity-40">Resign</button>
              <button type="button" onClick={() => requestConfirm(agreeDraw, "Agree draw", "Both players should agree before ending this game as a draw.", "Agree draw")} disabled={setupOpen || localGameEnded || gameState.history.length === 0} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-300/15 disabled:opacity-40">Agree Draw</button>
              <button type="button" onClick={() => requestConfirm(newGameSamePlayers, "Reset game", "This will reset the board for the same players.", "Reset")} disabled={setupOpen} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/10 disabled:opacity-40">Reset</button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <div>
                <p className="text-sm font-bold text-white">Auto flip after each move</p>
                <p className="text-xs text-slate-500">Useful when sharing one device.</p>
              </div>
              <button type="button" onClick={() => setAutoFlip((value) => !value)} className={`rounded-full px-4 py-2 text-xs font-black ${autoFlip ? "bg-[#81b64c] text-[#07100a]" : "bg-white/10 text-slate-200"}`} aria-label="Toggle auto flip after each move">{autoFlip ? "On" : "Off"}</button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
            <h2 className="font-['Montserrat'] text-lg font-black text-white">Game Options</h2>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Time Control</span>
              <select value={selectedTimeControlKey} onChange={(e) => dispatch(setTimeControl(e.target.value))} disabled={!setupOpen && gameState.history.length > 0 && !localGameEnded} className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-3 text-sm font-semibold text-white outline-none focus:border-[#81b64c]">
                <option value="none">No timer</option>
                <option value="bullet">Bullet · 1+0</option>
                <option value="blitz">Blitz · 5+0</option>
                <option value="rapid">Rapid · 10+0</option>
              </select>
            </label>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
              <div className="flex justify-between gap-2"><span>White</span><strong className="text-slate-100">{names.white}</strong></div>
              <div className="mt-1 flex justify-between gap-2"><span>Black</span><strong className="text-slate-100">{names.black}</strong></div>
              <div className="mt-1 flex justify-between gap-2"><span>Current turn</span><strong className="text-slate-100">{currentTurnName}</strong></div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
            <h2 className="font-['Montserrat'] text-lg font-black text-white">Captured Pieces</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><strong className="text-white">White captured:</strong> {pieceList(gameState.capturedBlack)}</div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><strong className="text-white">Black captured:</strong> {pieceList(gameState.capturedWhite)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="border-b border-white/10 p-4"><h2 className="font-['Montserrat'] text-lg font-black text-white">Moves</h2></div>
            <div className="max-h-80 overflow-y-auto p-4 custom-scrollbar"><MoveHistory movePairs={moveHistoryPairs} currentMove={gameState.currentMove} pieceNotation={settings.pieceNotation} /></div>
          </div>

          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 shadow-xl shadow-black/20">
            <h2 className="font-['Montserrat'] text-lg font-black text-amber-100">Support ChessPlay</h2>
            <p className="mt-2 text-sm text-amber-50/80">Free local chess stays free. Supporters get cosmetic themes, a profile badge, no-ads experience, and early access UI themes.</p>
            <p className="mt-2 text-xs text-amber-50/70">Manual PayPal, UPI, and Bank payments are verified by admin before supporter benefits are enabled.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row xl:flex-col">
              <button type="button" onClick={() => onNavigate?.("monetization")} className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-black transition hover:bg-amber-200">View Supporter Plan</button>
              {localGameEnded && <button type="button" onClick={saveLocalResult} disabled={saved} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50">{saved ? "Game Saved" : isLoggedIn ? "Save Game Locally" : "Sign in to Save"}</button>}
            </div>
          </div>
        </aside>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="local-confirm-title">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl">
            <h2 id="local-confirm-title" className="text-xl font-black">{confirmAction.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{confirmAction.message}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmAction(null)} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-bold text-white">Cancel</button>
              <button type="button" onClick={runConfirmedAction} className="rounded-xl bg-rose-400 px-4 py-2 font-black text-white">{confirmAction.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}

      <ChessSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
