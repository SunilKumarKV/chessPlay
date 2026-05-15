# Phase 8 Release Checklist

## Branch safety

- [ ] Work is committed on a testing branch, not directly on `main`.
- [ ] `git status` is clean before deployment.
- [ ] Pull request is created from testing branch to `main` only after checks pass.

## Install/build checks

- [ ] `pnpm install` passes.
- [ ] `pnpm run test:production` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm --filter backend test` passes.
- [ ] `pnpm --filter backend exec prisma generate` passes.

## Environment checks

- [ ] No real `.env` files are committed.
- [ ] `backend/.env.example` contains all required backend placeholders.
- [ ] `frontend/.env.example` contains all required frontend placeholders.
- [ ] Production JWT secrets are strong and different.
- [ ] Production MongoDB URL is configured only in hosting provider env settings.
- [ ] Production database/payment/email keys are configured only in hosting provider env settings.

## Backend checks

- [ ] Health route works.
- [ ] MongoDB connection works.
- [ ] Prisma generate works.
- [ ] Auth routes do not return unexpected 500 errors.
- [ ] Profile routes do not return unexpected 500 errors.
- [ ] Game history routes do not return unexpected 500 errors.
- [ ] Premium/referral routes do not return unexpected 500 errors.
- [ ] Socket server accepts frontend connection.

## Frontend checks

- [ ] Home page works.
- [ ] Login/register works.
- [ ] Dashboard works.
- [ ] Profile works.
- [ ] Play vs AI works.
- [ ] Multiplayer room works.
- [ ] Leaderboard works.
- [ ] Premium page works.
- [ ] Referral page works.
- [ ] Settings page works.
- [ ] Mobile responsive checks pass.

## Security checks

Run before pushing:

```bash
git grep -n "MONGODB_URI\|DATABASE_URL\|JWT_SECRET\|JWT_ACCESS_SECRET\|JWT_REFRESH_SECRET\|SMTP_PASS\|TELEGRAM_BOT_TOKEN\|STRIPE\|PAYPAL\|CLOUDINARY_API_SECRET\|PAYMENT_SIGNING_SECRET" -- ':!*.env.example' ':!TESTING.md' ':!RELEASE_CHECKLIST.md'
```

- [ ] No secrets are found in committed files.
- [ ] Admin/payment/database internals stay private.
- [ ] Public showcase repo does not receive enterprise backend code.
