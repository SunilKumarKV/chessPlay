# ChessPlay Quality Assurance & Testing Suite

## Purpose
This document outlines the testing frameworks, automated test suites, manual verification checklists, and release gating criteria to maintain high quality and reliability across ChessPlay.

## Navigation
[README](README.md) • [docs/testing.md](docs/testing.md) • [CONTRIBUTING.md](CONTRIBUTING.md) • [STYLE_GUIDE.md](STYLE_GUIDE.md)

---

## Testing Strategy
ChessPlay employs a multi-tiered testing strategy comprising:
- **Unit and Integration Testing**: Powered by **Vitest** for isolated business logic in both frontend and backend.
- **End-to-End (E2E) Testing**: Powered by **Playwright** to run browser-level automated scenarios simulating multiplayer games.
- **Manual QA Protocol**: Structured checklists to verify WebSockets, AI, payment gateways, and browser console errors.

---

## Automated Test Commands

All test runs are orchestrated using `pnpm` workspace commands:

```bash
# Run all tests (Frontend Vitest, Backend Vitest, and Playwright E2E)
pnpm test:all

# Run backend unit tests only
pnpm test:backend

# Run frontend unit tests only
pnpm test:frontend

# Run E2E integration smoke tests via Playwright
pnpm test:e2e

# Run tests with coverage reports
pnpm --filter frontend test:coverage
```

---

## Manual QA Protocols

### 1. Real-Time Multiplayer Check
- Open two different browsers (e.g., Chrome and Firefox Incognito).
- Authenticate on both windows, create a game room, and share the room code.
- Play standard chess moves and ensure coordinate positions align on both screens.
- **Interruption Testing**: Temporarily disconnect the network on one window. Reconnect and verify the game state is re-fetched and restored from `localStorage`.

### 2. Stockfish AI Check
- Launch a "Play vs AI" room.
- Verify Easy mode makes responsive but non-optimal moves and does not freeze the browser frame.
- Verify Hard mode has an increased latency (due to deeper depth computation) and displays high-quality chess moves.

---

## Examples

### 1. Running backend tests in watch mode
To develop backend tests interactively, run:
```bash
pnpm --filter backend exec vitest
```

### 2. Playwright E2E Smoke Test Sample
Run the production E2E test file specifically targeting login and matchmaking:
```bash
pnpm exec playwright test tests/production-smoke.spec.ts --headed
```

---

## Notes
- > [!IMPORTANT]
  > E2E test runs require the database and mock API variables to be fully configured in `playwright.config.ts`.
- > [!WARNING]
  > Do not disable browser security features (such as Content Security Policy) in the local testing setup, as it might hide security bugs.

---

## Best Practices
- **Write Pure Tests**: Tests must seed and tear down their own test users rather than modifying shared production database tables.
- **Coverage Goals**: Maintain a minimum threshold of **80% code coverage** for core game logic and payment APIs.
- **Verify Consoles**: Ensure that browser developer tools have zero uncaught warnings or errors before pushing.

---

## References
- [Playwright Config](playwright.config.ts)
- [Monorepo Package Scripts](package.json)
- [Detailed Testing Guides](docs/testing.md)
