// ChessPlay Stockfish stable worker.
// Loads the self-hosted WASM engine from /stockfish/stockfish.js.
const log = (message) => self.postMessage(`[stockfish-stable] ${message}`);
try {
  const engineUrl = new URL('/stockfish/stockfish.js', self.location.origin).toString();
  log(`loading ${engineUrl}`);
  importScripts(engineUrl);
  log('loaded');
} catch (error) {
  self.postMessage(`error stable_stockfish_failed ${error?.message || error}`);
}
