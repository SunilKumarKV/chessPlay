import { useEffect, useRef, useCallback, useState } from "react";

// Local Stockfish WASM worker bundled with the app
// Falls back to Lichess CDN if local file is not available
const STOCKFISH_URLS = [
  "/stockfish-18-lite.js", // Local bundled version (fastest, no CORS issues)
  "https://unpkg.com/@lichess-org/stockfish-web@latest/dist/stockfish.js",
  "https://cdn.jsdelivr.net/npm/@lichess-org/stockfish-web@latest/dist/stockfish.js",
];

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
        let worker = null;

        for (const url of STOCKFISH_URLS) {
          try {
            const response = await fetch(url, { method: "HEAD" });
            if (!response.ok) {
              console.warn(
                `Stockfish fetch failed (${response.status}): ${url}`,
              );
              continue;
            }

            if (url.startsWith("/")) {
              // Local asset: instantiate worker directly so relative WASM fetch resolves correctly.
              worker = new Worker(url);
              console.log(`✓ Created Stockfish worker from local URL: ${url}`);
            } else {
              // Remote asset: import script inside a worker blob.
              const importBlob = new Blob([`importScripts("${url}");`], {
                type: "application/javascript",
              });
              blobUrl = URL.createObjectURL(importBlob);
              worker = new Worker(blobUrl);
              console.log(
                `✓ Created Stockfish worker via importScripts: ${url}`,
              );
            }

            if (worker) {
              workerRef.current = worker;
              break;
            }
          } catch (err) {
            console.warn(
              `Stockfish worker init error for ${url}:`,
              err.message,
            );
            continue;
          }
        }

        if (!worker) {
          throw new Error(
            "Failed to load Stockfish from any source. Check that /stockfish-18-lite.js exists or internet connection.",
          );
        }

        if (!isSubscribed) return;

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
