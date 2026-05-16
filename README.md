# ChessPlay v1.3.0

ChessPlay is a production-focused chess platform with a React/Vite frontend and Node.js/Express backend. It supports local chess, Play vs AI, real-time multiplayer, authenticated user flows, profiles, game history, leaderboard, premium/referral pages, and production deployment configuration.

> This repository is the private production source repository. Do not copy private backend, payment, auth, database, admin, or secret-related logic into any public showcase repository.

## Tech Stack

- Frontend: React, Vite, JavaScript, Tailwind CSS
- Backend: Node.js, Express, Socket.IO
- Database: MongoDB/Mongoose retained, with Prisma client generation support where configured
- Realtime: Socket.IO
- Chess/AI: chess.js and Stockfish integration
- Deployment: Vercel frontend, Render backend
- CI: GitHub Actions with pnpm workspace checks

## Repository Structure

```txt
.
├── backend/              # Private backend, auth, API, Socket.IO, database logic
├── frontend/             # React frontend application
├── .github/workflows/    # CI workflow
├── pnpm-workspace.yaml   # Workspace config
├── TESTING.md            # Production testing guide
├── RELEASE_CHECKLIST.md  # Release checklist
├── CHANGELOG.md          # Version history
└── SECURITY.md           # Security policy
```

## Local Setup

```bash
pnpm install
pnpm --filter ./backend exec prisma generate
pnpm -C backend build
pnpm -C frontend lint
pnpm -C frontend build
pnpm build
```

Run frontend only:

```bash
pnpm -C frontend dev
```

Run backend only:

```bash
pnpm -C backend dev
```

Run both locally:

```bash
pnpm dev:multi
```

## Environment Variables

Use `.env.example`, `backend/.env.example`, and `frontend/.env.example` as templates. Never commit real `.env` files.

Required production variables usually include:

```txt
DATABASE_URL
MONGO_URI or MONGODB_URI
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
FRONTEND_ORIGINS
VITE_API_URL
VITE_SOCKET_URL
```

Optional integrations may include Redis, SMTP, Telegram, Cloudinary, and payment provider secrets. Store production values only in hosting provider environment variables or GitHub Secrets.

## Deployment

### Backend on Render

```txt
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm run start
Node: 20.x
```

### Frontend on Vercel

```txt
Root Directory: frontend
Build Command: pnpm build
Output Directory: dist
```

## Production Release

Current release:

```txt
v1.3.0
```

Before sharing the public link, complete `TESTING.md` and `RELEASE_CHECKLIST.md`.

## Public Showcase Rule

The public showcase repository should contain only safe screenshots, feature summaries, tech stack, demo link, and frontend showcase pages. Do not publish backend source, auth internals, payment logic, admin logic, database logic, API secrets, or environment values.
