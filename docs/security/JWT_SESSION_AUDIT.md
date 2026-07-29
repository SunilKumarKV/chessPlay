# JWT and Session Audit

Status: Review completed

## Finding

Browser refresh/session handling should enforce the same token version/session revocation checks as mobile auth and Socket.IO auth.

## Required Code Fix

- `/api/auth/refresh` must reject refresh tokens when `decoded.tokenVersion` does not match the current user `tokenVersion`.
- `/api/auth/session` must reject stale access tokens when token version does not match the current user record.
- `/api/auth/logout` should clear refresh token state server-side when a valid refresh token is present.
- Socket.IO already validates token version and deleted users.
- Mobile auth already validates token version and refresh token hash.

## Release Impact

Release remains Yellow until browser session revocation is patched and verified.

## Validation

After patching:

```bash
pnpm -C backend typecheck
pnpm -C backend build
pnpm audit --audit-level high
```
