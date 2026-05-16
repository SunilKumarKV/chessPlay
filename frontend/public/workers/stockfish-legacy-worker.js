// ChessPlay Stockfish legacy worker.
// Secondary loader path. Kept separate so browsers/CDNs that fail one path can try another.
const log = (message) => self.postMessage(`[stockfish-legacy] ${message}`);
try {
  const engineUrl = new URL('/stockfish.js', self.location.origin).toString();
  log(`loading ${engineUrl}`);
  importScripts(engineUrl);
  log('loaded');
} catch (error) {
  self.postMessage(`error legacy_stockfish_failed ${error?.message || error}`);
}
