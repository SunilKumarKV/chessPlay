# ChessPlay v1.2.0 Security Launch Upgrade

## Implemented

### Authentication security
- Added strict production email validation.
- Blocked demo/temp email domains.
- Added strong password validation.
- Upgraded bcrypt salt rounds to 12.
- Added access-token + refresh-token flow.
- Added HttpOnly cookies for access, refresh, and backward-compatible auth token.
- Added refresh token rotation storage with hashed refresh tokens.
- Removed frontend JWT bearer/localStorage token dependency.

### User trust flows
- Added email verification API foundation.
- Added resend verification endpoint.
- Added forgot-password endpoint.
- Added reset-password endpoint.
- Added delete-account endpoint with session revocation and anonymization.
- Added Privacy Policy page.
- Added Terms & Conditions page.
- Added Delete Account page.
- Added Forgot Password page.

### Backend/API protection
- Added cookie-parser.
- Added express-rate-limit global limiter.
- Added express-mongo-sanitize.
- Added hpp protection.
- Kept Helmet security headers.
- Kept CORS origin whitelist enforcement.
- Increased safe JSON limit to 20kb.
- Added profile text sanitization.

### Socket.IO security
- Socket auth now reads accessToken/authToken cookies or handshake auth.
- Socket JWT validates token type.
- Added max Socket.IO payload size.
- Added per-event socket rate limiting.
- Added safe socket payload size checks.
- Hardened room-code validation.
- Prevented same user from joining own room twice.
- Preserved server-side move validation only.

### Environment and launch readiness
- Updated backend .env.example with access/refresh secrets, cookie domain, SMTP, Sentry, and auth-domain controls.
- Updated frontend .env.example with backend/socket/Sentry URLs.

## Passed checks
- npm run lint
- npm run build
- npm --workspace backend test
- npm run test:production

## Still required before public launch
- Connect real SMTP provider in backend/utils/email.js.
- Add Sentry DSN values in frontend/backend env.
- Configure Cloudflare DNS, SSL Full Strict, WAF, and rate rules.
- Enable MongoDB Atlas automated backups.
- Rotate production secrets before first public release.
