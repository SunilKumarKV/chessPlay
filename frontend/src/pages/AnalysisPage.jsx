import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "../features/chess/components/Board";
import MoveListPanel from "../features/chess/components/MoveListPanel";
import { Badge, Button, Card, EmptyState as DesignEmptyState, FormTextarea } from "../components/ui";
import { apiClient } from "../services/apiClient";

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
    return { ok: true, game, headers: game.getHeaders?.() || game.header?.() || {} };
  } catch {
    return { ok: false, message: "Invalid PGN. Paste a complete game or use FEN for a single position." };
  }
}

function resultLabel(result) {
  if (result === "1-0") return "White win";
  if (result === "0-1") return "Black win";
  if (result === "1/2-1/2") return "Draw";
  return "Not recorded";
}

function buildRuleGuidance({ source, moveCount, headers }) {
  if (source === "fen") {
    return {
      summary: "Single position loaded",
      finding: "ChessPlay can review the position structure, but it cannot claim move mistakes without engine analysis.",
      priority: "Write one candidate move and one reason before checking alternatives.",
      training: {
        title: "Game Stability",
        reason: "A position review is best used to slow down and compare plans.",
        action: "Play one focused AI game and review the moments where your plan changed.",
        ctaLabel: "Start AI game",
        route: "ai",
      },
    };
  }

  if (moveCount === 0) {
    return {
      summary: "PGN imported without moves",
      finding: "The game headers loaded, but there is no move sequence to review yet.",
      priority: "Paste a complete PGN with moves to unlock a stronger review flow.",
      training: {
        title: "Review Setup",
        reason: "ChessPlay needs a move list before it can build rule-based game guidance.",
        action: "Choose a completed game from history or paste a complete PGN.",
        ctaLabel: "Choose from history",
        route: "history",
      },
    };
  }

  if (moveCount < 12) {
    return {
      summary: `${moveCount} plies imported`,
      finding: "This is a short game segment, so opening habits and early move discipline are the clearest review signals.",
      priority: "Replay the first 10 moves and write down where development, king safety, or threats changed.",
      training: {
        title: "Opening Practice",
        reason: "Short PGNs are most useful for reviewing early plans, not full-game conclusions.",
        action: "Review the first 10 moves, then solve a short puzzle set.",
        ctaLabel: "Start puzzles",
        route: "puzzles",
      },
    };
  }

  if (headers?.Result && headers.Result !== "*") {
    return {
      summary: `${moveCount} plies imported · ${resultLabel(headers.Result)}`,
      finding: "ChessPlay found enough game data for a rule-based review, but not enough to label blunders or accuracy.",
      priority: "Mark the first moment where your plan became unclear, then train the matching pattern.",
      training: {
        title: "Tactical Practice",
        reason: "A completed game review pairs well with tactical pattern training.",
        action: "Solve 5 tactics today, then replay this game once without moving pieces.",
        ctaLabel: "Start puzzles",
        route: "puzzles",
      },
    };
  }

  return {
    summary: `${moveCount} plies imported`,
    finding: "The move list is ready. Result metadata is missing, so ChessPlay will keep the guidance focused on review process.",
    priority: "Replay the game in chunks of 10 moves and capture one lesson per chunk.",
    training: {
      title: "Game Review",
      reason: "The fastest next step is turning the move list into one concrete training action.",
      action: "Review your recent games and compare recurring decision points.",
      ctaLabel: "Open history",
      route: "history",
    },
  };
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div className="fixed bottom-4 right-4 z-[var(--z-toast)] max-w-sm rounded-[var(--radius-2xl)] border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] p-4 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-xl)]" role={isError ? "alert" : "status"}>
      <div className="flex items-start gap-3">
        <span className={isError ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"} aria-hidden="true">{isError ? "!" : "✓"}</span>
        <p className="leading-6">{toast.message}</p>
        <button type="button" onClick={onClose} className="ds-focus ml-2 rounded-[var(--radius-md)] px-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]" aria-label="Close message">×</button>
      </div>
    </div>
  );
}

export default function AnalysisPage({ user = null, onBack, onNavigate }) {
  const fileInputRef = useRef(null);
  const [fen, setFen] = useState(START_FEN);
  const [pgnInput, setPgnInput] = useState("");
  const [verboseMoves, setVerboseMoves] = useState([]);
  const [gameHeaders, setGameHeaders] = useState({});
  const [gameSource, setGameSource] = useState(null);
  const [error, setError] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeInput, setActiveInput] = useState("pgn");

  const hasGame = Boolean(gameSource);
  const board = useMemo(() => buildBoardFromFen(fen), [fen]);
  const moveRows = useMemo(() => groupMoves(verboseMoves), [verboseMoves]);
  const guidance = useMemo(
    () => buildRuleGuidance({ source: gameSource, moveCount: verboseMoves.length, headers: gameHeaders }),
    [gameHeaders, gameSource, verboseMoves.length],
  );

  useEffect(() => {
    document.title = "Game Analysis | ChessPlay";
    const description = "Analyze chess games in ChessPlay with honest rule-based improvement guidance, PGN review, and focused training next steps.";
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
    setFen(normalized);
    setVerboseMoves([]);
    setGameHeaders({});
    setGameSource("fen");
    setToast({ type: "success", message: "Position loaded." });
  };

  const importPgn = (value = pgnInput) => {
    setError("");
    const result = validatePgnText(value);
    if (!result.ok) {
      setError(result.message);
      setToast({ type: "error", message: result.message });
      return;
    }
    setPgnInput(value);
    setFen(result.game.fen());
    setVerboseMoves(result.game.history({ verbose: true }));
    setGameHeaders(result.headers);
    setGameSource("pgn");
    setActiveInput("pgn");
    setToast({ type: "success", message: "PGN imported." });
  };

  const clearGame = () => {
    const game = new Chess();
    setFen(game.fen());
    setPgnInput("");
    setVerboseMoves([]);
    setGameHeaders({});
    setGameSource(null);
    setError("");
    setNotes("");
    setToast({ type: "success", message: "Analysis cleared." });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importPgn(text);
    } catch {
      setToast({ type: "error", message: "Unable to read PGN file." });
    } finally {
      event.target.value = "";
    }
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

  const openRoute = (route) => {
    onNavigate?.(route);
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-5 text-[var(--color-text-primary)] sm:px-6 lg:px-8">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[var(--radius-3xl)] border border-[var(--color-border-primary)] bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-primary)_20%,transparent),transparent_34%),var(--color-bg-elevated)] p-5 shadow-[var(--shadow-xl)] sm:p-7">
          <Button type="button" variant="ghost" onClick={onBack} className="mb-5">
            Back
          </Button>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="primary">Analysis</Badge>
                <Badge tone="info">Rule-based MVP</Badge>
                <Badge tone={user ? "success" : "neutral"}>{user ? "Signed in" : "Guest access"}</Badge>
              </div>
              <h1 className="mt-5 max-w-4xl font-[var(--font-display)] text-4xl font-black leading-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-6xl">
                Analyze your game. Understand what to improve.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--color-text-secondary)] sm:text-lg">
                Review your games, find improvement signals, and turn mistakes into focused training.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button type="button" onClick={() => fileInputRef.current?.click()}>Upload PGN</Button>
                <Button type="button" variant="secondary" onClick={() => setActiveInput("pgn")}>Paste PGN</Button>
                <Button type="button" variant="ghost" onClick={() => openRoute(user ? "history" : "login")}>
                  {user ? "Review recent game" : "Sign in for history"}
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept=".pgn,.txt,text/plain" className="sr-only" onChange={handleFileUpload} aria-label="Upload PGN file" />
            </div>
            <Card variant="glass" className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">Honest analysis</p>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                Engine analysis is not enabled yet. ChessPlay is showing rule-based improvement guidance from available game data.
              </p>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            {!hasGame ? (
              <DesignEmptyState
                title="Start with a game"
                message="Paste a PGN, choose a completed game from history, or play an AI game and come back with a position to review."
                icon="♙"
                className="min-h-[320px]"
                action={(
                  <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
                    <Button type="button" onClick={() => setActiveInput("pgn")}>Paste PGN</Button>
                    <Button type="button" variant="secondary" onClick={() => openRoute(user ? "history" : "login")}>Choose history</Button>
                    <Button type="button" variant="ghost" onClick={() => openRoute("ai")}>Start AI game</Button>
                  </div>
                )}
              />
            ) : (
              <AnalysisWorkspace
                board={board}
                flipped={flipped}
                guidance={guidance}
                gameHeaders={gameHeaders}
                gameSource={gameSource}
                moveRows={moveRows}
                notes={notes}
                savingNote={savingNote}
                user={user}
                onClear={clearGame}
                onFlip={() => setFlipped((value) => !value)}
                onNavigate={openRoute}
                onNotesChange={setNotes}
                onSaveNotes={saveNotes}
              />
            )}
          </div>

          <aside className="space-y-5">
            <Card variant="glass" className="space-y-4">
              <div className="flex rounded-[var(--radius-2xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-1" role="tablist" aria-label="Analysis input mode">
                {[["pgn", "PGN"], ["fen", "FEN"]].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveInput(id)}
                    className={`ds-focus flex-1 rounded-[var(--radius-xl)] px-4 py-2 text-sm font-black transition ${activeInput === id ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)]"}`}
                    role="tab"
                    aria-selected={activeInput === id}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeInput === "pgn" ? (
                <>
                  <FormTextarea
                    id="analysis-pgn"
                    label="Paste PGN"
                    value={pgnInput}
                    onChange={(event) => setPgnInput(event.target.value)}
                    rows={8}
                    placeholder="1. e4 e5 2. Nf3 Nc6 ..."
                    error={activeInput === "pgn" ? error : ""}
                    helperText="ChessPlay will import the move list and show rule-based guidance only."
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button type="button" onClick={() => importPgn()}>Import PGN</Button>
                    <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>Upload file</Button>
                  </div>
                </>
              ) : (
                <>
                  <FormTextarea
                    id="analysis-fen"
                    label="FEN position"
                    value={fen}
                    onChange={(event) => setFen(event.target.value)}
                    rows={4}
                    error={activeInput === "fen" ? error : ""}
                    helperText="Use FEN for a single-position review. No blunder labels are generated."
                  />
                  <Button type="button" className="w-full" onClick={loadFen}>Load position</Button>
                </>
              )}
            </Card>

            <Card variant="subtle">
              <h2 className="font-[var(--font-display)] text-lg font-black">Trust boundary</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                No accuracy score, blunder count, mistake label, or engine verdict appears unless real analysis data exists.
              </p>
            </Card>

            <Card variant="subtle">
              <h2 className="font-[var(--font-display)] text-lg font-black">Next best action</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                Import a game, capture one lesson, then convert it into a short training action.
              </p>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}

function AnalysisWorkspace({
  board,
  flipped,
  guidance,
  gameHeaders,
  gameSource,
  moveRows,
  notes,
  savingNote,
  user,
  onClear,
  onFlip,
  onNavigate,
  onNotesChange,
  onSaveNotes,
}) {
  const white = gameHeaders.White && gameHeaders.White !== "?" ? gameHeaders.White : "White";
  const black = gameHeaders.Black && gameHeaders.Black !== "?" ? gameHeaders.Black : "Black";
  const result = resultLabel(gameHeaders.Result);

  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge tone="info">{gameSource === "pgn" ? "Game loaded" : "Position loaded"}</Badge>
            <h2 className="mt-3 font-[var(--font-display)] text-2xl font-black">Analysis workspace</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Board, replay, summary, findings, priority, and training in one review flow.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onFlip}>Flip board</Button>
            <Button type="button" variant="ghost" onClick={onClear}>Clear</Button>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(280px,560px)_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[var(--radius-2xl)]">
            <Board board={board} flipped={flipped} disabled />
          </div>
          <div className="min-w-0 space-y-4">
            <Card variant="subtle">
              <h3 className="font-[var(--font-display)] text-lg font-black">Game summary</h3>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <SummaryItem label="Players" value={`${white} vs ${black}`} />
                <SummaryItem label="Result" value={result} />
                <SummaryItem label="Moves" value={moveRows.length ? `${moveRows.length} move pairs` : "Position only"} />
                <SummaryItem label="Review mode" value="Rule-based guidance" />
              </dl>
            </Card>
            <Card variant="subtle">
              <h3 className="font-[var(--font-display)] text-lg font-black">Key findings</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{guidance.finding}</p>
            </Card>
            <Card variant="subtle">
              <h3 className="font-[var(--font-display)] text-lg font-black">Improvement priority</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{guidance.priority}</p>
            </Card>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card variant="glass">
          <h2 className="font-[var(--font-display)] text-xl font-black">Move list</h2>
          <div className="mt-4 max-h-80 overflow-auto rounded-[var(--radius-2xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)]">
            <MoveListPanel moves={moveRows} emptyMessage="FEN-only positions have no move list yet." />
          </div>
        </Card>
        <Card variant="glass">
          <h2 className="font-[var(--font-display)] text-xl font-black">Recommended training</h2>
          <p className="mt-2 text-sm font-bold text-[var(--color-text-primary)]">{guidance.training.title}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{guidance.training.reason}</p>
          <p className="mt-4 rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-3 text-sm font-bold text-[var(--color-text-primary)]">
            {guidance.training.action}
          </p>
          <Button type="button" className="mt-4 w-full" onClick={() => onNavigate(guidance.training.route)}>
            {guidance.training.ctaLabel}
          </Button>
        </Card>
      </div>

      <Card variant="subtle">
        <FormTextarea
          id="analysis-notes"
          label="Analysis notes"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value.slice(0, MAX_NOTE_LENGTH))}
          rows={5}
          placeholder={user ? "Write the lesson you want to remember..." : "Sign in to save notes."}
          helperText={`${notes.length}/${MAX_NOTE_LENGTH} · ${user ? "Saved to your account when you choose Save notes." : "Guest notes are local to this screen only."}`}
        />
        <Button type="button" className="mt-4" onClick={onSaveNotes} disabled={!user || savingNote} loading={savingNote} loadingText="Saving">
          {user ? "Save notes" : "Sign in to save notes"}
        </Button>
      </Card>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-border-primary)] bg-[var(--color-surface)] p-3">
      <dt className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{label}</dt>
      <dd className="mt-1 truncate text-sm font-bold text-[var(--color-text-primary)]">{value}</dd>
    </div>
  );
}
