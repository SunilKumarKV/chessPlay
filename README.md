# ChessPlay

**ChessPlay** is a production-focused SaaS chess platform built with React, Vite, Node.js, Express, Socket.IO, MongoDB, and Stockfish.

Current release: **v1.3.0-beta**

ChessPlay supports AI chess, real-time multiplayer, online matchmaking, same-WiFi style room play, game review, analysis, premium plans, supporter payments, ads logic, referrals, tournaments, community features, private/public messaging, profile customization, multilingual UI, and direct backend Telegram/email alerts.

---

## Live Product Goals

ChessPlay is designed as more than a demo project. The goal is to become a real web chess platform with:

- Stable authenticated gameplay.
- Play vs AI with multiple engine levels.
- Real-time multiplayer rooms.
- Online matchmaking.
- Premium supporter plans.
- No-ads premium mode.
- Community and social engagement.
- Admin-friendly monetization workflows.
- Production-ready deployment on Vercel + Render/Railway/Fly.

---

## Tech Stack

### Frontend

- React
- Vite
- Redux Toolkit
- Tailwind CSS
- Framer Motion
- Recharts
- Socket.IO Client
- Stockfish worker integration

### Backend

- Node.js
- Express
- Socket.IO
- MongoDB
- Mongoose
- JWT authentication
- bcrypt password hashing
- Google OAuth verification foundation
- Direct Telegram/email alert integrations

### Chess / Engine

- `chess.js`
- Stockfish web worker
- Server-side multiplayer validation
- Analysis/review board foundation

---

## v1.3.0-beta Highlights

### Authentication

- Email/password login.
- Google login production setup.
- Frontend `VITE_GOOGLE_CLIENT_ID` support.
- Backend Google token verification support.
- Domain whitelist support for localhost, Vercel, and custom domain.
- Safer production auth cookie guidance.

### Multiplayer

- Socket.IO auth improvements.
- Invalid-token retry messaging.
- WebSocket/polling fallback guidance.
- Multiplayer reconnect UX.
- Same-WiFi/room-code play foundation.

### Play vs AI

AI modes:

| Mode | Depth | Skill |
|---|---:|---:|
| Easy | 4 | 5 |
| Medium | 8 | 10 |
| Hard | 14 | 18 |
| Pro | 20 | 20 |

Also includes:

- Engine depth indicator.
- Eval label.
- Move quality labels.
- Premium engine-depth foundation.

### Product Features

- Premium login/signup UI.
- Dashboard upgrade popup.
- Pricing/support flow.
- Online matchmaking UI.
- Win/checkmate/draw result popup.
- Help center: “How ChessPlay Works”.

### Monetization

- UPI supporter/payment flow.
- Bank transfer foundation.
- QR scan payment option.
- PayPal/Stripe foundation.
- Manual payment approval fallback.
- Admin approval logs.
- Ads enabled for free users.
- Ads disabled for premium users.
- Premium unlock logic.
- Referral coins.
- Tournament entry-fee foundation.

### Social

- Community page.
- Posts.
- Chess puzzles.
- Discussions.
- Achievements.
- Tournaments.
- Private friend chat foundation.
- Public community rooms.
- Block/report/mute.
- Typing indicator.
- Online status.

### Settings/Profile

- Profile photo upload foundation.
- Crop image support.
- Avatar fallback.
- Cloudinary-ready config.
- i18n language support.
- Dark/light mode.
- Board themes.
- Font family.
- Font size.
- Accent color.
- Text color.
- Professional SaaS settings layout.

### Automation / Alerts

n8n was removed from the required path.

Direct backend supports:

- Telegram admin alerts.
- Email alerts.
- Payment submitted alerts.
- Payment approved/rejected alerts.
- Support ticket alerts.
- Refund request alerts.
- FAQ/question alerts.

WhatsApp can be added later using Twilio or Meta WhatsApp Cloud API.

---

## Project Structure

```text
chessPlay/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── chessUtils.js
│   ├── gameState.js
│   └── server.js
├── frontend/
│   ├── public/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       └── store/
├── automation/
│   └── direct-node/
├── PRODUCTION_TEST_REPORT.md
├── UPGRADE_REPORT_v1.3.0-beta.md
├── TEST_PRODUCTION_SMOKE.js
├── TEST_STOCKFISH.js
└── package.json
```

---

## Local Setup

Use Node.js 20 or newer.

```bash
npm run install:all
```

Create `backend/.env`:

```bash
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/chessplay
JWT_SECRET=replace-with-a-real-32-plus-character-secret
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
GOOGLE_CLIENT_ID=
COOKIE_DOMAIN=

TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
SUPPORT_EMAIL_TO=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

STRIPE_SECRET_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

Create `frontend/.env`:

```bash
VITE_BACKEND_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=
VITE_APP_VERSION=1.3.0-beta
```

---

## Development Commands

Run frontend:

```bash
npm run dev
```

Run backend:

```bash
npm run server
```

Run both:

```bash
npm run dev:multi
```

---

## Quality Checks

Before pushing/deploying:

```bash
npm run lint
npm run build
npm run test:production
npm --workspace backend test
```

Backend syntax check:

```bash
find backend -path backend/node_modules -prune -o -name '*.js' -exec node -c {} \;
```

---

## Production Deployment

### Frontend — Vercel

Set:

```bash
VITE_BACKEND_URL=https://your-backend.onrender.com
VITE_SOCKET_URL=https://your-backend.onrender.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_APP_VERSION=1.3.0-beta
```

### Backend — Render/Railway/Fly

Set:

```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=your-mongodb-atlas-uri
JWT_SECRET=your-real-32-plus-character-secret
FRONTEND_ORIGINS=https://getchessplay.com,https://www.getchessplay.com,https://your-vercel-domain.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
COOKIE_DOMAIN=
```

Optional alert/payment/profile services:

```bash
TELEGRAM_BOT_TOKEN=your-token
TELEGRAM_ADMIN_CHAT_ID=your-chat-id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SUPPORT_EMAIL_TO=support@getchessplay.com
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
STRIPE_SECRET_KEY=your-stripe-key
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
```

Deployment order:

1. Deploy backend first.
2. Verify `/health` and `/healthz`.
3. Deploy frontend.
4. Test login, Google login, multiplayer, AI, payment proof, and alerts.
5. Create GitHub release tag `v1.3.0-beta`.

---

## Important Security Rules

- Do not commit `.env` files.
- Use HTTPS in production.
- Use strong JWT secrets.
- Restrict `FRONTEND_ORIGINS` to trusted domains only.
- Validate real payment webhooks before auto-activating premium plans.
- Keep manual admin payment approval until payment providers are fully tested.
- Rotate leaked secrets immediately.

---

## Git Release

Recommended commit message:

```bash
git add .
git commit -m "release: upgrade ChessPlay to v1.3.0-beta production SaaS build"
git tag -a v1.3.0-beta -m "ChessPlay v1.3.0-beta"
git push origin main
git push origin v1.3.0-beta
```

---

## Release Reports

Read these before deployment:

- `PRODUCTION_TEST_REPORT.md`
- `UPGRADE_REPORT_v1.3.0-beta.md`

---

## License

Private/portfolio production project unless you choose to open-source it.


---

## CI/CD

This project uses GitHub Actions for production-safe validation.

### Workflow

The CI workflow is located at:

```txt
.github/workflows/ci.yml
```

It runs on:

- Pull requests
- Pushes to `main`

CI checks:

- `pnpm install --frozen-lockfile`
- Backend Prisma client generation
- Frontend lint when a lint script exists
- Backend lint when a lint script exists
- Backend build
- Frontend build

### Required GitHub Secrets

Add these in GitHub:

```txt
Settings → Secrets and variables → Actions → New repository secret
```

Required secrets:

```txt
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
MONGO_URI
REDIS_URL
VITE_API_URL
VITE_SOCKET_URL
```

Do not hardcode secrets in source code. Keep real production values only in GitHub Secrets and hosting provider environment settings.

### Local CI Test Commands

Run these before opening or merging a pull request:

```bash
pnpm install
pnpm --filter chessplay-backend exec prisma generate
pnpm -C backend build
pnpm -C frontend build
```

Optional when lint scripts exist:

```bash
pnpm -C frontend lint
pnpm -C backend lint
```

### Deployment

Automatic deployment is not enabled in Phase 9. Deploy from your hosting providers only after CI passes and the release checklist is complete.
