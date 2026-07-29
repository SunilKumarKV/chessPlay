# Deployment & Operations Manual

## Purpose
This document provides hosting instructions, build commands, and environmental guidelines to deploy the ChessPlay client and server applications onto production hosting providers.

## Navigation
[README](../README.md) • [DEPLOYMENT.md](../DEPLOYMENT.md) • [architecture.md](architecture.md) • [release-process.md](release-process.md)

---

## Infrastructure Specifications

ChessPlay uses a distributed hosting strategy:
- **Client (React)**: Hosted on Vercel's global CDN network.
- **Server (Express/Socket.IO)**: Hosted on Render's managed compute server instances.
- **Database (Postgres)**: Provisioned on neon.tech or Supabase.

---

## Configuration & Environments

### 1. Environment Variable Catalog

#### Frontend Environment Settings
- `VITE_API_URL`: The absolute HTTPS address of the deployed Express server (e.g., `https://api.chessplay.xyz/api`).
- `VITE_SOCKET_URL`: The absolute address of the Socket.IO gateway (e.g., `https://api.chessplay.xyz`).
- `VITE_ANALYTICS_PROVIDER`: Plausible or Google Analytics provider strings.

#### Backend Environment Settings
- `DATABASE_URL`: Relational database path (including security keys).
- `JWT_ACCESS_SECRET`: 64-character signing key.
- `JWT_REFRESH_SECRET`: 64-character signing key.
- `FRONTEND_ORIGINS`: Commas-separated list of allowlisted domains (e.g., `https://chessplay.xyz,https://www.chessplay.xyz`).
- `RAZORPAY_WEBHOOK_SECRET`: Signing token to verify webhook payloads.

---

### 2. CI/CD Pipeline (GitHub Actions)
On every pull request or push to the `main` branch, our workflows run the verification gate:
- **Linting & Type-checking**: Compiles TS files to check syntax.
- **Unit Testing**: Fires Vitest suites.
- **E2E Testing**: Runs headless Playwright scripts.
- **Security Check**: Scans for keys using `gitleaks`.

---

## Examples

### 1. Production GitHub Actions Workflow Config
`.github/workflows/ci.yml`
```yaml
name: Continuous Integration
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 10.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Code Verification
        run: |
          pnpm --filter backend typecheck
          pnpm --filter frontend lint
          pnpm build
```

---

## Notes
- > [!IMPORTANT]
  > When scaling the backend, Socket.IO sessions must be shared across server nodes. Configure the `@socket.io/redis-adapter` and deploy a Redis instance to handle room state syncing.
- > [!WARNING]
  > Ensure that Postgres connection pooling is enabled (`?pgbouncer=true` parameter in your `DATABASE_URL`) when running on cloud databases.

---

## Best Practices
- **Automated Rollbacks**: Enable health-check endpoints in Render so deployments automatically rollback if the server fails to boot.
- **Zero-Downtime Migration**: When altering DB structures, write backward-compatible migration steps (e.g. add nullable columns first).
- **Optimize Assets**: Use Vercel's Edge CDN headers to cache logo graphics and sound files.

---

## References
- [Deployment High-Level Summary](../DEPLOYMENT.md)
- [Vercel Config JSON File](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/vercel.json)
- [Render Orchestration YAML File](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/render.yaml)
