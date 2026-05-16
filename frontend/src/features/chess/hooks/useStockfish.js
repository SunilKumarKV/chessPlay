import { useEffect, useRef, useCallback, useState } from "react";

const DEFAULT_MOVE_TIMEOUT_MS = 8000;
const ENGINE_BOOT_TIMEOUT_MS = 8000;
const DEBUG_STOCKFISH = import.meta.env.DEV;

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

function debugStockfish(...args) {
  if (DEBUG_STOCKFISH) console.info("[Stockfish]", ...args);
}

function resolveBestMove(message) {
  if (!message.startsWith("bestmove")) return undefined;
  const [, bestMove] = message.split(/\s+/);
  if (!bestMove || bestMove === "0000" || bestMove === "(none)") return null;
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(bestMove) ? bestMove.toLowerCase() : null;
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

    const workerPath = new URL(`${import.meta.env.BASE_URL}workers/stockfish-worker.js`, window.location.origin).toString();
    let worker;
    let mounted = true;
    let engineReady = false;
    let bootTimeoutId = null;

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

    bootTimeoutId = setTimeout(() => {
      if (!mounted || engineReady) return;
      setError("Chess engine did not finish loading. Please retry.");
      setReady(false);
      setThinking(false);
      try { worker.terminate(); } catch { /* noop */ }
      if (workerRef.current === worker) workerRef.current = null;
    }, ENGINE_BOOT_TIMEOUT_MS);

    worker.onmessage = (event) => {
      if (!mounted) return;
      const msg = typeof event.data === "string" ? event.data.trim() : "";
      if (!msg) return;

      debugStockfish(msg);

      if (msg.startsWith("[stockfish-worker]")) {
        return;
      }

      if (msg.startsWith("error")) {
        setError("Chess engine failed to load. Please refresh or try again.");
        setReady(false);
        setThinking(false);
        if (movePromiseRef.current) {
          clearTimeout(movePromiseRef.current.timeoutId);
          movePromiseRef.current.resolve(null);
          movePromiseRef.current = null;
        }
        return;
      }

      if (msg === "uciok") {
        engineReady = true;
        if (bootTimeoutId) clearTimeout(bootTimeoutId);
        setReady(true);
        worker.postMessage("isready");
      } else if (msg === "readyok") {
        engineReady = true;
        if (bootTimeoutId) clearTimeout(bootTimeoutId);
        setReady(true);
      } else if (msg.startsWith("bestmove")) {
        setThinking(false);
        const bestMove = resolveBestMove(msg);
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

    worker.onerror = (event) => {
      if (!mounted) return;
      debugStockfish("worker error", event?.message || event);
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
      if (bootTimeoutId) clearTimeout(bootTimeoutId);
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
            const safeMoveTime = Math.max(300, Math.min(3000, Number(options.movetime)));
            goCommand = `go movetime ${safeMoveTime}`;
            timeoutMs = safeMoveTime + 5000;
          } else {
            const requestedDepth = Math.max(1, Math.min(24, Number(options.depth || 10)));
            goCommand = `go depth ${requestedDepth}`;
            timeoutMs = Math.max(DEFAULT_MOVE_TIMEOUT_MS, requestedDepth * 900);
          }
        } else if (typeof options === "number" && options > 100) {
          const safeMoveTime = Math.max(300, Math.min(3000, Number(options)));
          goCommand = `go movetime ${safeMoveTime}`;
          timeoutMs = safeMoveTime + 5000;
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

        workerRef.current.postMessage("stop");
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
