# Security Checklist v1.4.0-beta

## Backend

- [x] Helmet security headers enabled with Stockfish worker/WASM compatibility.
- [x] Production CORS allowlist reads from environment variables.
- [x] General API rate limiting enabled.
- [x] Auth routes have stricter brute-force limits.
- [x] Payment routes have stricter rate limits.
- [x] Razorpay verify and webhook signatures are checked server-side.
- [x] Webhook event IDs are stored to prevent replay processing.
- [x] MongoDB operator injection sanitization is enabled.
- [x] Feedback, waitlist, payment, referral, and puzzle write routes validate input.
- [x] Production startup requires database, JWT, and frontend origin configuration.
- [x] Safe logger redacts tokens, passwords, signatures, secrets, and MongoDB credentials.
- [x] Optional Sentry monitoring does not crash when unset.

## Access Control

- [x] Admin APIs require auth plus admin role.
- [x] Non-admin requests receive `403`.
- [x] Unauthenticated admin requests receive `401`.
- [x] Socket.IO handshake validates auth tokens for private user identity.
- [x] Room joins and move payloads are validated before socket state changes.

## Monetization And Puzzle Abuse

- [x] Puzzle daily limits are enforced server-side for guests and users.
- [x] Puzzle hint/submit endpoints are rate-limited and validate move input.
- [x] Referral self-use is rejected.
- [x] Duplicate referral rewards are guarded by idempotent referral inserts.
- [x] Trial usage is stored on the user and cannot be restarted by downgrade.
- [x] Missing Razorpay keys produce safe API responses instead of crashes.

## Frontend

- [x] Frontend reads only `VITE_` environment variables.
- [x] Razorpay secret and webhook secret are backend-only.
- [x] Optional frontend monitoring uses only a public DSN and is safe when absent.
