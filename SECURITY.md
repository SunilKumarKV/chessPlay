# ChessPlay Security Policy & Responsible Disclosure

## Purpose
This document establishes the platform's security boundaries, vulnerability disclosure workflow, secret management policies, and mandatory pre-release security validation checks to safeguard user data and project integrity.

## Navigation
[README](README.md) • [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) • [CONTRIBUTING.md](CONTRIBUTING.md) • [docs/security.md](docs/security.md)

---

## Supported Versions
Only the latest release versions are actively supported with security updates and patches.

| Version | Status |
| --- | --- |
| `v1.4.0-beta` | Active Development / Pre-release |
| `v1.3.x` | Maintenance & Security Patches Only |
| `< v1.3.0` | Unsupported (End of Life) |

---

## Reporting a Vulnerability
We take the security of ChessPlay seriously. If you find a vulnerability, do not open a public issue or discuss it in community chat rooms.

### Private Submission
1. **GitHub Advisory**: Submit via [GitHub Private Vulnerability Reporting](https://github.com/SunilKumarKV/chessPlay/security/advisories/new).
2. **Direct Contact**: If private vulnerability reporting is unavailable, email the maintainer team directly at `security@chessplay.xyz`.
3. **Response SLA**: The maintainer team will acknowledge your report within **24 hours** and provide a patch timeline within **7 days**.

---

## Mandated Secret Management

### Critical Secrets List
The following variables must **never** be committed to the repository in plain text:
- Database strings (`DATABASE_URL`, `DIRECT_URL`, `MONGODB_URI`)
- Cryptographic keys (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
- Payment credentials (`RAZORPAY_KEY_SECRET`, `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_SECRET`)
- Notification keys (`SMTP_PASS`, `TELEGRAM_BOT_TOKEN`)
- Deployment tokens (`VERCEL_TOKEN`, `GITHUB_TOKEN`)

---

## Required Security Verification Suite

Before merging any code changes or releasing a version, execute the following audit suite:

```bash
# 1. Run local credential scanning
gitleaks detect --source . --verbose

# 2. Audit Node package dependencies
pnpm audit

# 3. Check for raw unencrypted secret strings in files
grep -R "DATABASE_URL\|JWT_SECRET\|API_KEY\|SECRET\|TOKEN" . --exclude-dir={node_modules,.git,.github,dist}
```

---

## Examples

### 1. Secure Node.js Express Cookie Config
Always configure session cookies using maximum browser protections in production:
```typescript
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Only send over HTTPS
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

### 2. Environment Configuration Example
In your local environment, use the `.env` file (which is git-ignored) and never commit the actual file:
```bash
# Safe .env.example (Committed)
DATABASE_URL="postgresql://user:password@localhost:5432/chessplay"

# Dangerous .env (Git-ignored)
DATABASE_URL="postgresql://admin:super-secret-production-password@12.34.56.78:5432/live_db"
```

---

## Notes
- > [!IMPORTANT]
  > ChessPlay blocks force pushes to the `main` branch. All releases require double sign-off by the Security Team and Project Lead.
- > [!CAUTION]
  > Exposed keys or production databases will trigger immediate revocation of the compromised tokens and automated service shutdown.

---

## Best Practices
- **Least Privilege**: Grant repository tokens minimum read/write access.
- **Dependency Isolation**: Use Dependabot to automatically track and patch vulnerability alerts (CVEs).
- **Log Obfuscation**: Wrap user emails and passwords in logging sanitizers to avoid writing PII to files.

---

## References
- [Official security checklist](docs/security.md)
- [GitHub Security Advisories](https://github.com/SunilKumarKV/chessPlay/security/advisories)
- [CodeQL Config File](.github/workflows/codeql.yml)
