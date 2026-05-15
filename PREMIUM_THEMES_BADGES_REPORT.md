# Premium Themes, Colors, Board Styles, and Badges Implementation

Implemented from the latest profile-safe ChessPlay build.

## Completed
- Added premium-safe customization config for app themes, accent colors, text color presets, board themes, and badges.
- Added supporter-only lock checks for premium app themes, premium board themes, premium color presets, and supporter badges.
- Added backend validation for appearance preferences and selected badges.
- Added backend guardrails so non-supporters cannot save supporter-only cosmetics.
- Added selected badge support to settings, profile, and leaderboard data.
- Added richer Settings > Appearance UI with app theme cards, color cards, board previews, badge picker, locked states, active states, and live preview.
- Preserved free defaults: system/light/dark/classic app options and classic/green/blue-style board options.
- Kept all customization cosmetic only: no rating boost, no gameplay advantage, no leaderboard advantage.
- Reused existing Premium/Billing flow only; no new payment gateway or approval logic added.
- Applied accent/text color globally through existing CSS variables and ThemeProvider.
- Preserved chess rules, move validation, Stockfish, multiplayer sockets, and payment approval logic.

## Validation
- Backend syntax checks passed.
- Backend test command passed.
- Frontend production build passed.
- Frontend lint passed with one existing warning outside this scope: frontend/src/pages/billing/TournamentsPage.jsx.

## Commit message
```bash
git commit -m "add premium themes colors board styles and badges"
```
