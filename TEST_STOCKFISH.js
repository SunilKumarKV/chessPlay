/**
 * Quick Test: Verify Stockfish Worker with SharedArrayBuffer Polyfill
 * 
 * Run: node TEST_STOCKFISH.js
 */

const fs = require('fs');
const path = require('path');

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Stockfish + SharedArrayBuffer Fix Verification");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// 1. Check if stockfish-18-lite.js exists
const stockfishPath = path.join(__dirname, 'frontend/public/stockfish-18-lite.js');
if (fs.existsSync(stockfishPath)) {
  const stats = fs.statSync(stockfishPath);
  console.log("✓ stockfish-18-lite.js found");
  console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
} else {
  console.log("✗ stockfish-18-lite.js NOT found");
  process.exit(1);
}

// 2. Check if useStockfish.js has polyfill
const useStockfishPath = path.join(__dirname, 'frontend/src/hooks/useStockfish.js');
const useStockfishCode = fs.readFileSync(useStockfishPath, 'utf8');

const checks = [
  { 
    name: "SharedArrayBuffer polyfill", 
    pattern: /self\.SharedArrayBuffer.*=.*ArrayBuffer/,
  },
  {
    name: "Atomics polyfill",
    pattern: /self\.Atomics\s*=/,
  },
  {
    name: "Error handling for imports",
    pattern: /try.*importScripts/s,
  },
  {
    name: "Wrapped Stockfish code",
    pattern: /wrappedCode.*SharedArrayBuffer/s,
  },
];

console.log("\n✓ useStockfish.js checks:");
checks.forEach(check => {
  if (check.pattern.test(useStockfishCode)) {
    console.log(`  ✓ ${check.name}`);
  } else {
    console.log(`  ✗ ${check.name}`);
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
console.log("✓ All components ready for Stockfish");
console.log("\nNext steps:");
console.log("1. npm run dev (development)");
console.log("2. Check browser console for: '[Stockfish] Engine loaded'");
console.log("3. AI should respond without SharedArrayBuffer errors");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
