# ♟️ ChessPlay

> Real-time multiplayer chess platform with React frontend, Express backend, Socket.IO updates, and Stockfish AI.

[![Build Status](https://img.shields.io/github/actions/workflow/status/SunilKumarKV/chessPlay/ci.yml?branch=main&style=flat-square)](https://github.com/SunilKumarKV/chessPlay/actions)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.4.0--beta-orange.svg?style=flat-square)](CHANGELOG.md)
[![Node Support](https://img.shields.io/badge/node-20.x-green.svg?style=flat-square)](package.json)
[![pnpm Version](https://img.shields.io/badge/pnpm-10.15.0-red.svg?style=flat-square)](package.json)
[![GitHub Stars](https://img.shields.io/github/stars/SunilKumarKV/chessPlay?style=flat-square)](https://github.com/SunilKumarKV/chessPlay/stargazers)
[![Issues](https://img.shields.io/github/issues/SunilKumarKV/chessPlay?style=flat-square)](https://github.com/SunilKumarKV/chessPlay/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![Code Coverage](https://img.shields.io/badge/coverage-84%25-brightgreen?style=flat-square)](TESTING.md)

## Purpose
ChessPlay provides a production-grade codebase for real-time multiplayer chess matchmaking, premium membership subscriptions, puzzle training, and Play vs AI logic in a robust pnpm monorepo.

## Navigation
[README](README.md) • [CONTRIBUTING.md](CONTRIBUTING.md) • [ROADMAP.md](ROADMAP.md) • [ARCHITECTURE.md](ARCHITECTURE.md) • [API.md](API.md) • [TESTING.md](TESTING.md) • [DEPLOYMENT.md](DEPLOYMENT.md) • [FAQ.md](FAQ.md)

---

## Demo
Experience ChessPlay live at: **[chessplay](https://getchessplay.vercel.app)**

---

## Preview Screenshots

### 2. Dashboard Chess Lobby
![Dashboard Chess Lobby](docs/screenshots/dashboard.png)

### 2. Multiplayer Chess Lobby
![Multiplayer Chess Lobby](docs/screenshots/multiplayer.png)

### 3. Puzzle Training Portal
![Puzzle Portal](docs/screenshots/play-vs-ai.png)

---

## Features
- **Real-Time Matches**: Socket.IO synchronization of board vectors, move validations, and timers.
- **Stockfish AI Integration**: Play vs AI with multiple difficulty levels (Easy, Medium, Hard).
- **Lichess Puzzle Pipeline**: Daily imported CC0 puzzles with hints, solutions, and success tracking.
- **Monetization Engine**: Free, Pro, and Premium tiers integrated with Razorpay.
- **Referral Campaigns**: Share unique invite codes and earn premium days automatically.
- **Analytics & Admin**: Full back-office dashboard tracking revenue metrics, active users, and conversions.

---

## Tech Stack

| Layer | Technologies | Role |
|---|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Zustand, Redux Toolkit, Framer Motion | User Interface & Client State |
| **Backend** | Node.js, Express, TypeScript, Socket.IO, Stockfish.js | Business Logic & WebSocket Server |
| **Database** | PostgreSQL, Prisma ORM, pg Client | Relational Database Layer |
| **Hosting** | Vercel (Frontend), Render (Backend), Neon/Supabase (Postgres) | Staging & Production Hosting |

---

## Folder Structure

```txt
.
├── .github/                # GitHub Issue/PR templates and workflow configs
├── backend/                # Express backend application (auth, payments, sockets)
│   ├── prisma/             # Schema definitions and migrations
│   ├── src/                # TypeScript server source code
│   └── tests/              # Backend unit and route tests
├── docs/                   # Deep-dive system documentation guides
├── frontend/               # React client application (Vite, Tailwind, Redux)
│   ├── src/                # Frontend source code (components, hooks, pages)
│   └── tests/              # Frontend unit tests
├── tests/                  # Monorepo E2E integration test suites
├── playwright.config.ts    # Playwright configuration settings
├── pnpm-workspace.yaml     # Monorepo workspaces definition
└── package.json            # Workspace script definitions
```

---

## Installation & Setup

### Prerequisites
- Node.js `20.x` or higher
- pnpm `10.15.0`
- PostgreSQL database instance

### Environment Variables
Configure your environment files based on the templates provided:
- Root: `.env.example`
- Backend: `backend/.env.example`
- Frontend: `frontend/.env.example`

Critical keys to define in `backend/.env`:
```text
DATABASE_URL="postgresql://user:password@localhost:5432/chessplay"
JWT_ACCESS_SECRET="your-strong-access-secret-key"
JWT_REFRESH_SECRET="your-strong-refresh-secret-key"
FRONTEND_ORIGINS="http://localhost:5173"
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_key_secret"
```

### Running Development Server
Install dependencies and spin up both frontend and backend concurrently:
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Generate database client files
pnpm --filter backend prisma:generate

# Start development servers
pnpm dev:multi
```
The frontend application will boot at `http://localhost:5173` and the backend will run at `http://localhost:5000`.

### Running Production Build
Build the source code for production release:
```bash
pnpm build
```

---

## Testing & Quality Gate
Run unit, integration, and end-to-end tests before pushing branches:
```bash
# Run Vitest suites for frontend and backend
pnpm test:frontend
pnpm test:backend

# Run Playwright E2E smoke tests
pnpm test:e2e
```
See [TESTING.md](TESTING.md) for detailed test strategies and coverage setups.

---

## Deployment
- **Frontend App**: Standard Vite deployment on Vercel. See [vercel.json](vercel.json).
- **Backend Service**: Deployed on Render. See [render.yaml](render.yaml).

For step-by-step guides, refer to [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Security & Reliability
We enforce security controls to defend user endpoints:
- **Helmet Headers & CSP**: Prevents script injections and clickjacking.
- **CORS Protection**: Allowlists frontend origins.
- **Rate Limiters**: Guards auth routes from dictionary attacks.
- **Secret Scanning**: Scans code with `gitleaks` pre-commit filters.

For disclosures, read [SECURITY.md](SECURITY.md).

---

## Performance Metrics
- **Core Web Vitals**: We optimize for an LCP under **2.5s** and INP under **200ms**.
- **WebGL Rendering**: High-performance chessboard renders to prevent CPU freezes.
- **Query Optimization**: PostgreSQL table indices prevent slow page loads during peak matchmaking.

---

## Roadmap
- **v1.x**: Stabilization, Razorpay integrations, puzzle quota counts.
- **v2.x**: Mobile apps (React Native), Redis WebSocket adapters, P2P WebRTC.
- **v3.x**: Automated AI anti-cheat checks, Swiss tournament brackets.

Explore full details in [ROADMAP.md](ROADMAP.md).

---

## Contributing
We welcome contributions! Please make sure you follow our commit conventions and testing checklists. Read our [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## Documentation Index
- **System Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md) • [docs/architecture.md](docs/architecture.md)
- **REST APIs**: [API.md](API.md) • [docs/api.md](docs/api.md)
- **Database Schema**: [docs/database.md](docs/database.md)
- **WebSocket Schema**: [docs/socket-events.md](docs/socket-events.md)
- **Frontend / Backend Development**: [docs/frontend.md](docs/frontend.md) • [docs/backend.md](docs/backend.md)
- **Authentication Lifecycle**: [docs/authentication.md](docs/authentication.md)
- **Troubleshooting FAQ**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md) • [FAQ.md](FAQ.md) • [docs/faq.md](docs/faq.md)
- **Release and Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md) • [docs/deployment.md](docs/deployment.md) • [docs/release-process.md](docs/release-process.md)

---

## FAQ
See our [FAQ.md](FAQ.md) for quick answers regarding licensing, performance, and integrations.

---

## License & Trademark Notice
This project is open-source under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. 

### Why AGPL-3.0?
Because ChessPlay is a real-time multiplayer application designed to run over network servers, standard copyleft licenses like the GPL can be bypassed by hosting the game as a cloud service without sharing modifications. The AGPL closes this loophole by requiring anyone hosting a modified version of ChessPlay to make their source code available to users over the network.

The ChessPlay name, logo, branding, and artwork are not licensed under AGPL.

---

## Acknowledgements
- [Lichess.org](https://lichess.org) for their open-source database of chess puzzles.
- [Stockfish Engine](https://stockfishchess.org) team for their chess analysis binary.
- [chess.js](https://github.com/jhlywa/chess.js) for board move verification libraries.
