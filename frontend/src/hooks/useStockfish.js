import { useEffect, useRef, useCallback, useState } from "react";

// ELO-based difficulty mapping
const DIFFICULTY_ELO_MAP = {
  0: 200, // Beginner
  1: 300,
  2: 400,
  3: 500,
  4: 600,
  5: 700, // Casual
  6: 800,
  7: 900,
  8: 1000,
  9: 1100,
  10: 1200, // Intermediate
  11: 1300,
  12: 1400,
  13: 1500,
  14: 1600,
  15: 1700, // Advanced
  16: 1800,
  17: 1900,
  18: 2000,
  19: 2100,
  20: 2200, // Master
};

// Convert difficulty (0-20) to Stockfish skill level (0-20)
const difficultyToSkill = (difficulty) => Math.min(20, Math.max(0, difficulty));

// Convert difficulty to thinking time (in milliseconds)
const difficultyToTime = (difficulty) => {
  // Base time in milliseconds
  const baseTimes = {
    0: 100, // Very fast for beginners
    5: 500, // Moderate
    10: 1000, // Standard
    15: 2000, // Advanced
    20: 5000, // Master level
  };

  const keys = Object.keys(baseTimes)
    .map(Number)
    .sort((a, b) => a - b);
  const key = keys.reduce((prev, k) => (difficulty >= k ? k : prev), 0);
  return baseTimes[key];
};

// Convert difficulty to search depth
const difficultyToDepth = (difficulty) => {
  if (difficulty <= 5) return 3; // Shallow search
  if (difficulty <= 10) return 6; // Moderate depth
  if (difficulty <= 15) return 10; // Deep search
  return 15; // Very deep for masters
};

export function useStockfish({ enabled = true, onMove } = {}) {
  const workerRef = useRef(null);
  const movePromiseRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [evaluation, setEvaluation] = useState(0);
  const [bestMove, setBestMove] = useState(null);

  const sendCommand = useCallback((command) => {
    if (workerRef.current && command) {
      workerRef.current.postMessage(command);
    }
  }, []);

  // Initialize Stockfish
  useEffect(() => {
    if (!enabled) return;

    setReady(false);
    setThinking(false);

    const worker = new Worker("/workers/stockfish-worker.js");
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const msg = typeof event.data === "string" ? event.data.trim() : "";

      if (!msg) return;

      // Engine ready
      if (msg === "uciok") {
        setReady(true);
        // Set up engine with default options
        sendCommand("setoption name Skill Level value 10");
        sendCommand("setoption name Threads value 1");
        sendCommand("setoption name Hash value 32");
        sendCommand("isready");
      }

      // Engine ready for commands
      else if (msg === "readyok") {
        // Engine is ready
      }

      // Best move found
      else if (msg.startsWith("bestmove")) {
        setThinking(false);
        const match = msg.match(/^bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/i);
        const move = match ? match[1] : null;
        setBestMove(move);

        if (movePromiseRef.current) {
          clearTimeout(movePromiseRef.current.timeoutId);
          movePromiseRef.current.resolve(move);
          movePromiseRef.current = null;
        }

        // Call the callback if provided
        if (onMove && move) {
          onMove(move);
        }
      }

      // Evaluation info
      else if (msg.includes("info") && msg.includes("score")) {
        const scoreMatch = msg.match(/score\s+cp\s+(-?\d+)/);
        if (scoreMatch) {
          const score = parseInt(scoreMatch[1], 10) / 100; // Convert centipawns to pawns
          setEvaluation(score);
        }
      }
    };

    worker.onerror = (error) => {
      console.error("[Stockfish] Worker error:", error);
    };

    // Initialize UCI protocol
    sendCommand("uci");

    return () => {
      worker.terminate();
    };
  }, [enabled, sendCommand, onMove]);

  // Get best move with configurable difficulty
  const getBestMove = useCallback(
    (fen, difficulty = 10, timeout = 5000) => {
      if (!ready) return Promise.reject(new Error("Engine not ready"));

      return new Promise((resolve, reject) => {
        setThinking(true);
        setEvaluation(0);
        setBestMove(null);

        // Clear any existing promise
        if (movePromiseRef.current) {
          clearTimeout(movePromiseRef.current.timeoutId);
          movePromiseRef.current.reject(new Error("Cancelled"));
        }

        // Set position
        sendCommand(`position fen ${fen}`);

        // Set skill level based on difficulty
        const skillLevel = difficultyToSkill(difficulty);
        sendCommand(`setoption name Skill Level value ${skillLevel}`);

        // Set thinking time limit
        const timeLimit = difficultyToTime(difficulty);
        const depth = difficultyToDepth(difficulty);

        // Start search
        sendCommand(`go depth ${depth} movetime ${timeLimit}`);

        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (movePromiseRef.current) {
            movePromiseRef.current.reject(new Error("Timeout"));
            movePromiseRef.current = null;
            setThinking(false);
          }
        }, timeout);

        movePromiseRef.current = { resolve, reject, timeoutId };
      });
    },
    [ready, sendCommand],
  );

  // Get evaluation for current position
  const getEvaluation = useCallback(
    (fen, depth = 10) => {
      if (!ready) return Promise.reject(new Error("Engine not ready"));

      return new Promise((resolve) => {
        sendCommand(`position fen ${fen}`);
        sendCommand(`go depth ${depth}`);

        // Return current evaluation after a short delay
        setTimeout(() => {
          resolve(evaluation);
        }, 100);
      });
    },
    [ready, sendCommand, evaluation],
  );

  // Stop current analysis
  const stop = useCallback(() => {
    sendCommand("stop");
    setThinking(false);
    if (movePromiseRef.current) {
      movePromiseRef.current.reject(new Error("Stopped"));
      movePromiseRef.current = null;
    }
  }, [sendCommand]);

  return {
    ready,
    thinking,
    evaluation,
    bestMove,
    getBestMove,
    getEvaluation,
    stop,
  };
}
