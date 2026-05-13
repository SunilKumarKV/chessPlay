# ChessPlay

ChessPlay is a full-stack chess app with a React/Vite frontend and an Express + Socket.IO backend. It supports authenticated play against Stockfish, live multiplayer rooms, quick matchmaking, spectators, chat, game history, leaderboards, profile privacy, and board/settings customization.

The app is intentionally split into a static frontend and a separate API/socket server. The frontend talks to the backend with an HttpOnly auth cookie, and the Stockfish worker is served from `frontend/public`.

## Stack

- Frontend: React 19, Vite, Redux Toolkit, Tailwind CSS, Framer Motion, Recharts.
- Chess: `chess.js` for the solo board, custom server-side move validation for multiplayer.
- Engine: Stockfish running in a web worker.
- Backend: Node.js, Express, Socket.IO, MongoDB, Mongoose.
- Auth: JWT stored in an HttpOnly cookie, bcrypt password hashing, optional Google Sign-In.

## Repository Layout

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
│       ├── features/chess/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       └── store/
├── TEST_PRODUCTION_SMOKE.js
├── TEST_STOCKFISH.js
└── package.json
```

## Setup

Use Node 20 or newer. MongoDB can be local or hosted.

```bash
npm run install:all
```

Create `backend/.env`:

```bash
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/chessplay
JWT_SECRET=replace-with-a-random-32-plus-character-secret
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
HEALTH_SECRET=
BLOCKED_WORDS=
GOOGLE_CLIENT_ID=
```

Create `frontend/.env` only when the defaults are not enough:

```bash
VITE_BACKEND_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_AUTH_URL=
VITE_FACEBOOK_AUTH_URL=
```

## Development

Run the frontend:

```bash
npm run dev
```

Run the backend:

```bash
npm run server
```

Run both:

```bash
npm run dev:multi
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- Public host health check: `http://localhost:3001/healthz`

## Quality Checks

```bash
npm run lint
npm run build
npm run test:production
```

`npm run test:production` runs the two repository smoke tests:

- `TEST_PRODUCTION_SMOKE.js`
- `TEST_STOCKFISH.js`

Those tests cover the privacy-sensitive API paths, auth cookie wiring, promotion behavior, Stockfish worker files, and backend chess status checks.

For a quick backend syntax pass:

```bash
find backend -path backend/node_modules -prune -o -name '*.js' -exec node -c {} \;
```

## Deployment Notes

- Deploy `frontend/dist` to a static host such as Vercel or Netlify.
- Deploy `backend` to a Node host such as Render, Railway, or Fly.io.
- Set `VITE_BACKEND_URL` in the frontend environment to the deployed backend URL.
- Set `VITE_SOCKET_URL` in the frontend environment to the deployed backend URL.
- Set `FRONTEND_ORIGINS` on the backend to the deployed frontend origin.
- Current production values: Vercel should use `VITE_BACKEND_URL=https://chessplay-b5ve.onrender.com` and `VITE_SOCKET_URL=https://chessplay-b5ve.onrender.com`; Render should use `FRONTEND_ORIGINS=https://getchessplay.vercel.app`.
- Use MongoDB Atlas or another production MongoDB instance.
- Use a real `JWT_SECRET` with at least 32 characters. The server refuses known placeholder secrets.
- Leave `COOKIE_DOMAIN` empty for Render + Vercel unless both services are behind a shared custom parent domain.
- In production, auth cookies are Secure and SameSite=None, so frontend-to-backend calls must use HTTPS.
- If Google Sign-In is enabled, configure the same client ID as `VITE_GOOGLE_CLIENT_ID` on the frontend and `GOOGLE_CLIENT_ID` on the backend.

## API Snapshot

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/auth/profile`
- `GET /api/auth/profile/:userId`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`
- `GET /api/auth/users/search?q=...`
- `GET /api/auth/friends`
- `POST /api/auth/friends/request`
- `POST /api/auth/friends/respond`

Games:

- `GET /api/games/history`
- `GET /api/games/history?userId=<id>`
- `POST /api/games/record`
- `GET /api/games/leaderboard`
- `GET /api/games/:gameId`

Socket events:

- Client emits: `createRoom`, `joinRoom`, `rejoinRoom`, `joinQueue`, `leaveQueue`, `makeMove`, `drawOffer`, `drawAccepted`, `drawDeclined`, `resign`, `sendMessage`, `spectateRoom`, `getRooms`.
- Server emits: `roomCreated`, `joinedRoom`, `rejoinedRoom`, `matchFound`, `moveMade`, `playerResigned`, `playerDisconnected`, `playerAbandoned`, `drawOffer`, `drawAccepted`, `drawDeclined`, `chatMessage`, `roomsList`, `serverError`.

## Production Safeguards

- Public user lookups do not expose email addresses.
- Profile visibility, game history visibility, and friend request privacy are enforced on the backend.
- Browser API calls use credentials and do not rely on localStorage bearer tokens.
- Chat messages are length-limited, lightly sanitized, optionally censored via `BLOCKED_WORDS`, and rate-limited per socket.
- Multiplayer rooms keep a short reconnection grace period before awarding abandonment wins.

## License

MIT
