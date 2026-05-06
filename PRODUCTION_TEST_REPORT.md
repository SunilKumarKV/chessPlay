# ChessPlay V1.0.0 Production Test Report

**Date:** May 6, 2026  
**Status:** V1.0.0 production-ready release candidate

## Summary

ChessPlay V1.0.0 has passed the current repository production checks. The last review blockers were fixed:

- Public friend/search APIs no longer expose private email addresses.
- Backend privacy enforcement is wired for profile visibility, game history, and friend requests.
- Pawn promotion supports non-queen choices when Auto queen is disabled.
- Saving settings no longer resets active game clocks.
- Viewed profiles request the viewed user's game history.
- A repeatable production smoke test script was added.

## Verification Commands

```bash
npm run lint
npm run build
npm run test:production
rg --files backend | rg '\.js$' | xargs -n 1 node -c
npm audit --omit=dev
```

## Results

| Check | Result |
| --- | --- |
| Frontend lint | Passed |
| Frontend production build | Passed |
| Production smoke tests | Passed |
| Stockfish worker verification | Passed |
| Backend JS syntax checks | Passed |
| npm production audit | Passed, 0 vulnerabilities |
| Frontend local dev server reachability | Passed |
| Backend temporary health smoke test | Passed |

## Backend Health Smoke Test

The backend was started on a temporary port with a test Mongo URI:

```bash
cd backend
PORT=3011 MONGODB_URI=mongodb://127.0.0.1:27017/chessplay-smoke node server.js
curl http://127.0.0.1:3011/health
```

Expected response:

```json
{"status":"ok","rooms":0,"players":0}
```

## Production Notes

- Deploy the latest backend before relying on friends, privacy, profile, or viewed-profile game history in production.
- Configure production `JWT_SECRET`, `MONGODB_URI`, and `FRONTEND_URL`.
- Google/Facebook auth buttons require OAuth redirect URL configuration; email sign-in is the supported default path.
- Continue to run `npm run test:production` before future releases.
