# ChessPlay v1.4.0-beta Release Notes

This beta focuses on monetization infrastructure, legal safety, puzzle expansion, and growth surfaces without changing the core chess gameplay experience.

## Highlights

- Premium roadmap foundation for Free, Pro, Premium, and Lifetime plans.
- Razorpay integration structure that fails safely when keys are missing.
- Feedback and waitlist collection for product validation.
- Lichess CC0 puzzle import workflow with daily limits and hints.
- Premium pricing UI with plan comparison, locked-feature upgrade modal, and plan badges.
- Puzzle learning UI with daily counters, hint levels, wrong-move feedback, and completion summary.
- Referral dashboard, payment success/failure pages, and legal footer links.
- Legal pages for privacy, terms, refund, cookie, and contact.
- Admin overview metrics for revenue, premium users, payment count, puzzle usage, feedback reports, and conversion rate.

## New UI/UX Features

- `/pricing` now shows Free, Pro, Premium, and Lifetime cards plus a comparison table.
- Locked premium surfaces can open a reusable upgrade modal without requiring login.
- Navbar/profile plan badges read `/api/me/entitlements` when available and safely fall back to Free.
- `/payment/success` and `/payment/failed` explain next steps without activating plans client-side.
- Dashboard onboarding suggests Play vs AI, puzzles, profile, referrals, and pricing.

## Premium And Pricing Updates

- Pricing copy separates available manual verification from future live checkout.
- Premium themes, AI Coach, opening explorer, and analysis are labeled as gated or coming soon where appropriate.
- Payment history empty states and support paths are clearer.

## Puzzle Learning UI Updates

- Daily remaining counter uses the puzzle limit API.
- Wrong moves show inline feedback with a board shake rather than alerts.
- Hints identify piece, target square, or full move and show remaining hints.
- Completion modal includes theme, difficulty, rating, what the user learned, best move explanation, and next puzzle.

## Safety Notes

- Payment status pages do not fake success or mutate subscription state.
- API errors render safe banners or empty states.
- Existing Play vs AI, Stockfish, multiplayer sockets, auth, and backend APIs were not redesigned.

## Safe Placeholders

- AI Coach, opening explorer, store, coaching marketplace, digital products, and services pages are intentionally placeholder-first.
- Server-side heavy engine analysis is not enabled in this beta.
- Real paid launch still needs live Razorpay credentials, legal review, and production webhook testing.

## Deployment

Frontend Vercel:

```text
Root Directory: frontend
Install: corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm install --frozen-lockfile
Build: pnpm build
Output: dist
```

Backend Render:

```text
Root Directory: backend
Build: corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm install --frozen-lockfile
Start: pnpm start
```
