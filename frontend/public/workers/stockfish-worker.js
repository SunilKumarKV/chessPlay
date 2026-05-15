// Self-hosted Stockfish worker. Keep the chess engine local for production safety.
try {
  importScripts("/stockfish/stockfish.js");
} catch {
  try {
    const stockfishUrl = new URL("../stockfish/stockfish.js", self.location.href).toString();
    importScripts(stockfishUrl);
  } catch {
    self.postMessage("error Chess engine failed to load from local assets");
  }
}
