# ChessPlay v1.4.0-beta Release Notes

This beta focuses on monetization infrastructure, legal safety, puzzle expansion, and growth surfaces without changing the core chess gameplay experience.

## Highlights

- Premium roadmap foundation for Free, Pro, Premium, and Lifetime plans.
- Razorpay integration structure that fails safely when keys are missing.
- Feedback and waitlist collection for product validation.
- Lichess CC0 puzzle import workflow with daily limits and hints.
- Legal pages for privacy, terms, refund, cookie, and contact.
- Admin overview metrics for revenue, premium users, payment count, puzzle usage, feedback reports, and conversion rate.

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
