# ChessPlay Security Policy

ChessPlay is a startup production repository. Security, privacy, repository integrity, and release safety must be reviewed before any production release.

## Supported Versions

| Version | Status |
| --- | --- |
| v1.4.0-beta | Active development / pre-release |
| v1.3.x | Maintenance only |

## Responsible Disclosure

Please report security vulnerabilities privately through GitHub Private Vulnerability Reporting / Security Advisories.

Do not open public issues, pull requests, or discussion threads that contain:

- Exploit details
- Proof-of-concept attack steps
- Production URLs with sensitive behavior
- Secret values
- User data
- Internal deployment details

If private vulnerability reporting is unavailable, contact the repository owner privately and request that it be enabled before sharing details.

## Release Security Gate

No production release is approved until all required reviews are complete.

Required release review order:

1. Security Checker review
2. Founder / CEO review
3. Product Manager review
4. Final production release approval

A release must be blocked if any of the following are true:

- A private security advisory is open and untriaged
- A Critical or High severity vulnerability is unresolved
- Secrets are found in the repository or Git history
- Authentication, database, payment, deployment, or GitHub Actions risks are unresolved
- Branch protection and required checks are not verified
- Production environment variables are not verified

## Secret Handling

Never commit real secrets or private configuration values. The following must remain private:

```txt
.env
.env.*
backend/.env
frontend/.env
DATABASE_URL
DIRECT_URL
MONGO_URI
MONGODB_URI
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_SECRET
SMTP_PASS
TELEGRAM_BOT_TOKEN
CLOUDINARY_API_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
PAYPAL_CLIENT_SECRET
PAYPAL_WEBHOOK_SECRET
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
PAYMENT_SIGNING_SECRET
ADMIN_EMAILS
GITHUB_TOKEN
VERCEL_TOKEN
```

Use only placeholder values in `.env.example` files.

## GitHub Secrets and Deployment Variables

Store CI/CD and deployment secrets only in GitHub Secrets or hosting provider environment settings.

Recommended GitHub / hosting secrets:

```txt
DATABASE_URL
DIRECT_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
REDIS_URL
VITE_API_URL
VITE_BACKEND_URL
VITE_SOCKET_URL
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
SENTRY_DSN
```

Do not hardcode secrets in:

- Source code
- README files
- Workflow files
- Frontend bundles
- Public screenshots
- Support/debug logs

## Required Security Checks Before Merge

Run these checks before merging security-sensitive changes:

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

## GitHub Repository Protection Requirements

The `main` branch must be protected with:

- Pull requests required before merge
- Direct push blocked
- Required status checks enabled
- At least one reviewer required
- Force push disabled
- Branch deletion disabled
- CodeQL enabled
- Dependabot enabled
- Secret scanning enabled where available
- GitHub Actions permissions restricted to least privilege

## Production Deployment Safety

Before production deployment, verify:

- Environment variables are configured only in hosting providers
- No `.env` file is committed
- No production database URL is exposed
- JWT secrets are strong and unique
- CORS origins are limited to approved production domains
- Cookies are `httpOnly`, secure in production, and scoped safely
- Payment webhook secrets are configured privately
- Logs do not expose tokens, passwords, cookies, emails beyond necessary operational metadata, or payment details

## Security Advisory Handling

When a private advisory is submitted:

1. Do not discuss the vulnerability publicly.
2. Do not merge unrelated risky PRs until triage is complete.
3. Assign severity: Critical, High, Medium, or Low.
4. Identify affected files, routes, services, and production impact.
5. Patch in a private branch if needed.
6. Re-run security checks.
7. Request Security Checker review.
8. Submit to Founder / CEO and PM for final release approval.

## Public Repository Safety

If this repository is ever made public again, do not expose:

- Backend source code
- Auth implementation details
- Admin dashboard logic
- Payment or premium backend logic
- Referral earning backend logic
- Database models, migration internals, or credentials
- Production API keys, tokens, or secrets

## Current Policy

ChessPlay is treated as a private startup production repository. Security review is mandatory before release.
