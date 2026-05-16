# Render backend deployment fix

Use these Render settings:

- Root Directory: `backend`
- Build Command: `npm install --legacy-peer-deps && npm run build`
- Start Command: `npm start`
- Node Version / env var: `NODE_VERSION=20.20.2`

This backend compiles TypeScript/JS files into `dist/`, then starts `dist/server.js`.
The old error happened because Render ran `npm start` without running `npm run build`, so `dist/server.js` did not exist.
