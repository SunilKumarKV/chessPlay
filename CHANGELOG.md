# Changelog

## v1.4.0-beta.1 - Final Release Preparation

Phase 10 is focused on final release preparation only. No new features, UI redesigns, API response changes, MongoDB/Mongoose removal, or socket event name changes were introduced.

### Release Preparation

- Updated project version to `v1.4.0-beta.1`.
- Added final release notes, known issues, and rollback plan.
- Updated release checklist for final pre-merge and pre-tag verification.
- Confirmed `.env.example` files remain placeholder-only.
- Prepared safe public showcase and docs update templates.

### Bug Fixes

- Fixed the React Hooks lint warning in `TournamentsPage.jsx` by memoizing the existing `load` function with `useCallback` and using it in the effect dependency list.
- Updated root build script to run backend build first and frontend build second, so `pnpm build` verifies the complete app instead of only the frontend.

### Safety Notes

- Private backend, payment, auth, database, and admin implementation details must remain only in the private `chessPlay` repository.
- Public showcase/docs updates must contain feature summaries, screenshots, roadmap, and release notes only.
