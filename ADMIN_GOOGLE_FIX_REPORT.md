# ChessPlay Admin + Google Login Fix Report

## What I changed

### File: `frontend/src/app/App.jsx`
Issue: `/admin` and `/admin/dashboard` were being mapped to the normal user dashboard because `pageFromPathname()` returned `dashboard` for every route except password/email routes.
Fix: Added explicit route mapping for `/admin`, `/admin/dashboard`, `/admin/supporters`, and `/admin/automation`.
Why safe: This only changes page selection/routing. It does not touch chess rules, AI, multiplayer, socket, move validation, or game state logic.
How to test: Login as admin and open `/admin`, `/admin/dashboard`, `/admin/supporters`, and `/admin/automation` directly after deployment.

### File: `frontend/src/pages/AdminDashboardPage.jsx`
Issue: There was no real admin landing panel at `/admin`; admins only saw the normal dashboard or had to know hidden internal pages.
Fix: Added a production admin panel with summary cards, safe links to Supporter Requests and Automation Center, and a restricted-access message for non-admin users.
Why safe: New page only reads existing admin APIs and navigates to existing admin features. It does not modify backend data unless admin clicks existing approve/reject/test actions.
How to test: Login as admin, open `/admin`, confirm admin email, pending requests count, automation count, and buttons. Login as normal user and confirm restricted message.

### File: `frontend/src/features/dashboard/components/Sidebar.jsx`
Issue: Admin navigation only exposed `Admin Automation`, so there was no clear Admin Panel entry.
Fix: Replaced hidden admin automation entry with `Admin Panel`, which opens the new admin dashboard.
Why safe: Navigation-only change for users with `isAdmin: true`.
How to test: Login as admin and confirm `Admin Panel` appears in sidebar. Login as normal user and confirm it does not appear.

### File: `frontend/src/features/auth/components/Auth.jsx`
Issue: Google login could incorrectly behave like a redirect flow even though backend only supports `POST /api/auth/google` with a Google Identity Services credential.
Fix: Removed redirect dependency from the Google login component, always uses Google Identity Services when `VITE_GOOGLE_CLIENT_ID` exists, and posts the credential to `/api/auth/google`.
Why safe: Matches your backend route exactly: `router.post('/google')`. Normal email/password login is unchanged.
How to test: Set `VITE_GOOGLE_CLIENT_ID`, redeploy frontend, click Google login, choose account, verify dashboard opens and user is stored.

### File: `frontend/src/config/runtime.js`
Issue: `VITE_GOOGLE_AUTH_URL` could confuse deployment because this backend does not expose a browser GET OAuth route.
Fix: Removed the runtime export and documented that Google sign-in must use GIS credential POST.
Why safe: Removes a broken config path only. Existing backend Google POST flow remains untouched.
How to test: Ensure frontend Vercel env does not use `VITE_GOOGLE_AUTH_URL` and Google button still renders with `VITE_GOOGLE_CLIENT_ID`.

### File: `frontend/vercel.json`
Issue: Global `Cross-Origin-Embedder-Policy: require-corp` can break Google Identity Services iframe/popup behavior and cause Google login to get stuck around `accounts.google.com/gsi/transform`.
Fix: Changed COOP to `same-origin-allow-popups`, removed global COEP, and widened Google frame/script CSP safely for Google Identity Services.
Why safe: This targets browser security headers for login compatibility. Stockfish files still keep explicit resource headers. Chess/game logic is untouched.
How to test: Redeploy Vercel with clear cache, open login in Incognito, click Google login, and confirm it no longer gets stuck on `gsi/transform`.

## Tests run

```bash
npm install
npm run lint
npm run build
npm --workspace backend test
```

All passed after the patch.

## Required production env

### Vercel frontend
```env
VITE_BACKEND_URL=https://chessplay-b5ve.onrender.com
VITE_SOCKET_URL=https://chessplay-b5ve.onrender.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Do not set `VITE_GOOGLE_AUTH_URL` for this backend.

### Render backend
```env
FRONTEND_URL=https://getchessplay.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
ADMIN_EMAILS=devwithsunilyt@gmail.com
MONGODB_URI=your-mongodb-uri
JWT_SECRET=strong-secret
JWT_ACCESS_SECRET=strong-access-secret
JWT_REFRESH_SECRET=strong-refresh-secret
NODE_ENV=production
```

## Google Cloud Console

Authorized JavaScript origins:
```text
https://getchessplay.vercel.app
```

For this current GIS credential flow, a redirect URI is not used by the frontend. The backend verifies the ID token with Google.

## Manual QA checklist

1. Open `/login` or homepage and verify email/password login works.
2. Open Google login in Incognito and confirm account picker opens.
3. After Google login, confirm dashboard opens.
4. Login as admin and open `/admin`.
5. Confirm Admin Panel appears, not normal user dashboard.
6. Open `/admin/dashboard`, `/admin/supporters`, `/admin/automation` directly and refresh.
7. Login as normal user and confirm Admin Panel is hidden.
8. Open Play AI, Play Online, and Play vs Player to ensure chess features were not affected.
9. Test mobile width: sidebar opens/closes and admin page cards stack properly.

## Remaining notes

- If Google still fails, check browser console for the exact GIS error and confirm the Google OAuth client ID exactly matches the frontend env and backend `GOOGLE_CLIENT_ID`.
- If admin still shows restricted, run `node scripts/make-admin.js devwithsunilyt@gmail.com`, then logout and login again.
