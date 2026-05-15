# ChessPlay Release Checklist - v1.4.0-beta.1

Use this checklist before merging, tagging, or deploying the release.

## Branch Safety

- [ ] Work is committed on a release branch, not directly on `main`.
- [ ] Pull request is opened into `main`.
- [ ] CI passes on the pull request.
- [ ] Final review confirms no new features were added in Phase 10.
- [ ] Final review confirms no UI redesign was introduced in Phase 10.
- [ ] Final review confirms API response formats were not changed.
- [ ] Final review confirms MongoDB/Mongoose was not removed.
- [ ] Final review confirms socket event names were not changed.

## Environment and Secrets

- [ ] No `.env` files are committed.
- [ ] `.env.example`, `backend/.env.example`, and `frontend/.env.example` contain placeholders only.
- [ ] Production secrets are configured only in hosting provider dashboards or GitHub Secrets.
- [ ] No hardcoded database URLs, JWT secrets, Redis URLs, SMTP passwords, payment keys, or API tokens exist in source code.
- [ ] Public showcase/docs repos do not contain backend, payment, auth, database, or admin logic.

## Required GitHub Secrets

- [ ] `DATABASE_URL`
- [ ] `JWT_ACCESS_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `MONGO_URI`
- [ ] `REDIS_URL`
- [ ] `VITE_API_URL`
- [ ] `VITE_SOCKET_URL`

## Final Local Commands

```bash
pnpm install
pnpm --filter chessplay-backend exec prisma generate
pnpm build
pnpm lint
pnpm test
```

## Manual Frontend Testing

- [ ] Home page loads.
- [ ] Login page loads.
- [ ] Register flow works.
- [ ] Dashboard loads after login.
- [ ] Profile page loads and handles missing/partial user data safely.
- [ ] Play vs AI starts a game.
- [ ] Multiplayer room can be created/joined.
- [ ] Leaderboard loads without crashing.
- [ ] Premium page loads without exposing secrets.
- [ ] Referral page loads without crashing.
- [ ] Settings page saves/loads expected settings.
- [ ] Mobile layout works on small screen widths.

## Manual Backend Testing

- [ ] Health route returns success.
- [ ] Auth routes work for login/register/current user.
- [ ] Profile routes return safe data.
- [ ] Game history routes do not crash when empty.
- [ ] Premium/referral routes return expected existing response format.
- [ ] Socket connection succeeds.
- [ ] Prisma generate succeeds.
- [ ] MongoDB connection succeeds.

## Deployment Order

- [ ] Deploy backend first.
- [ ] Verify backend health route.
- [ ] Verify backend MongoDB connection.
- [ ] Verify socket connection.
- [ ] Deploy frontend.
- [ ] Confirm frontend production env vars point to production backend/socket URLs.
- [ ] Smoke test auth, dashboard, Play vs AI, multiplayer, premium, referral, and settings.
- [ ] Create tag only after smoke testing passes.

## Public Showcase Update Safety

- [ ] Feature summary only.
- [ ] Screenshots only.
- [ ] Live demo link only.
- [ ] No backend source code.
- [ ] No auth/payment/admin/database logic.
- [ ] No `.env` files or real secrets.

## Rollback

- [ ] Previous stable deployment is known.
- [ ] Previous stable Git tag/commit is known.
- [ ] Hosting dashboard rollback option is available.
- [ ] Database backups/snapshots are verified before production changes.
