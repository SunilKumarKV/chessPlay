// Load a reliable, single-threaded version of Stockfish directly from CDN
importScripts(
  "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js",
);

const engine = typeof STOCKFISH === "function" ? STOCKFISH() : Stockfish();

engine.onmessage = (event) => {
  postMessage(event.data || event);
};

onmessage = (event) => {
  engine.postMessage(event.data);
};
