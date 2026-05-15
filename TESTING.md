# ChessPlay Production Testing

This document tracks Phase 8 and Phase 9 production validation. It does not introduce new features or change app behavior.

## Local Commands

Run these from the project root:

```bash
pnpm install
pnpm --filter chessplay-backend exec prisma generate
pnpm -C backend build
pnpm -C frontend build
pnpm dev
```

Optional checks when scripts exist:

```bash
pnpm -C frontend lint
pnpm -C backend lint
pnpm test
```

## Frontend Manual Testing Checklist

- [ ] Home page loads without console runtime crashes.
- [ ] Login page renders correctly.
- [ ] Register page renders correctly.
- [ ] Dashboard loads after authentication.
- [ ] Profile page loads and handles missing/partial user data safely.
- [ ] Play vs AI page loads and Stockfish worker initializes or fails gracefully.
- [ ] Multiplayer room page can create/join a room.
- [ ] Socket connection opens without changing event names.
- [ ] Leaderboard page loads empty/loading/error states correctly.
- [ ] Premium page loads without payment secret exposure.
- [ ] Referral page loads without runtime crash.
- [ ] Settings page loads and saves only existing settings behavior.
- [ ] Mobile layout works at 360px, 768px, and desktop widths.

## Backend Manual Testing Checklist

- [ ] Health route responds successfully.
- [ ] Auth routes work with existing request/response formats.
- [ ] Profile routes work with existing request/response formats.
- [ ] Game history routes work with existing request/response formats.
- [ ] Premium/referral routes work with existing request/response formats.
- [ ] Socket connection works with existing event names.
- [ ] Prisma generate completes.
- [ ] MongoDB/Mongoose connection succeeds.
- [ ] Missing optional env variables fail gracefully where supported.

## CI/CD Validation

GitHub Actions runs on:

- Pull requests
- Pushes to `main`

CI validates:

- pnpm install
- Backend Prisma client generation
- Frontend lint when script exists
- Backend lint when script exists
- Backend build
- Frontend build

Deployment is intentionally not automated in Phase 9 to avoid unsafe production pushes before secrets and hosting environments are verified.
