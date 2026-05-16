import { useEffect, useRef, useCallback, useState } from "react";

const DEFAULT_MOVE_TIMEOUT_MS = 3000;
const ENGINE_BOOT_TIMEOUT_MS = 3000;
const DEBUG_STOCKFISH = false;

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
  if (DEBUG_STOCKFISH) console.info("[ChessPlay AI]", ...args);
}

function resolveBestMove(message) {
  if (!message.startsWith("bestmove")) return undefined;
  const [, bestMove] = message.split(/\s+/);
  if (!bestMove || bestMove === "0000" || bestMove === "(none)") return null;
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(bestMove) ? bestMove.toLowerCase() : null;
}

function createWorkerUrl(path) {
  return new URL(`${import.meta.env.BASE_URL}${path}`.replace(/\/+/g, "/"), window.location.origin).toString();
}

const ENGINE_CANDIDATES = [
  { name: "stable-stockfish-classic", path: "stockfish/stockfish.js" },
  { name: "stockfish-wasm-wrapper", path: "workers/stockfish-worker.js" },
  { name: "legacy-stockfish-root", path: "stockfish.js" },
];

export function useStockfish({ enabled = true } = {}) {
  const workerRef = useRef(null);
  const mountedRef = useRef(false);
  const movePromiseRef = useRef(null);
  const engineIndexRef = useRef(0);
  const bootTimeoutRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [depth, setDepth] = useState(0);
  const [evaluation, setEvaluation] = useState(null);
  const [lastBestMove, setLastBestMove] = useState(null);
  const [error, setError] = useState(null);
  const [engineName, setEngineName] = useState("fallback");
  const [retryKey, setRetryKey] = useState(0);

  const cleanupWorker = useCallback(() => {
    if (bootTimeoutRef.current) {
      clearTimeout(bootTimeoutRef.current);
      bootTimeoutRef.current = null;
    }
    if (movePromiseRef.current) {
      clearTimeout(movePromiseRef.current.timeoutId);
      movePromiseRef.current.resolve(null);
      movePromiseRef.current = null;
    }
    if (workerRef.current) {
      try { workerRef.current.postMessage("quit"); } catch { /* noop */ }
      try { workerRef.current.terminate(); } catch { /* noop */ }
      workerRef.current = null;
    }
  }, []);

  const sendCommand = useCallback((command) => {
    if (workerRef.current && command) workerRef.current.postMessage(command);
  }, []);

  const retry = useCallback(() => {
    cleanupWorker();
    engineIndexRef.current = 0;
    setError(null);
    setReady(false);
    setThinking(false);
    setDepth(0);
    setEvaluation(null);
    setLastBestMove(null);
    setEngineName("fallback");
    setRetryKey((value) => value + 1);
  }, [cleanupWorker]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanupWorker();
      setReady(false);
      setThinking(false);
      setEngineName("fallback");
      return undefined;
    }

    let disposed = false;

    const failCurrentMove = () => {
      if (movePromiseRef.current) {
        clearTimeout(movePromiseRef.current.timeoutId);
        movePromiseRef.current.resolve(null);
        movePromiseRef.current = null;
      }
    };

    const tryStartEngine = () => {
      if (disposed || !mountedRef.current) return;
      cleanupWorker();

      const candidate = ENGINE_CANDIDATES[engineIndexRef.current];
      if (!candidate) {
        debugStockfish("all Stockfish engines failed, built-in legal AI fallback active");
        setReady(false);
        setThinking(false);
        setEngineName("fallback");
        setError("Stockfish unavailable. Built-in legal AI fallback is active.");
        return;
      }

      const workerUrl = createWorkerUrl(candidate.path);
      debugStockfish("loading engine:", candidate.name, workerUrl);
      setReady(false);
      setThinking(false);
      setDepth(0);
      setEvaluation(null);
      setLastBestMove(null);
      setEngineName(candidate.name);
      setError(null);

      let worker;
      let booted = false;

      const moveToNextEngine = (reason) => {
        if (disposed || !mountedRef.current) return;
        debugStockfish(`${candidate.name} failed:`, reason);
        failCurrentMove();
        engineIndexRef.current += 1;
        tryStartEngine();
      };

      try {
        worker = new Worker(workerUrl);
      } catch (creationError) {
        moveToNextEngine(safeErrorMessage(creationError));
        return;
      }

      workerRef.current = worker;

      bootTimeoutRef.current = setTimeout(() => {
        if (booted || disposed) return;
        moveToNextEngine("boot timeout");
      }, ENGINE_BOOT_TIMEOUT_MS);

      worker.onmessage = (event) => {
        if (disposed || !mountedRef.current) return;
        const msg = typeof event.data === "string" ? event.data.trim() : "";
        if (!msg) return;

        debugStockfish(candidate.name, msg);

        if (msg.startsWith("[stockfish-worker]")) return;

        if (/^(error|abort\(|exception thrown|failed)/i.test(msg)) {
          setError(msg);
          moveToNextEngine(msg);
          return;
        }

        if (msg === "uciok") {
          booted = true;
          if (bootTimeoutRef.current) clearTimeout(bootTimeoutRef.current);
          setReady(true);
          setError(null);
          worker.postMessage("isready");
          return;
        }

        if (msg === "readyok") {
          booted = true;
          if (bootTimeoutRef.current) clearTimeout(bootTimeoutRef.current);
          setReady(true);
          setError(null);
          return;
        }

        if (msg.startsWith("bestmove")) {
          setThinking(false);
          const bestMove = resolveBestMove(msg);
          setLastBestMove(bestMove);
          if (movePromiseRef.current) {
            clearTimeout(movePromiseRef.current.timeoutId);
            movePromiseRef.current.resolve(bestMove);
            movePromiseRef.current = null;
          }
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
        moveToNextEngine(event?.message || "worker error");
      };

      worker.postMessage("uci");
    };

    engineIndexRef.current = 0;
    tryStartEngine();

    return () => {
      disposed = true;
      cleanupWorker();
      setReady(false);
      setThinking(false);
    };
  }, [enabled, retryKey, cleanupWorker]);

  const getBestMove = useCallback(
    (fen, options = 10) => new Promise((resolve) => {
      if (!workerRef.current || !ready || error) {
        debugStockfish("engine not ready, caller should use fallback", { ready, error, engineName });
        resolve(null);
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
          const safeMoveTime = Math.max(250, Math.min(2500, Number(options.movetime)));
          goCommand = `go movetime ${safeMoveTime}`;
          timeoutMs = Math.min(DEFAULT_MOVE_TIMEOUT_MS, safeMoveTime + 500);
        } else {
          const requestedDepth = Math.max(1, Math.min(16, Number(options.depth || 8)));
          goCommand = `go depth ${requestedDepth}`;
          timeoutMs = DEFAULT_MOVE_TIMEOUT_MS;
        }
      } else if (typeof options === "number" && options > 100) {
        const safeMoveTime = Math.max(250, Math.min(2500, Number(options)));
        goCommand = `go movetime ${safeMoveTime}`;
        timeoutMs = Math.min(DEFAULT_MOVE_TIMEOUT_MS, safeMoveTime + 500);
      } else {
        const requestedDepth = Math.max(1, Math.min(16, Number(options || 8)));
        goCommand = `go depth ${requestedDepth}`;
        timeoutMs = DEFAULT_MOVE_TIMEOUT_MS;
      }

      const timeoutId = setTimeout(() => {
        if (!movePromiseRef.current) return;
        debugStockfish("bestmove timeout, using fallback");
        try { workerRef.current?.postMessage("stop"); } catch { /* noop */ }
        setThinking(false);
        movePromiseRef.current.resolve(null);
        movePromiseRef.current = null;
      }, Math.max(timeoutMs, 1000));

      movePromiseRef.current = { resolve, timeoutId };
      setThinking(true);
      setDepth(0);
      setEvaluation(null);
      setLastBestMove(null);

      try {
        workerRef.current.postMessage("ucinewgame");
        if (skillLevel !== null) {
          workerRef.current.postMessage(`setoption name Skill Level value ${Math.max(0, Math.min(20, skillLevel))}`);
        }
        workerRef.current.postMessage(`position fen ${fen}`);
        workerRef.current.postMessage(goCommand);
        debugStockfish("AI engine:", engineName, "command:", goCommand);
      } catch (commandError) {
        clearTimeout(timeoutId);
        setThinking(false);
        movePromiseRef.current = null;
        debugStockfish("engine command failed, using fallback", commandError);
        resolve(null);
      }
    }),
    [ready, error, engineName],
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
