# Backend Engine & Server Development

## Purpose
This document details the backend server design, controller routing patterns, Stockfish AI subprocess management, and puzzle import pipelines within the ChessPlay server.

## Navigation
[README](../README.md) • [architecture.md](architecture.md) • [api.md](api.md) • [database.md](database.md)

---

## Backend Directory Map
The backend codebase is structured logically to separate routers, database engines, and socket managers:
```txt
backend/
├── prisma/             # Schema definitions and SQL migration queries
├── src/
│   ├── config/         # System variables validation, cors options, and helmet headers
│   ├── controllers/    # API endpoint routing logic (auth, waitlist, payments)
│   ├── middleware/     # Auth checks, rate limiting, and errors logging
│   ├── services/       # Database interactions, payment drivers, and AI management
│   ├── sockets/        # Real-time WebSocket room events and matching queues
│   ├── utils/          # Encryption tools, validators, and sanitizers
│   └── server.ts       # Application entry point (boots Express and Socket.IO)
└── scripts/            # Database seed and puzzle import shell scripts
```

---

## Core Operations

### 1. Stockfish Subprocess Manager
ChessPlay runs local instances of the Stockfish chess engine to calculate opponent moves. When a game against the AI starts, the server spawns a new process pointing to the Stockfish binary and communicates with it using the standard **Universal Chess Interface (UCI)** protocol:

```typescript
import { spawn } from 'child_process';

const stockfish = spawn('stockfish');
stockfish.stdin.write('uci\n');
stockfish.stdin.write('position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\n');
stockfish.stdin.write('go depth 10\n');
```

### 2. Puzzle Import Pipeline
Our automated puzzle engine loads CC0 puzzles from Lichess data exports:
1. Downloads and parses target Gzip files containing puzzle metadata.
2. Filters puzzles by difficulty ratings (Beginner, Intermediate, Advanced, Master).
3. Upserts records into the `Puzzle` database table.
4. Checks the daily limit quotas per user to serve appropriate puzzles via the API.

---

## Examples

### 1. Stockfish AI UCI Event Listener
```typescript
stockfish.stdout.on('data', (data) => {
  const output = data.toString();
  const match = output.match(/bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/);
  if (match) {
    const bestMove = match[1];
    console.log(`Stockfish recommended move: ${bestMove}`);
  }
});
```

### 2. Webhook Signature Verification
Verify incoming signatures from payment gateways (e.g. Razorpay) to prevent spoofing:
```typescript
import crypto from 'crypto';

export const verifyRazorpaySignature = (
  body: string, 
  signature: string, 
  secret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
};
```

---

## Notes
- > [!IMPORTANT]
  > Ensure that the local system running the backend server has the Stockfish binary compiled and marked as executable (`chmod +x`).
- > [!WARNING]
  > Always configure a CPU execution limit on backend workers to prevent Stockfish from consuming all available server hardware threads during depth calculations.

---

## Best Practices
- **Subprocess Recycling**: Terminate Stockfish child processes immediately when a user closes or abandons a Play vs AI session.
- **Sanitize Webhook Inputs**: Always read raw payloads for webhook verification checks to prevent character encoding discrepancies.
- **Isolate Configs**: Wrap sensitive environment checks in class models to fail-fast at boot if keys are missing.

---

## References
- [Backend Monorepo Settings File](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/backend/package.json)
- [Server Main Boot Script](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/backend/src/server.ts)
- [REST API Route Index Guide](api.md)
