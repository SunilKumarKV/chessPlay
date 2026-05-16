# Changelog

All notable ChessPlay production changes are documented here.

## v1.3.0 - Stable Production Release

### Release Status

- Stable production release prepared for public sharing.
- Final cleanup completed for release documentation, version naming, testing checklist, security notes, and deployment instructions.

### Fixed

- Stabilized production release naming from beta to `v1.3.0`.
- Added production-safe testing and release documentation.
- Improved deployment readiness for Render backend and Vercel frontend.
- Verified environment templates use placeholders only.
- Cleaned outdated duplicate release notes and temporary internal report files.

### Infrastructure

- GitHub Actions CI retained.
- pnpm workspace setup retained.
- MongoDB/Mongoose retained.
- Prisma generate workflow retained where configured.
- Socket.IO event names unchanged.

### Security

- `.env` files remain ignored.
- Production secrets must stay in GitHub Secrets, Vercel Environment Variables, and Render Environment Variables.
- Public showcase/docs must not include private backend, payment, auth, database, or admin logic.

### Known Notes

- Final validation should be performed on deployed production URLs before social sharing.
- Browser extension console warnings should be tested again in incognito mode with extensions disabled.
