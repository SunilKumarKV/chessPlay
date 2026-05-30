import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { apiClient } from "../services/apiClient";
import Board from "../features/chess/components/Board";
import ErrorBanner from "../components/common/ErrorBanner";

function squareFromCoords(row, col) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function uciFromMove(from, to, promotion) {
  if (!from || !to) return "";
  return `${from}${to}${promotion || ""}`.toLowerCase();
}

export default function ChallengePage({ onBack, onNavigate }) {
  const [challenge, setChallenge] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const game = useMemo(() => {
    if (!challenge) return new Chess();
    const gameInstance = new Chess(challenge.fen);
    (attempt?.moves || []).forEach((move) => {
      const uci = String(move || "").trim().toLowerCase();
      if (uci.length >= 4) {
        const promotion = uci.length === 5 ? uci[4] : undefined;
        gameInstance.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion });
      }
    });
    return gameInstance;
  }, [challenge, attempt]);

  const challengeComplete = attempt?.status === "solved";
  const totalMoves = challenge?.solutionLength ?? 0;
  const currentMove = attempt?.currentIndex ?? 0;

  const legalDestinations = useMemo(() => {
    if (!selectedSquare || !challenge) return new Set();
    const moves = game.moves({ verbose: true });
    return new Set(moves.filter((move) => move.from === selectedSquare).map((move) => move.to));
  }, [selectedSquare, game, challenge]);

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setSelectedSquare(null);

    try {
      const data = await apiClient("/api/challenges/today", { skipAuthRefresh: true });
      setChallenge(data.challenge);
      if (data.attempt) {
        setAttempt(data.attempt);
      } else {
        const attemptData = await apiClient("/api/challenges/today/attempt", {
          method: "POST",
          skipAuthRefresh: true,
        });
        setAttempt(attemptData.attempt);
      }
    } catch (loadError) {
      setError(loadError.message || "Unable to load today’s challenge.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const handleSquareClick = useCallback(
    async (row, col) => {
      if (!challenge || !attempt || submitting || challengeComplete) return;
      const square = squareFromCoords(row, col);
      const piece = game.get(square);
      const currentTurn = game.turn();

      if (!selectedSquare) {
        if (piece && piece.color === currentTurn) {
          setSelectedSquare(square);
          setMessage(null);
        }
        return;
      }

      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      const movingPiece = game.get(selectedSquare);
      const promotion = movingPiece?.type === "p" && (square.endsWith("8") || square.endsWith("1")) ? "q" : undefined;
      const testGame = new Chess(game.fen());
      const move = testGame.move({ from: selectedSquare, to: square, promotion });
      if (!move) {
        setMessage("Illegal move. Choose another square.");
        setSelectedSquare(null);
        return;
      }

      setSubmitting(true);
      setError(null);
      setMessage(null);

      try {
        const response = await apiClient("/api/challenges/today/move", {
          method: "POST",
          body: JSON.stringify({
            from: selectedSquare,
            to: square,
            promotion,
          }),
          skipAuthRefresh: true,
        });

        setAttempt(response.attempt);
        setSelectedSquare(null);
        if (response.valid) {
          setMessage(response.message || "Good move.");
          if (response.attempt?.status === "solved") {
            setMessage("Challenge solved! Great work.");
          }
        } else {
          setMessage(response.message || "Incorrect move. Try again.");
        }
      } catch (moveError) {
        setError(moveError.message || "Unable to validate this move.");
      } finally {
        setSubmitting(false);
      }
    },
    [attempt, challenge, game, selectedSquare, submitting, challengeComplete],
  );

  const currentPosition = useMemo(() => game.board(), [game]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07100d] text-white">
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 xl:p-8">
          <div className="h-[28rem] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.06]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07100d] text-white">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 xl:p-8">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-[#081414] p-6 shadow-2xl shadow-black/30 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10"
            >
              Back to Dashboard
            </button>
            <h1 className="font-['Montserrat'] text-3xl font-black text-white md:text-4xl">Daily Challenge</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              {challenge?.description || "Solve today’s challenge by finding the correct move sequence."}
            </p>
          </div>
          <div className="space-y-2 text-right">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
              Difficulty: {challenge?.difficulty || "unknown"}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
              Progress: {currentMove}/{totalMoves}
            </div>
          </div>
        </div>

        {error ? <ErrorBanner message={error} onRetry={loadChallenge} /> : null}
        {message ? (
          <div className="rounded-2xl border border-slate-500/30 bg-slate-800/70 p-4 text-sm text-slate-100">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
            <Board
              board={currentPosition}
              externalFlipped={false}
              externalIsSelected={(row, col) => selectedSquare === squareFromCoords(row, col)}
              externalIsLegalDest={(row, col) => legalDestinations.has(squareFromCoords(row, col))}
              onSquareClick={handleSquareClick}
              disabled={submitting || challengeComplete}
            />
          </div>
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-white">Challenge details</h2>
                <button
                  type="button"
                  onClick={loadChallenge}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10"
                >
                  Reload
                </button>
              </div>
              <dl className="space-y-3 text-sm text-slate-300">
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-slate-100">Date</dt>
                  <dd>{challenge?.dateKey}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-slate-100">Status</dt>
                  <dd>{challengeComplete ? "Solved" : "In progress"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-slate-100">Moves needed</dt>
                  <dd>{totalMoves}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
              <h3 className="text-lg font-black text-white">Move history</h3>
              {attempt?.moves?.length ? (
                <ol className="mt-4 space-y-2 text-sm text-slate-300">
                  {attempt.moves.map((move, index) => (
                    <li key={`${move}-${index}`}>
                      <span className="font-semibold text-slate-100">{index + 1}.</span> {move.toUpperCase()}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-slate-400">Make the first move to begin the challenge.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
