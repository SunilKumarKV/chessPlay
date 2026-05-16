# ChessPlay v1.3.0 Testing Guide

Use this checklist before deploying or sharing the production link.

## 1. Install and Build

```bash
pnpm install
pnpm --filter ./backend exec prisma generate
pnpm -C backend build
pnpm -C frontend lint
pnpm -C frontend build
pnpm build
```

## 2. Backend Testing

Verify these routes and services:

- Health route returns success.
- Auth register/login/logout/refresh behavior works.
- Profile route works after login.
- Settings route works after login.
- Game history route works after login.
- Billing/premium route handles unauthenticated and authenticated states correctly.
- Referral route handles unauthenticated and authenticated states correctly.
- Socket.IO connection works on deployed backend.
- MongoDB connection works in production.
- Prisma generate works where configured.

## 3. Frontend Testing

Check these pages manually:

- Home page
- Login/Register
- Dashboard
- Profile
- Play vs AI
- Multiplayer room
- Leaderboard
- Premium page
- Referral page
- Settings page
- Mobile responsiveness

## 4. Play vs AI Testing

- Easy mode should not reply instantly.
- Medium/hard modes should feel stronger than easy.
- AI moves should not freeze the board.
- Undo/resign/game-over states should remain stable.

## 5. Multiplayer Testing

- Create room.
- Join room from another browser/incognito window.
- Make legal moves.
- Test disconnect/reconnect behavior.
- Test resign/game-end state.

## 6. Console Testing

Test in a normal browser and incognito mode. Confirm no release-blocking errors remain.

Expected non-blockers may include browser extension warnings from `contentScript.bundle.js`. Validate again with extensions disabled.

## 7. Production URLs

Check deployed URLs:

```txt
Frontend: Vercel production URL
Backend: Render production URL
Socket: Render websocket/socket endpoint
```

## 8. Final Pass

Before public sharing:

- No real `.env` files committed.
- No secrets in README/docs.
- No backend private logic copied to public showcase.
- CI passes.
- Vercel deployment passes.
- Render deployment passes.
