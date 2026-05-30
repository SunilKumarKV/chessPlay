# ChessPlay Production Environment Checklist

Use this before every production deploy. Auth, deep links, and smoke tests depend on these values being correct.

## Vercel (frontend) — Project: `getchessplay.vercel.app`

| Variable | Required value | Notes |
|----------|----------------|-------|
| `VITE_BACKEND_URL` | `https://chessplay-b5ve.onrender.com` | Baked into build; wrong value breaks all API calls |
| `VITE_SOCKET_URL` | `https://chessplay-b5ve.onrender.com` | Same as backend unless using a dedicated socket host |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional; email login works without it |

**Vercel project settings**

- **Root Directory**: `frontend` (uses `frontend/vercel.json`) **OR** repo root (uses root `vercel.json`)
- **Build Command**: `pnpm build` (frontend root) or `pnpm --filter frontend build` (repo root)
- **Output Directory**: `dist` (frontend root) or `frontend/dist` (repo root)
- **Framework**: Vite

After deploy, verify:

```bash
curl -I https://getchessplay.vercel.app/login   # must be 200, not 404
curl -I https://getchessplay.vercel.app/        # must include X-Content-Type-Options: nosniff
```

## Render (backend) — Service: `chessplay-b5ve.onrender.com`

| Variable | Required value | Notes |
|----------|----------------|-------|
| `NODE_ENV` | `production` | **Critical.** Wrong value breaks rate limits and (without code fix) cross-origin cookies |
| `DATABASE_URL` | PostgreSQL connection string | Required for login/register |
| `JWT_ACCESS_SECRET` | 32+ char random string | Must match what was used to issue tokens |
| `JWT_REFRESH_SECRET` | 32+ char different random string | Must match what was used to issue tokens |
| `CORS_ALLOWED_ORIGINS` | `https://getchessplay.vercel.app,https://getchessplay.com,https://www.getchessplay.com` | Backend also hardcodes Vercel origin in code |
| `FRONTEND_ORIGINS` | `https://getchessplay.vercel.app` | Used for password-reset / verify-email links |
| `CLIENT_URL` | `https://getchessplay.vercel.app` | Same as above |
| `FRONTEND_URL` | `https://getchessplay.vercel.app` | Same as above |
| `COOKIE_DOMAIN` | *(leave empty)* | **Do not set** when API is on Render and frontend is on Vercel |
| `PORT` | `10000` or Render default | Render sets `PORT` automatically |

After deploy, verify:

```bash
curl -s -H "Origin: https://getchessplay.vercel.app" https://chessplay-b5ve.onrender.com/api/auth/session
# Expect: {"user":null} with access-control-allow-origin: https://getchessplay.vercel.app

curl -sI -X OPTIONS \
  -H "Origin: https://getchessplay.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://chessplay-b5ve.onrender.com/api/auth/login
# Expect: 204 with access-control-allow-credentials: true
```

## Manual browser verification

1. Open https://getchessplay.vercel.app
2. Log in with email/password
3. Dashboard should stay logged in (no immediate redirect to landing)
4. Hard refresh — session should restore (`/api/auth/session` returns user in Network tab)
5. No CORS or origin errors in console
6. Direct URL https://getchessplay.vercel.app/play loads the app (not Vercel 404)

## Common failure modes

| Symptom | Likely cause |
|---------|----------------|
| Login then immediate logout | Cross-origin cookies not sent (`NODE_ENV` not production, or `COOKIE_DOMAIN` mis-set) |
| CORS / origin errors | `CORS_ALLOWED_ORIGINS` missing Vercel URL on Render |
| `/api/*` 404 on Vercel domain | Frontend calling same-origin API; rebuild with `VITE_BACKEND_URL` |
| Deep links 404 | `vercel.json` rewrites not deployed; wrong Root Directory or stale deploy |
| Login 500 | `DATABASE_URL` missing or DB unreachable on Render |

## Smoke test

```bash
pnpm install
pnpm lint
pnpm -C backend typecheck
pnpm build
BASE_URL=https://getchessplay.vercel.app pnpm test:prod-smoke
```

Expected after fixes are deployed: 15/15 pass (including security headers and deep-link gate).
