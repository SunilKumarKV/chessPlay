# Settings Rebuild Report

Base used: `chessplay-leaderboard-production-fixed.zip` because auth/login was confirmed stable there.

## Implemented
- Added protected `/settings` experience without reintroducing auth refresh loops.
- Added backend settings API:
  - `GET /api/settings/me`
  - `PATCH /api/settings/me`
- Added safe user preference fields to the User model:
  - privacy profile visibility, game history visibility, friend request preference
  - notification preferences
  - appearance theme and board theme
  - gameplay defaults
- Rebuilt Settings UI sections:
  - Account Settings
  - Privacy Settings
  - Notification Settings
  - Appearance Settings
  - Gameplay Preferences
  - Supporter/Premium Settings
  - Security Settings
  - Danger Zone
- Added safe premium/supporter status display only from backend user state.
- Added billing, premium, and support links without mutating billing state from settings.
- Added logout button.
- Hidden unsafe/unfinished controls:
  - avatar upload from settings
  - delete account
  - logout all devices
  - active sessions
  - direct email change
- Added mobile/desktop responsive settings layout.
- Added loading, error, save, discard, and unchanged states.
- Prevented settings from calling protected APIs when no real user exists.
- Preserved chess rules, multiplayer validation, Stockfish, admin, billing, and premium backend logic.

## Regression prevention
- `useSettings(user)` only calls `/api/settings/me` when a real logged-in user exists.
- Uses `skipAuthRefresh: true` when loading settings to avoid refresh spam during auth uncertainty.
- No socket calls, Stockfish calls, billing mutations, or admin calls from Settings.

## Validation
- `npm run build` passed.
- `npm --workspace backend test` passed.
- `npm run test:production` passed.
- `npm run lint` passed with one pre-existing warning outside Settings scope: `frontend/src/pages/billing/TournamentsPage.jsx` missing dependency warning.

## Commit message
```bash
git commit -m "improve account settings and preference management"
```
