// Load a reliable, single-threaded version of Stockfish directly from CDN
importScripts(
  "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js",
);

// The imported Stockfish bundle already initializes the worker message loop.
// No additional wrapper is required here.
