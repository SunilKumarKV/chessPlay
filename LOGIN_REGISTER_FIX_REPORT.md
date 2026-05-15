# ChessPlay Login/Register Production Fix Report

Scope: Login and registration only. Chess rules, Stockfish logic, multiplayer logic, board UI, and gameplay reducers were not changed.

## Implemented items 1–24

1. Google login now uses Google Identity Services credential popup flow, not redirect flow.
2. Google credential is posted to backend verification through `POST /api/auth/google`.
3. Google One Tap prompt is not used.
4. Google button is loaded only from the official GIS script.
5. Google button displays a loading state while the script renders.
6. Facebook login button was removed from the visible Login/Register UI because Facebook OAuth is not production-wired.
7. Email form is visible by default; users no longer need to click “Continue with email”.
8. Login heading changed to `Sign in to ChessPlay`.
9. Register heading changed to `Create your ChessPlay account`.
10. User-facing text changed from `Premium secure access` to `Secure access`.
11. Email validation is shown before API calls.
12. Username validation added: 3–16 letters or numbers only.
13. Register password validation added: uppercase, lowercase, number, symbol, minimum 8 characters.
14. Confirm password field added for registration.
15. Password show/hide already existed and is preserved.
16. Submit spam is blocked while a request is already loading.
17. Buttons show production loading text: `Signing in...` / `Creating account...`.
18. Auth requests now use a centralized auth API helper built on the existing API client.
19. Auth requests continue to use cookie sessions with `credentials: include`.
20. JWT is not stored in `localStorage`; only the short-lived socket fallback token is stored in `sessionStorage`.
21. Forgot password is always visible on login.
22. Forgot password navigation now goes through an injected page navigation callback instead of hardcoding it inside the auth component.
23. Register success now records a backend `register_success` security event.
24. Mobile spacing and card width were improved for small screens.

## Changed files

### `frontend/src/features/auth/components/Auth.jsx`
Issue: Login/register UI had hidden email form, visible Facebook button, redirect-style social fallback, weak frontend validation, no confirm password, and older production text.
Fix: Rebuilt the auth component around email-first production UX, official Google GIS credential button, frontend validation, loading/success/error states, and forgot-password navigation callback.
Why safe: Only auth form UI and auth submission behavior changed. Gameplay logic was not touched.
How to test: Open login/register modal, submit invalid inputs, register a new user, login existing user, test Google button with valid Google client ID.

### `frontend/src/features/auth/services/authApi.js`
Issue: Auth API calls were duplicated directly inside UI component.
Fix: Added centralized login/register/google auth request helper using the existing `apiClient`.
Why safe: Keeps endpoint behavior the same and only wraps existing API calls.
How to test: Submit email login/register and Google login.

### `frontend/src/features/auth/services/authStorage.js`
Issue: Auth session persistence was duplicated in the UI component.
Fix: Added centralized session persistence that removes old persistent token and stores only user + short-lived socket fallback token.
Why safe: Preserves existing session behavior while avoiding persistent JWT storage.
How to test: Login and confirm app stays logged in after refresh.

### `frontend/src/services/apiClient.js`
Issue: Login/register invalid credentials could trigger unnecessary refresh attempts.
Fix: Added `skipAuthRefresh` support for auth endpoints.
Why safe: Existing API behavior remains unchanged unless a caller explicitly opts out.
How to test: Try wrong password and confirm only a clean auth error is shown.

### `frontend/src/pages/LandingPage.jsx`
Issue: Auth component had no clean way to navigate to forgot-password from modal.
Fix: Passed `onNavigatePath` to Auth and closes modal before navigating after successful login.
Why safe: Only affects auth modal navigation.
How to test: Open login modal → click Forgot password.

### `frontend/src/app/App.jsx`
Issue: Landing page needed a page navigation callback for forgot-password.
Fix: Passed a route callback into LandingPage.
Why safe: Navigation only; no gameplay logic changed.
How to test: Click Forgot password from login modal.

### `backend/models/SecurityEvent.js`
Issue: Backend could not store register success events.
Fix: Added `register_success` to allowed security event types.
Why safe: Additive enum value only.
How to test: Register a new account and inspect SecurityEvent collection.

### `backend/routes/auth.js`
Issue: Registration did not record a production security event and response message was generic.
Fix: Added `register_success` security event and improved success message.
Why safe: Registration still creates a user and session exactly as before.
How to test: Register new user and verify login state.

## Tests run

```bash
npm install --workspaces --include-workspace-root
npm run lint
npm run build
npm --workspace backend test
npm run test:production
npm audit --audit-level=moderate --workspaces --include-workspace-root
```

Result: all passed, 0 vulnerabilities found.

## Required production env

Frontend Vercel:
```env
VITE_BACKEND_URL=https://chessplay-b5ve.onrender.com
VITE_SOCKET_URL=https://chessplay-b5ve.onrender.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Backend Render:
```env
GOOGLE_CLIENT_ID=the-same-google-client-id.apps.googleusercontent.com
FRONTEND_ORIGINS=https://getchessplay.vercel.app
```

Google Cloud Console:
```text
Authorized JavaScript origins:
https://getchessplay.vercel.app
```

No browser redirect URI is needed for this Google Identity Services credential flow unless you add a separate redirect-based OAuth flow later.

## Manual QA checklist

- Login modal opens on desktop and mobile.
- Register modal opens on desktop and mobile.
- Email form is visible immediately.
- Invalid email shows validation.
- Weak password is blocked on register.
- Confirm password mismatch is blocked.
- Existing email returns a clean error.
- Wrong password returns a clean error.
- New user registration logs in successfully.
- Existing user login works.
- Google button renders when `VITE_GOOGLE_CLIENT_ID` is set.
- Google login creates/logs in the user.
- Forgot password link opens forgot password page.
- Refresh after login keeps the user session.

## Remaining notes

- Browser extension messages like `A listener indicated an asynchronous response...` and `runtime.lastError` are usually extension-side errors, not ChessPlay app errors.
- Google CSP/COOP must still be deployed from the already updated `frontend/vercel.json`.
