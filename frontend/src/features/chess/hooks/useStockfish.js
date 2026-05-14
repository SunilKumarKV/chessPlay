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

function safeErrorMessage(error) {
  if (error?.message) return error.message;
  if (typeof error === "string") return error;
  return "Chess engine is temporarily unavailable.";
}

export function useStockfish({ enabled = true } = {}) {
  const workerRef = useRef(null);
  const movePromiseRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [depth, setDepth] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [lastBestMove, setLastBestMove] = useState(null);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const sendCommand = useCallback((command) => {
    if (workerRef.current && command) {
      workerRef.current.postMessage(command);
    }
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setReady(false);
    setThinking(false);
    setDepth(0);
    setEvaluation(null);
    setLastBestMove(null);
    setRetryKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const workerPath = `${import.meta.env.BASE_URL}workers/stockfish-worker.js`;
    let worker;
    let mounted = true;

    try {
      worker = new Worker(workerPath);
    } catch (creationError) {
      if (mounted) {
        setError(`Unable to start chess engine: ${safeErrorMessage(creationError)}`);
        setReady(false);
        setThinking(false);
      }
      return undefined;
    }

    workerRef.current = worker;
    setError(null);
    setReady(false);
    setThinking(false);
    setDepth(0);
    setEvaluation(null);
    setLastBestMove(null);

    worker.onmessage = (event) => {
      if (!mounted) return;
      const msg = typeof event.data === "string" ? event.data.trim() : "";
      if (!msg) return;

      if (msg.startsWith("error")) {
        setError("Chess engine failed to load. Please refresh or try again.");
        setThinking(false);
        if (movePromiseRef.current) {
          clearTimeout(movePromiseRef.current.timeoutId);
          movePromiseRef.current.resolve(null);
          movePromiseRef.current = null;
        }
        return;
      }

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

    worker.onerror = () => {
      if (!mounted) return;
      setError("Chess engine stopped unexpectedly. Please retry.");
      setReady(false);
      setThinking(false);
      if (movePromiseRef.current) {
        clearTimeout(movePromiseRef.current.timeoutId);
        movePromiseRef.current.resolve(null);
        movePromiseRef.current = null;
      }
    };

    worker.postMessage("uci");

    return () => {
      mounted = false;
      if (movePromiseRef.current) {
        clearTimeout(movePromiseRef.current.timeoutId);
        movePromiseRef.current.resolve(null);
        movePromiseRef.current = null;
      }
      worker.terminate();
      workerRef.current = null;
      setReady(false);
      setThinking(false);
    };
  }, [enabled, retryKey]);

  const getBestMove = useCallback(
    (fen, options = 10) => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !ready || error) {
          reject(new Error(error || "Stockfish not ready"));
          return;
        }

        if (movePromiseRef.current) {
          clearTimeout(movePromiseRef.current.timeoutId);
          movePromiseRef.current.resolve(null);
          movePromiseRef.current = null;
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
            const timeoutError = "Chess engine took too long to respond. Please retry.";
            setError(timeoutError);
            movePromiseRef.current.reject(new Error(timeoutError));
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
    [ready, error],
  );

  return {
    ready,
    thinking,
    depth,
    evaluation,
    lastBestMove,
    error,
    retry,
    sendCommand,
    getBestMove,
  };
}
