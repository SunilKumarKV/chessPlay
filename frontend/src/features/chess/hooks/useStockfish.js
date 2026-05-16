import { useEffect, useRef, useCallback, useState } from "react";

const DEFAULT_MOVE_TIMEOUT_MS = 8000;
const ENGINE_BOOT_TIMEOUT_MS = 7000;
const DEBUG_STOCKFISH = import.meta.env.DEV;

const ENGINE_WORKERS = [
  { name: "stable-wasm", path: "workers/stockfish-stable-worker.js" },
  { name: "legacy-js", path: "workers/stockfish-legacy-worker.js" },
  { name: "original", path: "workers/stockfish-worker.js" },
];

function parseEvaluation(message) {
  const cpMatch = message.match(/\bscore cp (-?\d+)/);
  if (cpMatch) return { type: "cp", value: Number(cpMatch[1]) / 100 };
  const mateMatch = message.match(/\bscore mate (-?\d+)/);
  if (mateMatch) return { type: "mate", value: Number(mateMatch[1]) };
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

function workerUrl(path) {
  const base = import.meta.env.BASE_URL || "/";
  return new URL(`${base}${path}`.replace(/\/+/g, "/"), window.location.origin).toString();
}

export function useStockfish({ enabled = true } = {}) {
  const workerRef = useRef(null);
  const movePromiseRef = useRef(null);
  const activeEngineRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [depth, setDepth] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [lastBestMove, setLastBestMove] = useState(null);
  const [error, setError] = useState(null);
  const [engineName, setEngineName] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const resolvePendingMove = useCallback((value) => {
    if (!movePromiseRef.current) return;
    clearTimeout(movePromiseRef.current.timeoutId);
    movePromiseRef.current.resolve(value);
    movePromiseRef.current = null;
  }, []);

  const rejectPendingMove = useCallback((reason) => {
    if (!movePromiseRef.current) return;
    clearTimeout(movePromiseRef.current.timeoutId);
    movePromiseRef.current.reject(new Error(reason));
    movePromiseRef.current = null;
  }, []);

  const sendCommand = useCallback((command) => {
    if (workerRef.current && command) workerRef.current.postMessage(command);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setReady(false);
    setThinking(false);
    setDepth(0);
    setEvaluation(null);
    setLastBestMove(null);
    setEngineName(null);
    setRetryKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    let mounted = true;
    let bootTimeoutId = null;
    let candidateIndex = 0;

    const cleanupWorker = () => {
      if (bootTimeoutId) {
        clearTimeout(bootTimeoutId);
        bootTimeoutId = null;
      }
      if (workerRef.current) {
        try { workerRef.current.postMessage("quit"); } catch { /* noop */ }
        try { workerRef.current.terminate(); } catch { /* noop */ }
        workerRef.current = null;
      }
    };

    const startCandidate = () => {
      if (!mounted) return;
      cleanupWorker();

      const candidate = ENGINE_WORKERS[candidateIndex];
      if (!candidate) {
        setReady(false);
        setThinking(false);
        setEngineName(null);
        // Do not hard-block Play vs AI. ChessPage will use local legal AI fallback.
        setError("Stockfish engine unavailable; using built-in fallback AI.");
        resolvePendingMove(null);
        return;
      }

      let worker;
      try {
        worker = new Worker(workerUrl(candidate.path));
      } catch (creationError) {
        debugStockfish(`${candidate.name} worker create failed`, creationError);
        candidateIndex += 1;
        startCandidate();
        return;
      }

      workerRef.current = worker;
      activeEngineRef.current = candidate.name;
      setEngineName(candidate.name);
      setReady(false);
      setThinking(false);
      setError(null);
      setDepth(0);
      setEvaluation(null);
      setLastBestMove(null);

      bootTimeoutId = setTimeout(() => {
        if (!mounted || workerRef.current !== worker) return;
        debugStockfish(`${candidate.name} boot timeout; trying next engine`);
        candidateIndex += 1;
        startCandidate();
      }, ENGINE_BOOT_TIMEOUT_MS);

      worker.onmessage = (event) => {
        if (!mounted || workerRef.current !== worker) return;
        const msg = typeof event.data === "string" ? event.data.trim() : "";
        if (!msg) return;

        debugStockfish(candidate.name, msg);

        if (msg.startsWith("[stockfish-")) return;

        if (msg.startsWith("error")) {
          debugStockfish(`${candidate.name} error; trying next engine`, msg);
          candidateIndex += 1;
          startCandidate();
          return;
        }

        if (msg === "uciok") {
          if (bootTimeoutId) clearTimeout(bootTimeoutId);
          bootTimeoutId = null;
          setReady(true);
          setError(null);
          worker.postMessage("isready");
          return;
        }

        if (msg === "readyok") {
          if (bootTimeoutId) clearTimeout(bootTimeoutId);
          bootTimeoutId = null;
          setReady(true);
          setError(null);
          return;
        }

        if (msg.startsWith("bestmove")) {
          setThinking(false);
          const bestMove = resolveBestMove(msg);
          setLastBestMove(bestMove);
          resolvePendingMove(bestMove);
          return;
        }

        if (msg.includes("info depth")) {
          setThinking(true);
          const depthMatch = msg.match(/\bdepth\s+(\d+)/);
          if (depthMatch) setDepth(Number(depthMatch[1]));
          const parsedEvaluation = parseEvaluation(msg);
          if (parsedEvaluation) setEvaluation(parsedEvaluation);
        }
      };

      worker.onerror = (event) => {
        if (!mounted || workerRef.current !== worker) return;
        debugStockfish(`${candidate.name} worker error`, event?.message || event);
        candidateIndex += 1;
        startCandidate();
      };

      worker.postMessage("uci");
    };

    startCandidate();

    return () => {
      mounted = false;
      if (bootTimeoutId) clearTimeout(bootTimeoutId);
      resolvePendingMove(null);
      cleanupWorker();
      setReady(false);
      setThinking(false);
    };
  }, [enabled, retryKey, resolvePendingMove]);

  const getBestMove = useCallback(
    (fen, options = 10) => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !ready || error) {
          reject(new Error(error || "Stockfish not ready"));
          return;
        }

        if (movePromiseRef.current) resolvePendingMove(null);

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
          workerRef.current?.postMessage("stop");
          setThinking(false);
          rejectPendingMove("Stockfish took too long; using fallback AI.");
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
    [ready, error, resolvePendingMove, rejectPendingMove],
  );

  return {
    ready,
    thinking,
    depth,
    evaluation,
    lastBestMove,
    error,
    engineName,
    retry,
    sendCommand,
    getBestMove,
  };
}
