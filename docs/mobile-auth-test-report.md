# Mobile Auth Test Report

Date: 2026-05-25

Local database:

```text
DATABASE_URL=postgresql://sunilkumarkv@localhost:5432/chessplay
```

The local `backend/.env` was updated for this test run only. `.env` is ignored and was not committed.

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `pnpm install` | PASS | Completed. Warned that local Node is `v25.9.0`; repo expects Node `20.x`. |
| `pnpm prisma generate --schema=backend/prisma/schema.prisma` | FAIL | Root workspace does not expose the `prisma` binary. |
| `pnpm prisma validate --schema=backend/prisma/schema.prisma` | FAIL | Root workspace does not expose the `prisma` binary. |
| `pnpm --filter backend exec prisma generate --schema=prisma/schema.prisma` | PASS | Generated Prisma Client. |
| `pnpm --filter backend exec prisma validate --schema=prisma/schema.prisma` | PASS | Schema is valid. |
| `pnpm build` | PASS | Backend and frontend production builds passed. |
| `pnpm --filter backend lint` | PASS | TypeScript backend lint/typecheck passed. |
| `pnpm --filter backend start` | PASS | Backend started on port `3001` and connected to PostgreSQL. |

## HTTP Endpoint Tests

Base URL:

```text
http://localhost:3001/api/auth
```

The HTTP test used a unique QA user and verified mobile auth first, then verified old web auth with the same user.

| Endpoint | Method | Result | Verification |
|---|---:|---|---|
| `/mobile/register` | POST | PASS | Returned `201`, `user`, `accessToken`, `refreshToken`, `socketToken`, `expiresIn: 900`. |
| `/mobile/login` | POST | PASS | Returned `200` and complete mobile token contract. |
| `/mobile/session` | GET | PASS | Bearer `accessToken` returned matching user. |
| `/mobile/refresh` | POST | PASS | JSON `refreshToken` returned rotated `accessToken`, `refreshToken`, `socketToken`, `expiresIn: 900`. |
| `/mobile/socket-token` | GET | PASS | Bearer `accessToken` returned `socketToken`. |
| `/mobile/logout` | POST | PASS | Bearer `accessToken` returned `{ "message": "Logged out" }`. |
| `/login` | POST | PASS | Existing web login worked for the same user and returned cookies. |
| `/session` | GET | PASS | Cookie-authenticated web session returned matching user. |
| `/refresh` | POST | PASS | HttpOnly-cookie refresh returned fresh web cookies. |
| `/logout` | POST | PASS | Existing web logout returned `{ "message": "Logged out" }`. |

## Fixes Made During QA

- The first live HTTP run caught a mobile login bug in `backend/routes/auth.js`: selecting `+refreshTokenHash` through the document-model shim hid `password`, causing `comparePassword` to fail. The mobile login query now loads the normal user document.
- The compiled backend mounts `authCore` before `auth`. To ensure active production startup uses the same Prisma user store for web and mobile auth, matching mobile endpoints were added to `backend/routes/authCore.js`.

## Lockfile Check

`pnpm-lock.yaml` changed because `pnpm install` aligned the lockfile with already-declared backend package metadata:

- `@types/express` aligned to `^4.17.25`
- `@types/node` aligned to `^20.19.25`
- backend type packages for `cookie-parser`, `hpp`, and `morgan` were recorded

This was not an application dependency change, but the lockfile was stale relative to `backend/package.json`, so the lockfile should be committed.

## Remaining Issues

- Local validation used Node `v25.9.0`; production target remains Node `20.x`.
- Root-level `pnpm prisma ...` is unavailable. Prisma commands must be run with `pnpm --filter backend exec prisma ...` unless a root script is added.
- `socketToken` is currently an access JWT by design because Socket.IO middleware accepts `type: "access"` in `handshake.auth.accessToken`. A dedicated `type: "socket"` token still requires a socket middleware change.
