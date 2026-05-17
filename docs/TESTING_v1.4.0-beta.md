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
