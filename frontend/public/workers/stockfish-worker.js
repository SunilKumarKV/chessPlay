// Self-hosted Stockfish worker. Do not load chess engine code from third-party CDNs in production.
try {
  importScripts("/stockfish/stockfish.js");
} catch (error) {
  self.postMessage({ type: "error", message: "Chess engine failed to load from local assets." });
}

// The imported Stockfish bundle initializes the worker message loop.
