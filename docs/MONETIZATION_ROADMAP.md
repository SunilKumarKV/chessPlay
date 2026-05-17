# ChessPlay Monetization Roadmap

## Plans

| Plan | Puzzle limit | Intended value |
| --- | ---: | --- |
| Free | 5/day | Core chess, Play vs AI, multiplayer, leaderboard, starter puzzles |
| Pro | 25/day | More puzzle volume, no ads, premium sounds/themes, early access |
| Premium | 100/day | Premium puzzle filters, AI Coach foundation, analysis/report features |
| Lifetime | 200/day | Long-term premium access, lifetime badge, priority feedback |

## Feature Gating

Frontend locked features should open the upgrade modal and never break the page when entitlement APIs fail. Backend gates remain the source of truth.

Important entitlement keys:

- `premiumThemes`
- `premiumPuzzleFilters`
- `advancedAnalysis`
- `unlimitedAnalysis`
- `advancedStats`
- `unlimitedGameReview`

## Revenue Phases

1. Manual supporter verification and donation/support links.
2. Razorpay order/verify/webhook activation after production keys are configured.
3. Premium puzzles, extra hints, and analysis reports.
4. AI Coach, opening explorer filters, and mistake review trainer.
5. Future store, coaching, tournaments, and affiliate surfaces after legal/product review.

## Future Features

- Recurring subscription management.
- Production Razorpay checkout UI.
- Server-side analysis queue.
- Admin coupon creation UI.
- Premium tournament flows only after legal review.
