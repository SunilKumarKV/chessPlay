# ChessPlay v1.3.0 Release Checklist

## Version

```txt
v1.3.0
```

## Pre-Release Checks

- [ ] Confirm current branch is correct.
- [ ] Confirm release version is `1.3.0` in root, backend, and frontend `package.json`.
- [ ] Confirm no old beta release references remain.
- [ ] Confirm `.env` files are not committed.
- [ ] Confirm `.env.example` files contain placeholders only.

## Build Checks

```bash
pnpm install
pnpm --filter ./backend exec prisma generate
pnpm -C backend build
pnpm -C frontend lint
pnpm -C frontend build
pnpm build
```

- [ ] Backend build passes.
- [ ] Frontend lint passes.
- [ ] Frontend build passes.
- [ ] Full build passes.

## Secret Scan

```bash
git grep -n "JWT_ACCESS_SECRET\|JWT_REFRESH_SECRET\|MONGO_URI\|MONGODB_URI\|DATABASE_URL\|SMTP_PASS\|TELEGRAM_BOT_TOKEN\|CLOUDINARY_API_SECRET\|STRIPE_SECRET_KEY\|PAYPAL_CLIENT_SECRET\|PAYMENT_SIGNING_SECRET"
```

- [ ] Only placeholders or variable names are found.
- [ ] No real secret values are found.

## Backend Deploy Check

Render settings:

```txt
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm run start
Node: 20.x
```

- [ ] Render build succeeds.
- [ ] Render start succeeds.
- [ ] Health route works.
- [ ] MongoDB connects.
- [ ] Socket.IO connects.

## Frontend Deploy Check

Vercel settings:

```txt
Root Directory: frontend
Build Command: pnpm build
Output Directory: dist
```

- [ ] Vercel build succeeds.
- [ ] Frontend opens correctly.
- [ ] API URL points to backend production URL.
- [ ] Socket URL points to backend production URL.

## Manual Production Testing

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

## Public Sharing Safety

- [ ] Public showcase has screenshots and feature summary only.
- [ ] No backend logic in public showcase.
- [ ] No auth/payment/database/admin internals in public showcase.
- [ ] No production secrets in public files.

## Release Commands

```bash
git add .
git commit -m "chore: finalize ChessPlay v1.3.0 production release"
git push origin main
git tag -a v1.3.0 -m "ChessPlay stable release v1.3.0"
git push origin v1.3.0
```

## Rollback

```bash
git revert <release-commit-sha>
git push origin main
```

If tag rollback is needed:

```bash
git tag -d v1.3.0
git push origin :refs/tags/v1.3.0
```
