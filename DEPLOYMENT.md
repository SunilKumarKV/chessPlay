# ChessPlay Deployment & Infrastructure Guide

## Purpose
This document provides hosting instructions, build commands, and environmental guidelines to deploy the ChessPlay client and server applications onto production hosting providers.

## Navigation
[README](README.md) • [docs/deployment.md](docs/deployment.md) • [ARCHITECTURE.md](ARCHITECTURE.md) • [SECURITY.md](SECURITY.md)

---

## Infrastructure Overview
ChessPlay is designed to deploy seamlessly onto serverless and containerized cloud providers:
- **Frontend App**: Deployed on **Vercel** as a static single-page application.
- **Backend App**: Deployed on **Render** (or Web Service platforms) as a persistent Node.js service (critical for Socket.IO connections).
- **Database**: Provisioned PostgreSQL instance (Supabase, Neon, or Render Postgres).

---

## Deployment Configuration

### 1. Frontend App (Vercel)
Configure your Vercel project with the following properties:
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `pnpm build`
- **Install Command**: `corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm install --frozen-lockfile`
- **Output Directory**: `dist`

### 2. Backend App (Render Web Service)
Configure your Render Web Service with the following properties:
- **Environment**: Node
- **Root Directory**: `backend`
- **Build Command**: `corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm install --frozen-lockfile && pnpm build`
- **Start Command**: `pnpm start`
- **Plan**: Starter or above (Requires persistent CPU for WebSocket clocks)

---

## Examples

### 1. Backend Environment Settings Setup
Configure these variables in your hosting provider's dashboard:
```bash
# PostgreSQL URL
DATABASE_URL="postgresql://db_user:db_password@db_host:5432/chessplay?schema=public"

# Cross-Origin Isolation (Required for Stockfish WASM SharedArrayBuffer)
COOP_HEADER="same-origin"
COEP_HEADER="require-corp"

# App Context
NODE_ENV="production"
```

### 2. vercel.json Custom Routing config
To handle React Router path routing on Vercel:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Notes
- > [!IMPORTANT]
  > Since WebSockets (Socket.IO) require a persistent TCP connection, you cannot deploy the ChessPlay backend onto Serverless Functions (like AWS Lambda or Vercel Functions). It must be run on a container or VM.
- > [!CAUTION]
  > Ensure that frontend and backend domains are correctly allowlisted in both the CORS options and the HTTP Cookie scopes.

---

## Best Practices
- **Use corepack**: Always lock down the pnpm version via corepack settings to prevent build pipeline inconsistencies.
- **Prisma Migrations**: Run `prisma migrate deploy` as a pre-deploy build step rather than at server startup to prevent migrations blocking HTTP traffic.
- **Configure Healthchecks**: Add healthcheck endpoint paths (`/api/health`) to Render settings to automate rollback on failure.

---

## References
- [Render Build Configuration Specification File](render.yaml)
- [Vercel Deployment Spec File](vercel.json)
- [Detailed Deployment Operations Guide](docs/deployment.md)
