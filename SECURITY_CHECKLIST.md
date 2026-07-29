# ChessPlay Security Checklist

Use this checklist before merging security-sensitive changes and before any production release.

## Merge Checklist

- [ ] Pull request uses the required PR template
- [ ] Change risk is marked Low, Medium, or High
- [ ] No `.env` files are committed
- [ ] No secrets, tokens, passwords, private keys, database URLs, or payment keys are committed
- [ ] Auth/session behavior reviewed if touched
- [ ] Database/Prisma migration reviewed if touched
- [ ] GitHub Actions or deployment changes reviewed if touched
- [ ] Logs do not expose sensitive user, auth, payment, or infrastructure data
- [ ] CI passes
- [ ] CodeQL has no unresolved blocking alerts
- [ ] Dependency audit has no unresolved High/Critical issues

## Release Checklist

- [ ] Private vulnerability reports are reviewed and triaged
- [ ] Critical and High vulnerabilities are fixed or release is blocked
- [ ] `gitleaks detect --source . --verbose` completed
- [ ] `pnpm audit --audit-level high` completed
- [ ] Branch protection verified for `main`
- [ ] Required status checks verified
- [ ] Code owner review verified for sensitive areas
- [ ] Production environment variables verified in hosting provider settings
- [ ] No production credentials are present in repository files or docs
- [ ] Deployment rollback plan confirmed
- [ ] Founder / CEO review completed
- [ ] PM review completed
- [ ] Final production approval completed

## Required Commands

```bash
git status
git branch
git log --oneline -10

gitleaks detect --source . --verbose
pnpm audit --audit-level high
pnpm outdated

find . -name ".env*" -type f
grep -R "DATABASE_URL\|JWT_SECRET\|API_KEY\|SECRET\|TOKEN\|PASSWORD\|RAZORPAY\|STRIPE\|GOOGLE_CLIENT_SECRET" . --exclude-dir=node_modules --exclude-dir=.git
```

## Release Decision

- Green: release can proceed after Founder / PM approval
- Yellow: release is risky and needs documented approval
- Red: release is blocked

If any secret is found in repository history, release is blocked until the secret is rotated and history exposure is handled.
