# Phase 8 Production Testing

Phase 8 is for production testing and bug fixing only. Do not add features, redesign UI, change API response formats, remove MongoDB/Mongoose, or rename socket events during this phase.

## 1. Install

```bash
pnpm install
```

If registry downloads are slow, retry with a stable network:

```bash
pnpm install --network-concurrency=3
```

## 2. Required environment files

Create local env files from examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

For local testing, update at minimum:

```env
# backend/.env
MONGODB_URI=mongodb://127.0.0.1:27017/chessplay
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chessplay?schema=public
JWT_ACCESS_SECRET=replace-with-local-32-plus-character-secret
JWT_REFRESH_SECRET=replace-with-local-different-32-plus-character-secret
FRONTEND_ORIGINS=http://localhost:5173
```

```env
# frontend/.env
VITE_BACKEND_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

## 3. Automated checks

```bash
pnpm run test:production
pnpm build
pnpm --filter backend test
pnpm --filter backend exec prisma generate
```

Optional combined Phase 8 check:

```bash
pnpm run phase8:check
```

## 4. Run locally

Frontend only:

```bash
pnpm dev
```

Frontend + backend:

```bash
pnpm dev:multi
```

Backend only:

```bash
pnpm server
```

## 5. Frontend manual checklist

- [ ] Home page loads without console runtime crashes.
- [ ] Login page renders.
- [ ] Register page renders.
- [ ] Dashboard page renders after login.
- [ ] Profile page loads current user/profile fallback states correctly.
- [ ] Play vs AI loads board and Stockfish worker does not crash.
- [ ] Multiplayer room connects to socket server.
- [ ] Leaderboard page loads and handles empty/error states.
- [ ] Premium page loads plan data or fallback plans.
- [ ] Referral page loads current referral state or fallback state.
- [ ] Settings page saves UI preferences without crashing.
- [ ] Mobile layout works at 375px, 768px, and desktop widths.

## 6. Backend manual checklist

Use the backend base URL:

```txt
http://localhost:3001
```

Check:

- [ ] Health route returns success.
- [ ] Auth register/login/logout routes respond without 500 errors.
- [ ] Profile routes respond with authenticated requests.
- [ ] Game history routes respond with authenticated requests.
- [ ] Premium/referral routes respond without changing response format.
- [ ] Socket connection succeeds from frontend.
- [ ] Prisma generate succeeds.
- [ ] MongoDB connection succeeds.

## 7. Bug-fix scope

Allowed in Phase 8:

- Build errors
- Broken imports
- Missing env variables
- Broken routes
- Prisma command issues
- TypeScript compile errors
- Obvious runtime crashes

Not allowed in Phase 8:

- New features
- UI redesign
- API response format changes
- MongoDB/Mongoose removal
- Socket event name changes
