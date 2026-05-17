# Safety Notes

- No secrets should be committed or exposed in frontend code.
- Payment UI never claims live activation unless backend verification confirms it.
- Payment success/failure pages are informational and do not mutate subscription state.
- Admin pages depend on protected backend routes and show access errors safely.
- Premium UI falls back to Free if entitlement APIs fail.
- Feedback, pricing, puzzles, referrals, and legal pages handle empty or unavailable APIs without crashing.
- Legal pages and footer links are present for privacy, terms, refunds, cookies, and contact.

## v1.4.0-beta Production Hardening

- Helmet is enabled with worker/WASM-compatible CSP settings so Stockfish worker assets remain usable.
- CORS uses an environment allowlist from `CORS_ALLOWED_ORIGINS`, `FRONTEND_ORIGINS`, `CLIENT_URL`, and `FRONTEND_URL`; production rejects unknown browser origins.
- General API rate limits are enabled, with stricter route limits for auth, payment, puzzle submit, and puzzle hint flows.
- Auth routes keep brute-force protection and safe error messages for login/signup/password-sensitive actions.
- Payment create, verify, and webhook routes validate request shapes, verify Razorpay signatures, and store webhook event IDs to ignore replayed events.
- Request bodies, query strings, and params are sanitized against MongoDB `$` and `.` operator injection where applicable.
- New feedback, waitlist, payment, referral, and puzzle write endpoints use schema-style validation before business logic runs.
- JWT secrets are required in production, token expiry is configurable, and frontend code uses only `VITE_` public variables.
- Admin APIs require authenticated admin users; unauthenticated users receive `401`, non-admin users receive `403`.
- Socket.IO handshakes require valid auth for private user data and validate room joins/move payloads without changing multiplayer flow.
- Puzzle daily usage is tracked server-side for guests and users, puzzle submit/hint routes are rate-limited, and move input is validated.
- Referral and trial safeguards prevent self-referral, duplicate referral rewards, and repeated Pro trials on the same account.
- Safe logging redacts JWTs, passwords, payment signatures, Razorpay secrets, and MongoDB credentials before output.
- Sentry monitoring is optional. Missing `SENTRY_DSN` or missing SDK packages do not crash backend or frontend startup.
