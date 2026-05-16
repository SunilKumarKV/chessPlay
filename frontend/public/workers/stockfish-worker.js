// Self-hosted Stockfish loader for ChessPlay Play vs AI.
// Keeps the engine local and fixes production Vercel asset paths for stockfish.js + stockfish.wasm.

const log = (message) => self.postMessage(`[stockfish-worker] ${message}`);

try {
  const stockfishUrl = new URL("../stockfish/stockfish.js", self.location.href).toString();
  log(`loading ${stockfishUrl}`);
  importScripts(stockfishUrl);
  log("stockfish-loaded");
} catch (error) {
  self.postMessage(`error Chess engine failed to load from local assets: ${error?.message || error}`);
}
