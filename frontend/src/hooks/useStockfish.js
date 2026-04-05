import { useEffect, useRef, useCallback, useState } from "react";

// Stockfish 16 WASM build served via CDN
const STOCKFISH_URL =
  "https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-bnz.js";

export function useStockfish({ enabled, difficulty = 10 }) {
  const workerRef = useRef(null);
  const resolveRef = useRef(null); // resolves the current bestmove promise
  const [ready, setReady] = useState(false);
  const [thinking, setThinking] = useState(false);

  // ── Boot the worker once
  useEffect(() => {
    if (!enabled) return;

    let isSubscribed = true;
    let blobUrl = null;

    const createWorker = async () => {
      try {
        const response = await fetch(STOCKFISH_URL);
        const source = await response.text();
        const blob = new Blob([source], { type: "application/javascript" });
        blobUrl = URL.createObjectURL(blob);

        if (!isSubscribed) return;

        const worker = new Worker(blobUrl);
        workerRef.current = worker;

        worker.onmessage = (e) => {
          const line =
            typeof e.data === "string" ? e.data : (e.data?.toString?.() ?? "");

          if (line === "uciok") {
            worker.postMessage("isready");
            return;
          }
          if (line === "readyok") {
            setReady(true);
            return;
          }

          if (line.startsWith("bestmove") && resolveRef.current) {
            const parts = line.split(" ");
            const move = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
            setThinking(false);
            resolveRef.current(move);
            resolveRef.current = null;
          }
        };

        worker.onerror = (err) => {
          console.error("Stockfish worker error:", err);
          setThinking(false);
          if (resolveRef.current) {
            resolveRef.current(null);
            resolveRef.current = null;
          }
        };

        worker.postMessage("uci");
      } catch (error) {
        console.error("Failed to load Stockfish engine:", error);
      }
    };

    createWorker();

    return () => {
      isSubscribed = false;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      setReady(false);
    };
  }, [enabled]);

  // ── Set skill level whenever difficulty changes (0–20)
  useEffect(() => {
    if (!workerRef.current || !ready) return;
    const level = Math.max(0, Math.min(20, difficulty));
    workerRef.current.postMessage(`setoption name Skill Level value ${level}`);
  }, [ready, difficulty]);

  /**
   * Ask Stockfish for the best move given a FEN string.
   * @param {string} fen   - current board in FEN notation
   * @param {number} ms    - think time in milliseconds
   * @returns {Promise<string|null>}  UCI move string e.g. "e2e4" or null
   */
  const getBestMove = useCallback(
    (fen, ms = 1000) => {
      return new Promise((resolve) => {
        if (!workerRef.current || !ready) {
          resolve(null);
          return;
        }
        resolveRef.current = resolve;
        setThinking(true);
        workerRef.current.postMessage(`position fen ${fen}`);
        workerRef.current.postMessage(`go movetime ${ms}`);
      });
    },
    [ready],
  );

  return { ready, thinking, getBestMove };
}
