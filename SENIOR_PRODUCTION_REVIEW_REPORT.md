# ChessPlay Senior Production Review Report

Scope: React/Vite frontend, Node/Express backend, MongoDB models, auth/login/admin flow, JWT/session handling, protected routes, API endpoints, responsive UI basics, deployment configuration, production text, security headers, and build health.

I did not rewrite chess logic, move validation, multiplayer room logic, Stockfish logic, or game rules. Changes are limited to confirmed production/auth/security/deploy/SEO issues.

## Verification completed

- `npm install --workspaces --include-workspace-root` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm --workspace backend test` passed.
- `npm run test:production` passed after updating smoke assertions for the new safe session-token fallback.
- `npm audit --audit-level=moderate --workspaces --include-workspace-root` returned 0 vulnerabilities.
- Source scan for obvious `TODO`, `FIXME`, `dummy`, `lorem`, hardcoded test emails, `debugger`, and browser `alert()` in `frontend/src` and `backend` found no production-blocking leftovers.
- Lighthouse was attempted against local Vite preview using Chromium, but the container Chrome trace failed with `NO_NAVSTART`. Build output was still reviewed for bundle sizes. Main app chunk is about 324 KB raw / 83 KB gzip; Recharts is about 232 KB raw / 61 KB gzip, so lazy-loading analytics/chart pages remains a future performance improvement.

---

## Changes made

### 1. File: `frontend/src/services/apiClient.js`

Issue: Auth requests depended almost entirely on cross-site cookies. On Vercel frontend + Render backend, some browsers can block or fail cross-site cookie/session restoration, causing `/api/auth/profile`, `/api/auth/session`, or `/api/auth/refresh` to return 401 and push users back to login.

Fix: Added a short-lived `sessionStorage` access-token fallback as an `Authorization: Bearer ...` header while keeping `credentials: "include"` as the primary cookie path.

Why safe: It does not use persistent `localStorage` tokens. The fallback token already existed as `socketToken`/short-lived access token and is scoped to the current browser tab session. Cookie auth still remains the default.

How to test:
```bash
npm run lint
npm run build
```
Manual: log in, refresh dashboard, open DevTools Network, confirm authenticated API calls no longer loop 401 when cookies are flaky.

---

### 2. File: `backend/middleware/auth.js`

Issue: Protected backend routes only read cookies directly. If browser cross-site cookies fail, the frontend short-lived fallback token could not authenticate normal REST routes.

Fix: Switched auth middleware to the centralized `getRequestAccessToken(req)` helper, which supports `accessToken` cookie, old `authToken` cookie, and short-lived bearer fallback.

Why safe: JWT validation remains unchanged. Token type is still checked as `access`. No game logic or route business logic changed.

How to test:
```bash
npm --workspace backend test
npm run test:production
```
Manual: call a protected route with cookies, then test with `Authorization: Bearer <short-lived-token>`.

---

### 3. File: `frontend/src/layouts/DashboardLayout.jsx`

Issue: Sidebar user/admin state was captured once from `localStorage` at layout mount. After login, admin-only menu visibility could be stale, making admin pages look inaccessible until reload.

Fix: Replaced the static initial user state with the existing `useCurrentUser()` hook so layout reacts to login/logout/user updates.

Why safe: Only UI state sync changed. It does not alter auth validation or admin API permissions.

How to test: Log in as an admin account and confirm admin-only navigation appears without needing a hard refresh.

---

### 4. File: `frontend/src/app/App.jsx`

Issue: Admin-only pages could be manually reached from the frontend page switch even though backend endpoints were protected. This can confuse normal users and expose admin UI text.

Fix: Added frontend guards for `admin-supporters` and `automation`. Non-admin users now see a safe unavailable page instead of the admin UI.

Why safe: Backend admin protection already remains the real security boundary. This only improves UX and prevents accidental admin UI exposure.

How to test: Log in as a non-admin and attempt to navigate to admin pages from console/page state. It should not render admin queues.

---

### 5. File: `backend/routes/automation.js`

Issue: `/api/automation/status` was available to any authenticated user and returned redacted service configuration. Even redacted config should be admin-only.

Fix: Added `requireAdmin` middleware to `/status`.

Why safe: Support-ticket creation remains available to authenticated users. Only admin bot configuration/status is restricted.

How to test:
```bash
curl -i https://YOUR_BACKEND/api/automation/status
```
Expected: non-admin receives 403, admin receives status.

---

### 6. File: `frontend/src/config/runtime.js`

Issue: If `VITE_BACKEND_URL` is missing during a production Vercel build, the app falls back to `http://localhost:3001`, causing production API failures.

Fix: Added a production fallback to `https://chessplay-b5ve.onrender.com` while keeping localhost for development.

Why safe: Your current production backend is already that Render URL. Explicit Vercel env values still override this.

How to test: Temporarily remove `VITE_BACKEND_URL` locally, run `npm run build`, and inspect built output/API calls.

---

### 7. File: `vercel.json`

Issue: Root Vercel config used `outputDirectory: "dist"`, but root build command runs `cd frontend && npm run build`, which outputs `frontend/dist`. This can cause broken or stale Vercel deployments depending on project settings.

Fix: Changed output directory to `frontend/dist`.

Why safe: Matches the actual build output path from the existing root script. No application logic changed.

How to test: Deploy on Vercel from repo root with build command `npm run build`. Output directory should be `frontend/dist`.

---

### 8. File: `vercel.json`

Issue: Frontend had COOP/COEP headers for Stockfish but no explicit production CSP. You previously saw CSP/source-map style console noise. The app also needs a safer baseline for scripts, fonts, API, workers, and Google auth.

Fix: Added a frontend Content Security Policy allowing only self, Google Identity, Google fonts, the Render backend, websocket to Render, images from safe web/data/blob sources, and workers.

Why safe: Allows current app requirements without enabling unrestricted script execution. It may need one future update if you add a new analytics/CDN/payment provider.

How to test: Deploy and check DevTools Console for CSP violations. If adding a new service, add its domain to the relevant CSP directive.

---

### 9. File: `frontend/index.html`

Issue: Lighthouse/SEO basics were missing a meta description and canonical URL. The page title was also too generic.

Fix: Added production title, description, theme color, and canonical link.

Why safe: HTML metadata only. No app logic changed.

How to test: Run Lighthouse/SEO after deployment and inspect page source.

---

### 10. File: `TEST_PRODUCTION_SMOKE.js`

Issue: Existing smoke tests expected cookie-only auth and rejected all bearer-token support. That test became outdated after adding the safer short-lived session fallback required for Vercel + Render browser behavior.

Fix: Updated assertions to require centralized token reading, cookie backward compatibility, short-lived bearer fallback, and no persistent `localStorage` bearer token usage.

Why safe: Test update matches the actual production auth design and still prevents unsafe persistent token storage.

How to test:
```bash
npm run test:production
```

---

## Final changed files list

1. `frontend/src/services/apiClient.js`
2. `backend/middleware/auth.js`
3. `frontend/src/layouts/DashboardLayout.jsx`
4. `frontend/src/app/App.jsx`
5. `backend/routes/automation.js`
6. `frontend/src/config/runtime.js`
7. `vercel.json`
8. `frontend/index.html`
9. `TEST_PRODUCTION_SMOKE.js`
10. `SENIOR_PRODUCTION_REVIEW_REPORT.md`

## Local testing commands

```bash
npm install --workspaces --include-workspace-root
npm run lint
npm run build
npm --workspace backend test
npm run test:production
npm audit --audit-level=moderate --workspaces --include-workspace-root
```

For full local app testing:

```bash
# terminal 1
cd backend
cp .env.example .env
npm run dev

# terminal 2
cd frontend
cp .env.example .env
npm run dev
```

## Production deploy steps

### Render backend

1. Push this code to GitHub.
2. Render service root should be `backend` if configured as separate backend service.
3. Build command:
```bash
npm install
```
4. Start command:
```bash
npm start
```
5. Required env:
```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=your_mongodb_atlas_uri
JWT_ACCESS_SECRET=long_random_32_plus_chars
JWT_REFRESH_SECRET=different_long_random_32_plus_chars
FRONTEND_ORIGINS=https://getchessplay.vercel.app,https://getchessplay.com,https://www.getchessplay.com
ADMIN_EMAILS=devwithsunilyt@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email
SMTP_PASS=your_app_password
SUPPORT_EMAIL_TO=devwithsunilyt@gmail.com
```
6. Leave `COOKIE_DOMAIN` empty unless frontend and backend are on the same parent custom domain.
7. Open `/healthz` after deploy.

### Vercel frontend

1. Root directory: repo root.
2. Build command:
```bash
npm run build
```
3. Output directory:
```bash
frontend/dist
```
4. Required env:
```bash
VITE_BACKEND_URL=https://chessplay-b5ve.onrender.com
VITE_SOCKET_URL=https://chessplay-b5ve.onrender.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id_or_empty
VITE_GOOGLE_AUTH_URL=
VITE_FACEBOOK_AUTH_URL=
```
5. Redeploy without build cache once after changing env.

## Manual QA checklist

### Auth/admin

- Register with a real email and strong password.
- Login with `devwithsunilyt@gmail.com` after setting `ADMIN_EMAILS` on Render.
- Refresh dashboard after login; user should stay logged in.
- Close tab and reopen app; valid session should restore.
- Logout; protected calls should stop.
- Non-admin user should not see admin automation/supporter admin UI.
- Forgot password should show success message without leaking whether account exists.
- Reset-password email should use the production frontend URL.

### Gameplay

- Play vs AI: start, move, undo, hint, resign.
- Play local: both sides move normally.
- Multiplayer: create room, join from second browser, move, resign, reconnect.
- Promotion: confirm modal/auto-queen behavior still works.
- Check/checkmate/stalemate draw paths unchanged.

### UI/responsive

- Test 360px mobile width, 768px tablet, 1366px desktop.
- Sidebar opens/closes on mobile.
- Dashboard cards do not overflow horizontally.
- Chessboard fits viewport on mobile.
- Pricing/billing forms wrap correctly.
- Topbar menus are touch-friendly.

### Browser console/network

- No repeated 401 loop after login.
- No `/auth/google` GET 404. Google button should use `/api/auth/google` POST when configured.
- No CSP errors for app JS/CSS, Google Identity, Google fonts, backend API, or socket connection.
- No source map errors from third-party CDN styles.

### Production smoke

- Render `/healthz` returns `{ status: "ok" }`.
- Vercel deployment serves current hashed assets.
- API calls point to Render backend, not localhost.
- Socket connects to Render backend.

## Remaining issues / recommended next phase

1. Run real Lighthouse after deployment in Chrome DevTools. Local container Lighthouse could not complete because Chromium trace ended with `NO_NAVSTART`.
2. Consider lazy-loading heavy pages/components such as Recharts dashboards and billing analytics to reduce initial JS.
3. Add real provider SDK verification before enabling Stripe/PayPal webhooks for live money movement.
4. Add Playwright/Cypress E2E tests for login, admin page access, Play AI, multiplayer room create/join, and password reset.
5. Move backend to a custom API subdomain later, for example `api.getchessplay.com`, to improve cookie reliability and branding.
