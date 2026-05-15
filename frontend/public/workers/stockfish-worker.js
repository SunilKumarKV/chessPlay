// Prefer the self-hosted public asset. Keep the CDN as a fallback only.
try {
  importScripts("/stockfish/stockfish.js");
} catch (localError) {
  console.warn("[Stockfish] Local engine failed, falling back to CDN.", localError);
  importScripts("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");
}

// The imported Stockfish bundle already initializes the worker message loop.
// No additional wrapper is required here.
