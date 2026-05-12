import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import Board from "../features/chess/components/Board";
import MoveListPanel from "../features/chess/components/MoveListPanel";
import { useStockfish } from "../features/chess/hooks/useStockfish";
import { useTheme } from "../hooks/useTheme";

function buildBoardFromFen(fen) {
  try {
    return new Chess(fen).board();
  } catch {
    return new Chess().board();
  }
}

export default function AnalysisPage({ onBack }) {
  const { theme } = useTheme();
  const [fen, setFen] = useState(new Chess().fen());
  const [pgnInput, setPgnInput] = useState("");
  const [moves, setMoves] = useState([]);
  const [bestMove, setBestMove] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const stockfish = useStockfish({ enabled: true });
  const board = useMemo(() => buildBoardFromFen(fen), [fen]);

  const loadFen = () => {
    setError("");
    try {
      const game = new Chess(fen);
      setFen(game.fen());
      setMoves(game.history({ verbose: true }));
      setBestMove("");
    } catch {
      setError("Invalid FEN position. Please paste a valid chess FEN.");
    }
  };

  const loadPgn = () => {
    setError("");
    try {
      const game = new Chess();
      game.loadPgn(pgnInput);
      setFen(game.fen());
      setMoves(game.history({ verbose: true }));
      setBestMove("");
    } catch {
      setError("Invalid PGN. Paste a complete PGN or use FEN instead.");
    }
  };

  const analyze = async () => {
    setError("");
    setBestMove("");
    setLoading(true);
    try {
      if (!stockfish.ready) throw new Error("Stockfish is still loading. Try again in a moment.");
      const uci = await stockfish.getBestMove(fen, { movetime: 1200 });
      if (!uci) throw new Error("No engine move returned for this position.");
      const game = new Chess(fen);
      const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
      setBestMove(move ? `${move.san} (${uci})` : uci);
    } catch (err) {
      setError(err.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    const game = new Chess();
    setFen(game.fen());
    setPgnInput("");
    setMoves([]);
    setBestMove("");
    setError("");
  };

  return (
    <div className="w-full p-4 md:p-6 xl:p-8" style={{ color: theme.text.primary }}>
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-2xl border p-4 shadow-xl" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.primary }}>
          <button type="button" onClick={onBack} className="mb-3 text-sm font-bold text-[#81b64c]">Back to Dashboard</button>
          <h1 className="font-['Montserrat'] text-3xl font-black">Analysis Board</h1>
          <p className="mt-2 text-sm" style={{ color: theme.text.secondary }}>Paste a FEN or PGN, then ask Stockfish for the best move.</p>
          <div className="mx-auto mt-5 max-w-[720px]"><Board board={board} flipped={false} /></div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border p-5 shadow-xl" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.primary }}>
            <h2 className="font-['Montserrat'] text-xl font-black">Engine Tools</h2>
            <label className="mt-4 block text-sm font-bold">FEN</label>
            <textarea value={fen} onChange={(e) => setFen(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border bg-black/20 p-3 text-sm outline-none" style={{ borderColor: theme.border.primary, color: theme.text.primary }} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={loadFen} className="rounded-xl bg-[#81b64c] px-4 py-2 font-bold text-[#07100a]">Load FEN</button>
              <button onClick={analyze} disabled={loading} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-bold disabled:opacity-50">{loading ? "Analyzing…" : "Best Move"}</button>
              <button onClick={reset} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-bold">Reset</button>
            </div>
            {bestMove && <div className="mt-4 rounded-xl border border-[#81b64c]/30 bg-[#81b64c]/10 p-4 font-bold text-[#9ee36a]">Best move: {bestMove}</div>}
            {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
          </div>

          <div className="rounded-2xl border p-5 shadow-xl" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.primary }}>
            <h2 className="font-['Montserrat'] text-xl font-black">PGN Review</h2>
            <textarea value={pgnInput} onChange={(e) => setPgnInput(e.target.value)} rows={6} placeholder="Paste PGN here…" className="mt-3 w-full rounded-xl border bg-black/20 p-3 text-sm outline-none" style={{ borderColor: theme.border.primary, color: theme.text.primary }} />
            <button onClick={loadPgn} className="mt-3 rounded-xl bg-[#81b64c] px-4 py-2 font-bold text-[#07100a]">Load PGN</button>
          </div>

          <div className="rounded-2xl border p-5 shadow-xl" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.primary }}>
            <h2 className="mb-3 font-['Montserrat'] text-xl font-black">Moves</h2>
            <div className="max-h-64 overflow-auto"><MoveListPanel moves={moves} emptyMessage="Loaded PGN moves appear here." /></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
