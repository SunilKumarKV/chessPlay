# ChessPlay v1.3.0 Release Notes

ChessPlay v1.3.0 is the stable production release prepared for public sharing.

## Highlights

- Production-ready React/Vite frontend.
- Node.js/Express backend deployment support.
- MongoDB/Mongoose retained.
- Prisma generate workflow retained where configured.
- Socket.IO realtime multiplayer retained.
- Play vs AI runtime tuning retained.
- CI/CD workflow retained.
- Render and Vercel deployment instructions documented.
- Required production documentation completed.

## Production Documentation

- `README.md`
- `CHANGELOG.md`
- `SECURITY.md`
- `TESTING.md`
- `RELEASE_CHECKLIST.md`

## Known Notes

- Final smoke testing should be completed on deployed production URLs before public launch posts.
- Browser extension warnings should be verified in incognito mode with extensions disabled.
- Public showcase repositories must not expose private backend, auth, payment, admin, or database logic.

## Tag

```bash
git tag -a v1.3.0 -m "ChessPlay stable release v1.3.0"
git push origin v1.3.0
```
