/**
 * Quick Test: Verify current Stockfish Worker wiring
 * 
 * Run: node TEST_STOCKFISH.js
 */

const fs = require('fs');
const path = require('path');

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Stockfish Worker Verification");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// 1. Check if the worker used by the app exists
const workerPath = path.join(__dirname, 'frontend/public/workers/stockfish-worker.js');
if (fs.existsSync(workerPath)) {
  const stats = fs.statSync(workerPath);
  console.log("✓ stockfish-worker.js found");
  console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
} else {
  console.log("✗ stockfish-worker.js NOT found");
  process.exit(1);
}

// 2. Check if useStockfish.js points at the public worker
const useStockfishPath = path.join(__dirname, 'frontend/src/features/chess/hooks/useStockfish.js');
const useStockfishCode = fs.readFileSync(useStockfishPath, 'utf8');
const workerCode = fs.readFileSync(workerPath, 'utf8');

const checks = [
  {
    name: "Creates browser Worker",
    source: useStockfishCode,
    pattern: /new Worker\(workerPath\)/,
  },
  {
    name: "Uses public workers path",
    source: useStockfishCode,
    pattern: /workers\/stockfish-worker\.js/,
  },
  {
    name: "Handles UCI ready signal",
    source: useStockfishCode,
    pattern: /msg === "uciok"/,
  },
  {
    name: "Loads Stockfish bundle",
    source: workerCode,
    pattern: /importScripts\([\s\S]*stockfish\.js/,
  },
];

console.log("\n✓ useStockfish.js checks:");
checks.forEach(check => {
  if (check.pattern.test(check.source)) {
    console.log(`  ✓ ${check.name}`);
  } else {
    console.log(`  ✗ ${check.name}`);
    process.exitCode = 1;
  }
});

// 3. Check vercel.json headers
const vercelPath = path.join(__dirname, 'vercel.json');
const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
console.log("\n✓ vercel.json headers:");
const requiredHeaders = [
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Embedder-Policy",
  "Cross-Origin-Resource-Policy",
];
requiredHeaders.forEach(header => {
  const found = vercelConfig.headers.some(h => 
    h.headers.some(hh => hh.key === header)
  );
  console.log(`  ${found ? "✓" : "✗"} ${header}`);
});

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
if (process.exitCode) {
  console.log("✗ Stockfish wiring verification failed");
  process.exit(process.exitCode);
}

console.log("✓ All checked components are wired for Stockfish");
console.log("\nNext steps:");
console.log("1. npm run dev (development)");
console.log("2. Check browser console for: '[Stockfish] Engine loaded'");
console.log("3. AI should return a bestmove from the worker");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
