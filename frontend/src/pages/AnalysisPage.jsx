import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import Board from "../features/chess/components/Board";
import MoveListPanel from "../features/chess/components/MoveListPanel";
import { useStockfish } from "../features/chess/hooks/useStockfish";
import { useTheme } from "../hooks/useTheme";
import { apiClient } from "../services/apiClient";
import SupporterBadge from "../components/billing/SupporterBadge";

const START_FEN = new Chess().fen();
const MAX_NOTE_LENGTH = 2000;

function buildBoardFromFen(fen) {
  try {
    return new Chess(fen).board();
  } catch {
    return new Chess().board();
  }
}

function groupMoves(verboseMoves) {
  const rows = [];
  verboseMoves.forEach((move, index) => {
    const rowIndex = Math.floor(index / 2);
    if (!rows[rowIndex]) rows[rowIndex] = { number: rowIndex + 1, white: "-", black: "" };
    if (index % 2 === 0) rows[rowIndex].white = move.san || "-";
    else rows[rowIndex].black = move.san || "";
  });
  return rows.map((row, index) => ({ ...row, isLatest: index === rows.length - 1 }));
}

function evaluationCopy(evaluation) {
  if (!evaluation) return "Run analysis to see the evaluation.";
  if (evaluation.type === "mate") {
    if (evaluation.value > 0) return `White has a forced mate in ${evaluation.value}.`;
    if (evaluation.value < 0) return `Black has a forced mate in ${Math.abs(evaluation.value)}.`;
    return "Forced mate is detected.";
  }
  const value = Number(evaluation.value || 0);
  if (Math.abs(value) < 0.25) return "Equal position.";
  if (value > 1.5) return "White is clearly better.";
  if (value > 0.25) return "White is slightly better.";
  if (value < -1.5) return "Black is clearly better.";
  return "Black is slightly better.";
}

function validateFenText(value) {
  try {
    return new Chess(value).fen();
  } catch {
    return null;
  }
}

function validatePgnText(value) {
  const pgn = String(value || "").trim();
  if (!pgn) return { ok: false, message: "Paste a PGN before importing." };
  try {
    const game = new Chess();
    game.loadPgn(pgn);
    return { ok: true, game };
  } catch {
    return { ok: false, message: "Invalid PGN. Paste a complete game or use FEN for a single position." };
  }
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div className="fixed bottom-4 right-4 z-[80] max-w-sm rounded-2xl border border-white/10 bg-[#101816] p-4 text-sm text-white shadow-2xl" role={isError ? "alert" : "status"}>
      <div className="flex items-start gap-3">
        <span className={isError ? "text-red-300" : "text-[#b8f28f]"}>{isError ? "⚠" : "✓"}</span>
        <p className="leading-6">{toast.message}</p>
        <button type="button" onClick={onClose} className="ml-2 text-slate-400 hover:text-white" aria-label="Close message">×</button>
      </div>
    </div>
  );
}

function StatusBadge({ children, tone = "default" }) {
  const toneClass = tone === "success"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : tone === "warning"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
      : tone === "supporter"
        ? "border-[#f4c96b]/40 bg-[#f4c96b]/10 text-[#ffe3a1]"
        : "border-white/10 bg-white/10 text-slate-200";
  return <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${toneClass}`}>{children}</span>;
}

export default function AnalysisPage({ user = null, onBack, onNavigate }) {
  const { theme } = useTheme();
  const [fen, setFen] = useState(START_FEN);
  const [pgnInput, setPgnInput] = useState("");
  const [verboseMoves, setVerboseMoves] = useState([]);
  const [bestMove, setBestMove] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [engineEnabled, setEngineEnabled] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("fen");
  const stockfish = useStockfish({ enabled: engineEnabled });
  const board = useMemo(() => buildBoardFromFen(fen), [fen]);
  const moveRows = useMemo(() => groupMoves(verboseMoves), [verboseMoves]);
  const engineStatus = stockfish.error ? "Engine unavailable" : stockfish.ready ? "Engine ready" : engineEnabled ? "Engine loading" : "Engine idle";

  useEffect(() => {
    document.title = "Game Analysis | ChessPlay";
    const description = "Review chess positions, import PGN games, explore engine suggestions, and save analysis notes in ChessPlay.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
  }, []);

  const loadFen = () => {
    setError("");
    const normalized = validateFenText(fen);
    if (!normalized) {
      setError("Invalid FEN position. Please paste a valid chess FEN.");
      setToast({ type: "error", message: "Invalid FEN position." });
      return;
    }
    const game = new Chess(normalized);
    setFen(game.fen());
    setVerboseMoves([]);
    setBestMove("");
    setTab("fen");
    setToast({ type: "success", message: "Position loaded for analysis." });
  };

  const loadPgn = () => {
    setError("");
    const result = validatePgnText(pgnInput);
    if (!result.ok) {
      setError(result.message);
      setToast({ type: "error", message: result.message });
      return;
    }
    setFen(result.game.fen());
    setVerboseMoves(result.game.history({ verbose: true }));
    setBestMove("");
    setTab("pgn");
    setToast({ type: "success", message: "PGN imported successfully." });
  };

  const clearPgn = () => {
    setPgnInput("");
    setVerboseMoves([]);
    setBestMove("");
    setToast({ type: "success", message: "PGN cleared." });
  };

  const analyze = async () => {
    setError("");
    setBestMove("");
    setLoading(true);
    setEngineEnabled(true);
    try {
      const normalized = validateFenText(fen);
      if (!normalized) throw new Error("Invalid FEN position. Please load a valid position first.");
      if (!stockfish.ready) throw new Error("Chess engine is starting. Try again in a moment.");
      const uci = await stockfish.getBestMove(normalized, { movetime: user?.isSupporter || user?.isPremium ? 1800 : 1000 });
      if (!uci) throw new Error("No engine move returned for this position.");
      const game = new Chess(normalized);
      const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
      setBestMove(move ? `${move.san} (${uci})` : uci);
      setToast({ type: "success", message: "Analysis completed." });
    } catch (err) {
      const message = err.message || "Analysis failed. Please try again.";
      setError(message);
      setToast({ type: "error", message });
    } finally {
      setLoading(false);
    }
  };

  const retryEngine = () => {
    setEngineEnabled(true);
    stockfish.retry?.();
    setError("");
    setToast({ type: "success", message: "Restarting analysis engine." });
  };

  const reset = () => {
    const game = new Chess();
    setFen(game.fen());
    setPgnInput("");
    setVerboseMoves([]);
    setBestMove("");
    setError("");
    setToast({ type: "success", message: "Board reset." });
  };

  const saveNotes = async () => {
    if (!user) {
      setToast({ type: "error", message: "Sign in to save analysis notes." });
      return;
    }
    if (notes.length > MAX_NOTE_LENGTH) {
      setToast({ type: "error", message: "Analysis note is too long." });
      return;
    }
    try {
      setSavingNote(true);
      await apiClient("/api/analysis/notes", {
        method: "POST",
        body: JSON.stringify({ gameId: "manual", fen, pgn: pgnInput, note: notes }),
      });
      setToast({ type: "success", message: "Analysis notes saved." });
    } catch (err) {
      setToast({ type: "error", message: err.message || "Unable to save analysis notes." });
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="min-h-screen w-full p-4 text-white md:p-6 xl:p-8" style={{ color: theme.text.primary }}>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#162016] via-[#101816] to-[#080c09] p-5 shadow-2xl md:p-7">
          <button type="button" onClick={onBack} className="mb-4 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-[#b8f28f] hover:bg-white/10">Back to Dashboard</button>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="success">Analysis</StatusBadge>
                <StatusBadge>Guest Mode</StatusBadge>
                <StatusBadge tone="warning">Experimental Engine</StatusBadge>
                {(user?.isSupporter || user?.isPremium) && <SupporterBadge user={user} />}
              </div>
              <h1 className="mt-4 font-['Montserrat'] text-3xl font-black md:text-5xl">Game Analysis</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                Review positions, explore variations, import PGN games, and understand key moments from your games. Computer analysis is experimental and may vary by engine depth.
              </p>
              {!user && (
                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                  Sign in to save analysis notes and review your game history. Basic FEN and PGN analysis remains free.
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <h2 className="font-['Montserrat'] text-lg font-black">Supporter preview</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Coming soon: deeper review reports, saved analysis collections, custom board themes, and no-ads experience for supporters.</p>
              <button type="button" onClick={() => onNavigate?.("pricing")} className="mt-4 w-full rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a] hover:bg-[#93c85f]">Support ChessPlay</button>
              <p className="mt-3 text-xs text-slate-400">PayPal, UPI, and bank payments are manually verified by admin.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="rounded-3xl border border-white/10 bg-[#101816] p-4 shadow-2xl md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-['Montserrat'] text-2xl font-black">Analysis board</h2>
                <p className="mt-1 text-sm text-slate-400">Use FEN for a single position or PGN for a full game.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setFlipped((value) => !value)} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15" aria-label="Flip analysis board">Flip board</button>
                <button type="button" onClick={reset} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15">Reset board</button>
              </div>
            </div>
            <div className="mx-auto max-w-[720px] overflow-hidden rounded-2xl"><Board board={board} flipped={flipped} disabled /></div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-[#101816] p-5 shadow-2xl">
              <div className="flex rounded-2xl border border-white/10 bg-black/20 p-1" role="tablist" aria-label="Analysis input mode">
                {[["fen", "FEN"], ["pgn", "PGN"]].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setTab(id)} className={`flex-1 rounded-xl px-4 py-2 text-sm font-black ${tab === id ? "bg-[#81b64c] text-[#07100a]" : "text-slate-300 hover:bg-white/10"}`} role="tab" aria-selected={tab === id}>{label}</button>
                ))}
              </div>

              {tab === "fen" ? (
                <div className="mt-4">
                  <label className="block text-sm font-bold" htmlFor="analysis-fen">FEN position</label>
                  <textarea id="analysis-fen" value={fen} onChange={(e) => setFen(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-[#81b64c]" />
                  <button type="button" onClick={loadFen} className="mt-3 w-full rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a] hover:bg-[#93c85f]">Load position</button>
                </div>
              ) : (
                <div className="mt-4">
                  <label className="block text-sm font-bold" htmlFor="analysis-pgn">PGN import</label>
                  <textarea id="analysis-pgn" value={pgnInput} onChange={(e) => setPgnInput(e.target.value)} rows={6} placeholder="Paste PGN here…" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-[#81b64c]" />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={loadPgn} className="rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a] hover:bg-[#93c85f]">Import PGN</button>
                    <button type="button" onClick={clearPgn} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/15">Clear PGN</button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#101816] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-['Montserrat'] text-xl font-black">Engine tools</h2>
                  <p className="mt-1 text-sm text-slate-400">{engineStatus}</p>
                </div>
                <StatusBadge tone={stockfish.ready ? "success" : stockfish.error ? "warning" : "default"}>{stockfish.depth ? `Depth ${stockfish.depth}` : "Engine"}</StatusBadge>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-bold text-slate-200">Evaluation</p>
                <p className="mt-1 text-sm text-slate-400">{evaluationCopy(stockfish.evaluation)}</p>
              </div>
              {bestMove ? <div className="mt-4 rounded-2xl border border-[#81b64c]/30 bg-[#81b64c]/10 p-4 text-sm font-bold text-[#b8f28f]">Best move: {bestMove}</div> : null}
              {error || stockfish.error ? <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error || stockfish.error}</div> : null}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={analyze} disabled={loading || stockfish.thinking} className="rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a] hover:bg-[#93c85f] disabled:cursor-not-allowed disabled:opacity-60">{loading || stockfish.thinking ? "Analyzing…" : "Analyze position"}</button>
                <button type="button" onClick={retryEngine} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/15">Retry engine</button>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-3xl border border-white/10 bg-[#101816] p-5 shadow-2xl">
            <h2 className="font-['Montserrat'] text-xl font-black">Move list and variations</h2>
            <div className="mt-4 max-h-80 overflow-auto rounded-2xl border border-white/10 bg-black/20"><MoveListPanel moves={moveRows} emptyMessage="Imported PGN moves appear here. FEN-only positions have no move list yet." /></div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#101816] p-5 shadow-2xl">
            <h2 className="font-['Montserrat'] text-xl font-black">Analysis notes</h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTE_LENGTH))} rows={7} placeholder={user ? "Write your ideas, candidate moves, and lessons here…" : "Sign in to save notes."} className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none focus:border-[#81b64c]" aria-label="Analysis notes" />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400"><span>{notes.length}/{MAX_NOTE_LENGTH}</span><span>{user ? "Saved to your account" : "Guest notes are not saved"}</span></div>
            <button type="button" onClick={saveNotes} disabled={!user || savingNote} className="mt-4 w-full rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a] hover:bg-[#93c85f] disabled:cursor-not-allowed disabled:opacity-60">{savingNote ? "Saving…" : user ? "Save notes" : "Sign in to save notes"}</button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Phase 1", "FEN board review", "Available now"],
            ["Phase 2", "PGN import", "Available now"],
            ["Phase 3", "Engine best move", "Experimental"],
            ["Phase 4", "Full game report", "Supporter preview"],
          ].map(([phase, title, status]) => (
            <div key={phase} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b8f28f]">{phase}</p>
              <h3 className="mt-2 font-['Montserrat'] text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm text-slate-400">{status}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
