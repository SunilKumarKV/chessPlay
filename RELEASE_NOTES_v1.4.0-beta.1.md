# ChessPlay v1.4.0-beta.1 Release Notes

## Release Type

Beta release candidate for production validation.

## Summary

This release prepares ChessPlay for safer production release testing. It focuses on final checks, CI/CD readiness, release documentation, public showcase/docs preparation, and one release-blocking lint fix.

## What Changed

- Finalized release checklist for production validation.
- Added rollback plan and post-deployment smoke checks.
- Added safe public showcase/docs update instructions.
- Updated version to `v1.4.0-beta.1`.
- Fixed one React Hooks lint warning in the tournaments billing page.
- Updated root `pnpm build` to verify both backend and frontend builds.

## No Feature Changes

This release does not add new features, redesign UI, change API response formats, remove MongoDB/Mongoose, or change socket event names.

## Known Issues

- Real payment providers still require production credentials and provider-side verification before public rollout.
- Redis-based production caching/queue behavior depends on a valid `REDIS_URL`.
- Advanced provider integrations such as SMTP, Telegram, Cloudinary, Stripe/PayPal, and Google OAuth require real production secrets configured only in the hosting dashboard.
- Full end-to-end multiplayer testing must be performed against the deployed backend/socket URL before tagging stable release.

## Required Final Checks

```bash
pnpm install
pnpm --filter chessplay-backend exec prisma generate
pnpm build
pnpm lint
pnpm test
```

## Rollback Plan

If production deployment fails:

1. Revert the deployment in the hosting dashboard to the previous successful build.
2. Disable new beta release announcements until smoke tests pass.
3. Re-check backend health, frontend environment variables, socket URL, MongoDB connection, and payment/auth provider secrets.
4. If needed, revert the release commit:

```bash
git revert <release-commit-sha>
git push origin main
```

5. If a tag was already pushed and must be removed:

```bash
git tag -d v1.4.0-beta.1
git push origin :refs/tags/v1.4.0-beta.1
```
