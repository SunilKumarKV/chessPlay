import { useEffect, useRef, useCallback, useState } from "react";

const DEFAULT_MOVE_TIMEOUT_MS = 5000;

function parseEvaluation(message) {
  const cpMatch = message.match(/\bscore cp (-?\d+)/);
  if (cpMatch) {
    return { type: "cp", value: Number(cpMatch[1]) / 100 };
  }
  const mateMatch = message.match(/\bscore mate (-?\d+)/);
  if (mateMatch) {
    return { type: "mate", value: Number(mateMatch[1]) };
  }
  return null;
}

export function useStockfish({ enabled = true } = {}) {
  const workerRef = useRef(null);
  const movePromiseRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [depth, setDepth] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [lastBestMove, setLastBestMove] = useState(null);

  const sendCommand = useCallback((command) => {
    if (workerRef.current && command) {
      workerRef.current.postMessage(command);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const workerPath = `${import.meta.env.BASE_URL}workers/stockfish-worker.js`;
    let worker;

    try {
      worker = new Worker(workerPath);
    } catch (error) {
      console.error("[Stockfish] Failed to create worker:", error, workerPath);
      return undefined;
    }

    workerRef.current = worker;

    worker.onmessage = (event) => {
      const msg = typeof event.data === "string" ? event.data.trim() : "";
      if (!msg) return;

      if (msg === "uciok") {
        setReady(true);
        worker.postMessage("isready");
      } else if (msg.startsWith("bestmove")) {
        setThinking(false);
        const match = msg.match(/^bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/i);
        const bestMove = match ? match[1] : null;
        setLastBestMove(bestMove);
        if (movePromiseRef.current) {
          clearTimeout(movePromiseRef.current.timeoutId);
          movePromiseRef.current.resolve(bestMove);
          movePromiseRef.current = null;
        }
      } else if (msg.includes("info depth")) {
        setThinking(true);
        const depthMatch = msg.match(/\bdepth\s+(\d+)/);
        if (depthMatch) setDepth(Number(depthMatch[1]));
        const parsedEvaluation = parseEvaluation(msg);
        if (parsedEvaluation) setEvaluation(parsedEvaluation);
      }
    };

    worker.onerror = (error) => {
      console.error("[Stockfish] Worker error:", error);
      setThinking(false);
    };

    worker.postMessage("uci");

    return () => {
      if (movePromiseRef.current) {
        clearTimeout(movePromiseRef.current.timeoutId);
        movePromiseRef.current.reject(new Error("Stockfish worker disconnected"));
        movePromiseRef.current = null;
      }
      worker.terminate();
      workerRef.current = null;
      setReady(false);
      setThinking(false);
    };
  }, [enabled]);

  const getBestMove = useCallback(
    (fen, options = 10) => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !ready) {
          reject(new Error("Stockfish not ready"));
          return;
        }

        if (movePromiseRef.current) {
          clearTimeout(movePromiseRef.current.timeoutId);
          movePromiseRef.current.reject(new Error("Previous Stockfish move canceled"));
        }

        let goCommand = "";
        let timeoutMs = DEFAULT_MOVE_TIMEOUT_MS;
        let skillLevel = null;

        if (typeof options === "object") {
          skillLevel = Number.isFinite(Number(options.skill)) ? Number(options.skill) : null;
          if (options.movetime) {
            goCommand = `go movetime ${options.movetime}`;
            timeoutMs = Number(options.movetime) + 2500;
          } else {
            const requestedDepth = Math.max(1, Math.min(24, Number(options.depth || 10)));
            goCommand = `go depth ${requestedDepth}`;
            timeoutMs = Math.max(DEFAULT_MOVE_TIMEOUT_MS, requestedDepth * 900);
          }
        } else if (typeof options === "number" && options > 100) {
          goCommand = `go movetime ${options}`;
          timeoutMs = options + 2500;
        } else {
          const requestedDepth = Math.max(1, Math.min(24, Number(options || 10)));
          goCommand = `go depth ${requestedDepth}`;
          timeoutMs = Math.max(DEFAULT_MOVE_TIMEOUT_MS, requestedDepth * 900);
        }

        const timeoutId = setTimeout(() => {
          if (movePromiseRef.current) {
            workerRef.current?.postMessage("stop");
            setThinking(false);
            movePromiseRef.current.reject(new Error("Stockfish move timeout"));
            movePromiseRef.current = null;
          }
        }, Math.max(timeoutMs, 2500));

        movePromiseRef.current = { resolve, reject, timeoutId };
        setThinking(true);
        setDepth(0);
        setEvaluation(null);
        setLastBestMove(null);

        if (skillLevel !== null) {
          workerRef.current.postMessage(`setoption name Skill Level value ${Math.max(0, Math.min(20, skillLevel))}`);
        }
        workerRef.current.postMessage(`position fen ${fen}`);
        workerRef.current.postMessage(goCommand);
      });
    },
    [ready],
  );

  return {
    ready,
    thinking,
    depth,
    evaluation,
    lastBestMove,
    sendCommand,
    getBestMove,
  };
}
