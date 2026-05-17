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

## Render Backend

- Root Directory: `backend`
- Build Command: `corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm install --frozen-lockfile`
- Start Command: `pnpm start`

Required backend env vars:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_ORIGINS` or `FRONTEND_URL`

Payment env vars for live Razorpay:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
