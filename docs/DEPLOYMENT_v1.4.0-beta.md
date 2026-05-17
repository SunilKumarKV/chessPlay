# Deployment v1.4.0-beta

## Vercel Frontend

- Root Directory: `frontend`
- Install Command: `corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Output Directory: `dist`

Required frontend env vars:

- `VITE_API_URL`
- `VITE_SOCKET_URL`
- `VITE_ANALYTICS_PROVIDER` optional
- `VITE_ANALYTICS_KEY` optional
- `VITE_RAZORPAY_KEY_ID` optional until live checkout
- `VITE_SENTRY_DSN` optional for frontend monitoring

## Render Backend

- Root Directory: `backend`
- Build Command: `corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm install --frozen-lockfile`
- Start Command: `pnpm start`

Required backend env vars:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_SECRET` only if legacy token helpers are used instead of the access/refresh secrets
- `CLIENT_URL`
- `FRONTEND_URL`
- `CORS_ALLOWED_ORIGINS` or `FRONTEND_ORIGINS`

Payment env vars for live Razorpay:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Optional monitoring env vars:

- `SENTRY_DSN`

Security deployment notes:

- Use Node `20.x` and pnpm `10.15.0`.
- Set `CORS_ALLOWED_ORIGINS` to the exact Vercel frontend URL and any intentional custom domains.
- Keep Razorpay secrets only on Render/backend. The frontend should receive only `VITE_RAZORPAY_KEY_ID`.
- Do not commit `.env`, `.env.local`, `.env.production`, `frontend/.env*`, or `backend/.env*`.
