# Testing v1.4.0-beta

## Local Commands

```bash
pnpm install
pnpm --filter backend dev
pnpm --filter frontend dev
pnpm --filter frontend build
pnpm --filter backend build
pnpm --filter backend start
```

## Manual Checklist

- Home page loads.
- Login/signup modal opens and submits.
- Play vs AI opens with no React runtime crash.
- Multiplayer route opens without socket UI regression.
- Dashboard loads for signed-in users.
- Pricing page works on desktop and mobile.
- Upgrade modal opens from locked features.
- Puzzle page works on desktop and 360px mobile layout.
- Hint UI shows level and remaining count.
- Wrong move feedback is inline and non-blocking.
- Completion UI shows learning summary.
- Payment success/failure pages do not activate plans client-side.
- Feedback modal submits or shows safe error.
- Legal footer links route correctly.
- Referral page copies referral link or shows safe auth error.
- Admin overview remains admin protected.

## Regression Checklist

- No changes to Stockfish worker logic.
- No changes to multiplayer socket handlers.
- No hardcoded payment secrets.
- API failures render safe empty/error states.

## Security Checklist

- Invalid login/signup spam is rate-limited with safe messages.
- Invalid payment verification signatures are rejected.
- Invalid Razorpay webhook signatures are rejected.
- Replayed webhook event IDs are ignored after the first processed event.
- Unauthenticated admin API requests return `401`.
- Non-admin admin API requests return `403`.
- Puzzle next/submit/hint limits cannot be bypassed with repeated calls.
- Invalid puzzle move formats are rejected before chess validation.
- Referral self-invite attempts are rejected.
- Duplicate referral reward credits are not issued for the same referrer/referred pair.
- Missing optional Razorpay and Sentry env vars do not crash local startup.
- Missing required production env vars produce clear startup errors.
- Frontend build output contains no backend secrets or non-`VITE_` secret usage.
