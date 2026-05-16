# Auth, Socket, and Runtime Console Fix Report

## Fixed

- Reduced repeated `/api/auth/refresh` calls when the browser has no usable session hint.
- Added a single in-flight refresh promise so multiple 401 responses do not trigger multiple refresh requests at the same time.
- Changed Socket.IO client transport order to `polling -> websocket` so production can connect more reliably on Render/proxies before upgrading to WebSocket.
- Set backend Helmet COOP to `same-origin-allow-popups` and disabled backend COEP to reduce Google sign-in/popup console noise.

## Not Changed

- No API response format changes.
- No socket event name changes.
- No MongoDB/Mongoose removal.
- No UI redesign.
- No feature additions.

## Notes

401 responses from `/api/profile/me`, `/api/settings/me`, `/api/billing/me`, and `/api/auth/refresh` are expected when the user is not logged in or the session cookie is expired. The frontend should handle them as unauthenticated state, not as production crashes.

The `contentScript.bundle.js` warning usually comes from a browser extension, not the ChessPlay source code. Test in Incognito with extensions disabled to confirm.

For production, verify these environment variables:

```txt
VITE_BACKEND_URL=https://chessplay-b5ve.onrender.com
VITE_SOCKET_URL=https://chessplay-b5ve.onrender.com
FRONTEND_ORIGINS=https://your-vercel-domain.vercel.app,https://getchessplay.com
NODE_ENV=production
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
MONGODB_URI=...
DATABASE_URL=...
```
