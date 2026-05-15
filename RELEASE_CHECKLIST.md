# ChessPlay Release Checklist

Use this checklist before merging or deploying production changes.

## Branch Safety

- [ ] Work is committed on a feature/testing branch, not directly on `main`.
- [ ] Pull request is opened into `main`.
- [ ] CI passes on the pull request.
- [ ] No app logic, UI redesign, API response format, MongoDB/Mongoose removal, or socket event changes were introduced in Phase 9.

## Environment and Secrets

- [ ] `.env` files are not committed.
- [ ] `.env.example`, `backend/.env.example`, and `frontend/.env.example` contain placeholders only.
- [ ] GitHub Secrets are configured for CI/CD.
- [ ] Production secrets are configured only in hosting provider dashboards.
- [ ] No hardcoded database URLs, JWT secrets, Redis URLs, SMTP passwords, payment keys, or API tokens exist in source code.

## Required GitHub Secrets

- [ ] `DATABASE_URL`
- [ ] `JWT_ACCESS_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `MONGO_URI`
- [ ] `REDIS_URL`
- [ ] `VITE_API_URL`
- [ ] `VITE_SOCKET_URL`

## Build and Test

Run locally before merge:

```bash
pnpm install
pnpm --filter chessplay-backend exec prisma generate
pnpm -C backend build
pnpm -C frontend build
pnpm dev
```

Manual checks:

- [ ] Home page
- [ ] Login/register
- [ ] Dashboard
- [ ] Profile
- [ ] Play vs AI
- [ ] Multiplayer room
- [ ] Leaderboard
- [ ] Premium page
- [ ] Referral page
- [ ] Settings page
- [ ] Mobile responsiveness
- [ ] Backend health route
- [ ] Auth routes
- [ ] Profile routes
- [ ] Game history routes
- [ ] Premium/referral routes
- [ ] Socket connection
- [ ] Prisma generation
- [ ] MongoDB connection

## Deployment

- [ ] Deploy backend first.
- [ ] Verify health route after backend deployment.
- [ ] Deploy frontend after backend verification.
- [ ] Confirm frontend environment variables point to production backend/socket URLs.
- [ ] Test authentication and multiplayer after deployment.
- [ ] Create release tag only after smoke testing passes.
