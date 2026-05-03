import { useEffect, useRef, useCallback, useState } from "react";

const DEFAULT_MOVE_TIMEOUT_MS = 5000;

export function useStockfish({ enabled = true } = {}) {
  const workerRef = useRef(null);
  const movePromiseRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [thinking, setThinking] = useState(false);

  const sendCommand = useCallback((command) => {
    if (workerRef.current && command) {
      workerRef.current.postMessage(command);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const worker = new Worker("/workers/stockfish-worker.js");
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const msg = typeof event.data === "string" ? event.data.trim() : "";
      if (!msg) return;

      if (msg === "uciok") {
        setReady(true);
      } else if (msg.startsWith("bestmove")) {
        setThinking(false);
        if (movePromiseRef.current) {
          const match = msg.match(/^bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/i);
          const bestMove = match ? match[1] : null;
          clearTimeout(movePromiseRef.current.timeoutId);
          movePromiseRef.current.resolve(bestMove);
          movePromiseRef.current = null;
        }
      } else if (msg.includes("info depth")) {
        setThinking(true);
      }
    };

    worker.onerror = (error) => {
      console.error("[Stockfish] Worker error:", error);
    };

    // Initialize engine
    worker.postMessage("uci");

    return () => {
      if (movePromiseRef.current) {
        clearTimeout(movePromiseRef.current.timeoutId);
        movePromiseRef.current.reject(
          new Error("Stockfish worker disconnected"),
        );
        movePromiseRef.current = null;
      }
      worker.terminate();
      workerRef.current = null;
      setReady(false);
      setThinking(false);
    };
  }, [enabled]);

  const getBestMove = useCallback(
    (fen, depthOrMovetime = 10) => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !ready) {
          reject(new Error("Stockfish not ready"));
          return;
        }

        if (movePromiseRef.current) {
          clearTimeout(movePromiseRef.current.timeoutId);
          movePromiseRef.current.reject(
            new Error("Previous Stockfish move canceled"),
          );
        }

        let goCommand = "";
        let timeoutMs = DEFAULT_MOVE_TIMEOUT_MS;

        // Support both object { movetime: 1000 } or raw number/string
        if (typeof depthOrMovetime === "object") {
          if (depthOrMovetime.movetime) {
            goCommand = `go movetime ${depthOrMovetime.movetime}`;
            timeoutMs = depthOrMovetime.movetime + 2000;
          } else {
            goCommand = `go depth ${depthOrMovetime.depth || 10}`;
          }
        } else if (
          typeof depthOrMovetime === "number" &&
          depthOrMovetime > 100
        ) {
          goCommand = `go movetime ${depthOrMovetime}`;
          timeoutMs = depthOrMovetime + 2000;
        } else {
          goCommand = `go depth ${depthOrMovetime || 10}`;
        }

        const timeoutId = setTimeout(
          () => {
            if (movePromiseRef.current) {
              workerRef.current?.postMessage("stop");
              setThinking(false);
              movePromiseRef.current.reject(
                new Error("Stockfish move timeout"),
              );
              movePromiseRef.current = null;
            }
          },
          Math.max(timeoutMs, 2000),
        );

        movePromiseRef.current = { resolve, reject, timeoutId };

        setThinking(true);
        workerRef.current.postMessage(`position fen ${fen}`);
        workerRef.current.postMessage(goCommand);
      });
    },
    [ready],
  );

  return {
    ready,
    thinking,
    sendCommand,
    getBestMove,
  };
}