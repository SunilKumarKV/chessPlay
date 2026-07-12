# Release Management & Versioning

## Purpose
This document describes the process of planning, testing, versioning, and deploying new releases for the ChessPlay platform.

## Navigation
[README](../README.md) • [CHANGELOG.md](../CHANGELOG.md) • [deployment.md](deployment.md) • [testing.md](testing.md)

---

## Release Philosophy & SemVer

ChessPlay strictly adheres to **Semantic Versioning (SemVer)**:
- **PATCH** version bumps (e.g. `1.3.0` -> `1.3.1`) are reserved for bug fixes and security hotfixes that maintain full backward compatibility.
- **MINOR** version bumps (e.g. `1.3.0` -> `1.4.0`) introduce new backward-compatible features (like adding payment processors or puzzle theme levels).
- **MAJOR** version bumps (e.g. `1.0.0` -> `2.0.0`) are reserved for breaking API changes, major database restructures, or framework migrations.

---

## Release Gating Checklist

Before promoting any version from staging to production, the release coordinator must verify:
1. **Automated Passing**: The GitHub Actions CI pipeline must be fully green.
2. **Security Audit**: A local secret scanning run (`gitleaks`) has been executed and shows zero leaks.
3. **Manual Smoke Checks**: Core game loops, payment processing, and admin dashboard queries have been manually verified.
4. **Changelog Up-to-date**: Changes are documented in `CHANGELOG.md` under the Keep a Changelog standard.

---

## Examples

### 1. Tagging a New Release
Once the release is approved, tag the commit and push it to GitHub:
```bash
# 1. Update version across workspaces
pnpm version 1.4.0

# 2. Commit the changes
git add .
git commit -m "chore(release): v1.4.0"

# 3. Create the git tag
git tag -a v1.4.0 -m "Release version 1.4.0"

# 4. Push tag to GitHub (Triggers deployment workflow)
git push origin main --tags
```

### 2. Rollback Strategy
If a critical issue is discovered in production, the coordinator can rollback the deployment in Render:
1. Open the Render dashboard and navigate to the backend service.
2. Click **Rollback** on the previous stable commit hash (e.g., `v1.3.0`).
3. Vercel will automatically rollback the frontend if you revert the deployment version in the Vercel dashboard.

---

## Notes
- > [!IMPORTANT]
  > All release tags must be created on the `main` branch. Direct push to `main` is blocked, so tag creation requires a merged pull request.
- > [!WARNING]
  > Never deploy database schema migrations that are not backward compatible (e.g. deleting columns) while active server versions are still query-dependent on them.

---

## Best Practices
- **Use Release Drafts**: Maintain a draft release on GitHub to collect changelog items before tagging the final build.
- **Perform Staging Tests**: Deploy the release candidate (e.g. `-beta` tag) to a staging environment that mirrors production configurations.
- **Notify Users**: Post release announcements on official community channels and update the in-app help modal.

---

## References
- [Official CHANGELOG](../CHANGELOG.md)
- [Monorepo Release Checklist](../RELEASE_CHECKLIST.md)
- [Production Deployment Guide](deployment.md)
