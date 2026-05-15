# ChessPlay Auth Regression Fix Report

## Problem
After the Settings + Sidebar/Topbar changes, the frontend was loading protected widgets before the authenticated session was stable. That caused repeated 401 responses from `/api/auth/profile`, `/api/auth/refresh`, billing, referral, tournaments, community, messaging, socket-token, and leaderboard APIs. Dashboard treated some 401s as a logout event, so users appeared to be sent back after login.

## Fixed
- Stopped dashboard from forcing logout when optional dashboard data fails with 401.
- Kept local user fallback during session restore so a temporary cookie/session check failure does not immediately kick the user out.
- Changed dashboard leaderboard request from old protected auth leaderboard endpoint to public games leaderboard endpoint.
- Made `/api/games/leaderboard` public read-only and safe: returns only public player stats.
- Made community posts list public read-only; posting/likes/comments remain authenticated.
- Prevented messages page from requesting messaging/socket APIs when there is no current user.
- Avoided socket-token fetch when a short-lived socket token already exists in sessionStorage.
- Added PATCH to backend CORS methods for admin/payment actions.
- Updated Vercel COOP header to `same-origin-allow-popups` to reduce Google popup postMessage blocking.
- Added `frontend/vercel.json` so Vercel uses SPA routing/headers when project root is set to `frontend`.

## Files changed
- `frontend/src/app/App.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/MessagesPage.jsx`
- `frontend/src/features/chess/hooks/useMultiplayerChess.js`
- `frontend/src/services/apiClient.js`
- `backend/routes/games.js`
- `backend/routes/social.js`
- `backend/server.js`
- `vercel.json`
- `frontend/vercel.json`

## Verified
- `npm run build` passed.
- `npm --workspace backend test` passed.
- `npm run test:production` passed.

## Note
The browser console message `A listener indicated an asynchronous response...` is usually from Chrome extensions and is not caused by ChessPlay app code.
