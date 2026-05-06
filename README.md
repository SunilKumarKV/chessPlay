# ChessPlay

**Version 1.0.0**

ChessPlay is a production-focused chess platform built with React, Vite, Node.js, Express, Socket.IO, MongoDB, and Stockfish. It supports Play vs AI, real-time multiplayer, authenticated profiles, friends, notifications, game history, responsive settings, and production smoke checks.

## V1.0.0 Highlights

- Legal chess move handling with check, checkmate, stalemate, castling, en passant, repetition, 50-move draw, and promotion support.
- Play vs AI with Stockfish worker integration, hints, undo, resign, side selection, and time-control options.
- Real-time multiplayer rooms with server-side move validation, room state, resign handling, and game-end statistics.
- Authenticated dashboard with profile, game history, leaderboard, friends, messages, and notifications.
- Production-ready settings area for account, language, board, play behavior, notifications, privacy, theme, font, and security.
- Server-enforced privacy for profile visibility, game history visibility, and friend requests.
- Public friend discovery no longer exposes private email addresses.
- Production smoke test suite covering privacy regressions, promotion behavior wiring, Stockfish worker wiring, and backend chess status.

## Features

### Authentication And Security

- Email/password registration and login.
- JWT-based authenticated API routes.
- Password hashing with bcrypt.
- Password change endpoint.
- Profile update validation for username and email.
- Production guard against default JWT secrets.
- Helmet, CORS controls, and optional health-check secret.

### Chess

- Play vs AI with Stockfish.
- Real-time multiplayer through Socket.IO.
- Legal move highlighting and last-move highlighting.
- Drag-and-drop and click-to-move board interaction.
- Pawn promotion with non-queen choices when Auto queen is disabled.
- Resign, undo, hint, side choice, and timer options.
- Move history rendering with serializable Redux state.

### Social

- Search players by username.
- Send, accept, and decline friend requests.
- Friends tab in profile.
- Local fallback for friends while an older backend deployment is still running.
- Top-bar player search, messages, and notifications.

### Profile

- Overview, Games, Stats, and Friends tabs.
- Editable username, email, bio, avatar URL, and country.
- Rating, game counts, result stats, recent games, and friend/request views.
- Viewed profiles load the viewed user’s game history, with backend privacy enforcement.

### Settings

- Account: username, email, bio, avatar URL, country, and password change.
- Language: English, Hindi, Tamil, Telugu, Kannada, Malayalam, Spanish, and French.
- Board: board theme, piece set, coordinates, notation, and animation.
- Play: legal moves, last move, sounds, confirm moves, premoves, Auto queen, default timer, board orientation, and AI difficulty.
- Appearance: Light, Dark, Midnight, Tournament, and Newspaper modes.
- Fonts: Inter, Montserrat, System, JetBrains Mono, and Serif.
- Notifications and privacy preferences.

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, Redux Toolkit, Framer Motion, Recharts.
- Chess: chess.js on the frontend, custom authoritative backend chess utilities for multiplayer.
- AI: Stockfish web worker.
- Backend: Node.js, Express, Socket.IO, MongoDB, Mongoose.
- Auth: JWT and bcrypt.
- Quality: ESLint, production smoke tests, npm audit.

## Project Structure

```text
chessPlay/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── chessUtils.js
│   └── server.js
├── frontend/
│   ├── public/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── context/
│       ├── features/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       ├── store/
│       └── utils/
├── TEST_PRODUCTION_SMOKE.js
├── TEST_STOCKFISH.js
├── package.json
└── README.md
```

## Prerequisites

- Node.js 20 or newer recommended.
- npm.
- MongoDB local instance or MongoDB Atlas cluster.

## Environment Variables

Create `backend/.env`:

```bash
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/chessplay
JWT_SECRET=replace-with-a-long-random-production-secret
FRONTEND_URL=http://localhost:5173
# Optional:
HEALTH_SECRET=replace-with-health-check-secret
```

Create `frontend/.env` when needed:

```bash
VITE_BACKEND_URL=http://localhost:3001
# Optional OAuth redirect URLs:
VITE_GOOGLE_AUTH_URL=
VITE_FACEBOOK_AUTH_URL=
```

## Installation

```bash
git clone https://github.com/SunilKumarKV/chessPlay.git
cd chessPlay
npm run install:all
```

## Development

Run frontend only:

```bash
npm run dev
```

Run backend only:

```bash
npm run server
```

Run both frontend and backend:

```bash
npm run dev:multi
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health: `http://localhost:3001/health`

## Production Build

```bash
npm run build
cd backend
npm start
```

For hosted deployments:

- Deploy `frontend/dist` to Vercel, Netlify, or static hosting.
- Deploy `backend` to Render, Railway, Fly.io, or another Node.js host.
- Set `VITE_BACKEND_URL` to the deployed backend URL.
- Set `FRONTEND_URL` on the backend to the deployed frontend URL.
- Use a production MongoDB Atlas URI.
- Use a strong `JWT_SECRET`.

## Quality And Production Checks

Run the standard checks:

```bash
npm run lint
npm run build
npm run test:production
npm audit --omit=dev
```

`npm run test:production` runs:

- `TEST_PRODUCTION_SMOKE.js`
- `TEST_STOCKFISH.js`

The production smoke test checks:

- Public friend APIs do not expose private email fields.
- Backend privacy enforcement is wired.
- Viewed profiles request the viewed user’s game history.
- Settings save does not reset active game clocks.
- Promotion flow respects Auto queen.
- Backend chess utilities detect checkmate.
- Stockfish worker files and headers are wired.

Backend syntax check:

```bash
rg --files backend | rg '\.js$' | xargs -n 1 node -c
```

Temporary backend health smoke test:

```bash
cd backend
PORT=3011 MONGODB_URI=mongodb://127.0.0.1:27017/chessplay-smoke node server.js
curl http://127.0.0.1:3011/health
```

Expected response:

```json
{"status":"ok","rooms":0,"players":0}
```

## Important Production Notes

- Redeploy the backend after changes to friends, privacy, profile, or game history APIs.
- The frontend has local friends fallback only to keep the UI usable while an old backend is deployed. Real friend requests require the latest backend.
- Google/Facebook auth buttons require configured OAuth redirect URLs; otherwise the email flow remains the supported sign-in path.
- Keep `JWT_SECRET` and MongoDB credentials out of source control.

## API Overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `GET /api/auth/profile/:userId`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`
- `GET /api/auth/users/search?q=...`
- `GET /api/auth/friends`
- `POST /api/auth/friends/request`
- `POST /api/auth/friends/respond`

### Games

- `GET /api/games/history`
- `GET /api/games/history?userId=<id>`
- `POST /api/games/record`
- `GET /api/games/leaderboard`
- `GET /api/games/:gameId`

### Socket Events

Client to server:

- `createRoom`
- `joinRoom`
- `joinQueue`
- `leaveQueue`
- `makeMove`
- `resign`
- `getRooms`

Server to client:

- `roomCreated`
- `playerJoined`
- `moveMade`
- `gameOver`
- `playerLeft`
- `roomsList`
- `error`

## Release Status

V1.0.0 is the first production-ready release candidate. It includes the production blocker fixes for privacy, public data exposure, promotion behavior, settings side effects, viewed-profile history, and repeatable smoke checks.

## License

This project is open source and available under the MIT License.
