# Browser Session Revocation Fix

Status: Required before production approval

## Problem

Browser access tokens now include `tokenVersion`, but the browser session routes must actively enforce that version.

Affected routes:

- `POST /api/auth/refresh`
- `GET /api/auth/session`
- `POST /api/auth/logout`

## Required Behavior

1. Refresh route must reject refresh tokens when token version does not match the current user record.
2. Session route must reject access tokens when token version does not match the current user record.
3. Logout route should clear the server-side refresh token state and increment token version when a valid refresh token is present.
4. Invalid or stale browser sessions must clear browser auth cookies.

## Release Decision

Until this is patched and verified:

- Security Verdict: Yellow
- Release Risk: Risky
- Founder / PM production approval should remain on hold

## Validation

After implementation:

```bash
pnpm -C backend typecheck
pnpm -C backend build
pnpm audit --audit-level high
```

Manual QA:

1. Login in browser.
2. Confirm `/api/auth/session` returns user.
3. Logout.
4. Confirm old access token no longer works.
5. Confirm old refresh token no longer works.
6. Confirm cookies are cleared.
