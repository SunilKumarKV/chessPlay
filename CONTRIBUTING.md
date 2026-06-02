# Contributing to ChessPlay

Thank you for helping improve ChessPlay.

ChessPlay is treated as a production startup repository. Every contribution must protect users, repository integrity, secrets, deployment safety, and production stability.

## Contribution Rules

Before opening a pull request:

1. Create a dedicated branch.
2. Keep the change focused and small.
3. Do not commit `.env` files or real secrets.
4. Do not expose production URLs, database URLs, JWT secrets, payment keys, API keys, or OAuth secrets.
5. Do not weaken authentication, authorization, CORS, cookies, headers, GitHub Actions, or deployment settings.
6. Do not add dependencies without checking security and maintenance status.
7. Do not change production deployment configuration unless the change is explicitly required and reviewed.

## Required Local Checks

Run the following checks before requesting review:

```bash
git status
git branch
git log --oneline -10

gitleaks detect --source . --verbose
pnpm audit
pnpm outdated

find . -name ".env*" -type f
grep -R "DATABASE_URL\|JWT_SECRET\|API_KEY\|SECRET\|TOKEN\|PASSWORD\|RAZORPAY\|STRIPE\|GOOGLE_CLIENT_SECRET" . --exclude-dir=node_modules --exclude-dir=.git
```

Also run the project validation commands that apply to your change:

```bash
pnpm install --frozen-lockfile
pnpm -C backend typecheck
pnpm -C backend build
pnpm -C frontend lint
pnpm -C frontend build
```

## Security-Sensitive Areas

Extra review is required for changes touching:

- `.env.example`
- `.gitignore`
- `package.json`
- `pnpm-lock.yaml`
- `vercel.json`
- GitHub Actions workflows
- Prisma schema or migrations
- Backend auth/session files
- Backend config files
- Socket.IO files
- Payment files
- Deployment docs
- Logging and error handling
- Admin routes and permissions

## Pull Request Requirements

A pull request must include:

- Clear summary of the change
- Risk level
- Security checklist completion
- Validation commands run
- Screenshots or smoke-test notes when UI behavior changes
- Rollback notes for deployment or database changes

## Branch and Merge Rules

The `main` branch must remain protected.

Required expectations:

- Pull request required before merge
- Direct push blocked
- Required status checks enabled
- At least one reviewer required
- Force push disabled
- Branch deletion disabled
- Code owners reviewed for sensitive files

## Dependency Rules

Before adding or upgrading a dependency:

1. Check whether it is actively maintained.
2. Check known vulnerabilities.
3. Prefer small, trusted packages.
4. Avoid packages that request unnecessary permissions.
5. Re-run `pnpm audit` after dependency changes.

## Secret Handling

Never include real secret values in code, tests, markdown, screenshots, logs, GitHub comments, or issue reports.

Use placeholder values only, for example:

```txt
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_ACCESS_SECRET="replace-with-strong-secret"
RAZORPAY_KEY_SECRET="replace-with-secret"
```

If a secret is committed by mistake:

1. Stop the release.
2. Remove the secret from code.
3. Rotate the exposed secret.
4. Purge it from Git history if needed.
5. Re-run secret scanning.
6. Request security review before merge or deployment.

## Production Safety

Do not approve production release if:

- Secrets are exposed
- Authentication can be bypassed
- Database credentials are leaked
- Payment secrets are leaked
- GitHub Actions are unsafe
- Branch protection is missing
- CORS allows untrusted origins
- Production logs expose sensitive data
- Dependency vulnerabilities are unresolved

## Reporting Security Issues

Do not open public issues for vulnerabilities.

Use GitHub Private Vulnerability Reporting or a private security advisory. If that is unavailable, contact the repository owner privately and request a secure reporting path.
