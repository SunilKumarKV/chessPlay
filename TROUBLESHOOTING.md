# ChessPlay Troubleshooting & Diagnostics

## Purpose
This document provides solutions to common development errors, dependency issues, and system runtime failures encountered when running or deploying ChessPlay.

## Navigation
[README](README.md) • [FAQ.md](FAQ.md) • [SUPPORT.md](SUPPORT.md) • [docs/faq.md](docs/faq.md)

---

## Common Setup & Build Issues

### 1. Prisma Client Generation Failures
**Symptom**: `PrismaClientInitializationError: Prisma Client could not locate the Query Engine.`
- **Cause**: The Prisma engine binary was not generated for the current operating system architecture, or dependencies were installed without running the generate script.
- **Solution**: Execute the generate command within the backend workspace:
  ```bash
  pnpm --filter backend prisma:generate
  ```

### 2. Socket.IO Connection Loop Drops
**Symptom**: Client console logs show endless cycle of: `xhr poll error` or socket disconnection warnings.
- **Cause**: Typically occurs when the frontend client URL is not recognized by the backend CORS allowlist.
- **Solution**: Check the backend `.env` variables and verify `FRONTEND_ORIGINS` matches the frontend's origin exactly (no trailing slash).
  ```text
  FRONTEND_ORIGINS="http://localhost:5173"
  ```

### 3. Stockfish Subprocess Spawning Failures
**Symptom**: Backend logs show `spawn stockfish ENOENT` or game crashes when starting Play vs AI matches.
- **Cause**: The server system doesn't have the Stockfish binary path correctly configured, or lacks execution permissions.
- **Solution**: Verify the Stockfish package is correctly compiled or download a compatible binary for your OS. If using Linux/macOS, check permissions:
  ```bash
  chmod +x /path/to/stockfish/binary
  ```

---

## Examples

### 1. Verifying PostgreSQL Connection
Use the Prisma CLI to debug your database connection URL without firing up the Express server:
```bash
pnpm --filter backend exec prisma db pull
```

### 2. Checking Local Port Conflicts
If you receive `EADDRINUSE: address already in use :::5000`:
```bash
# Find and terminate the process holding port 5000
lsof -i :5000
kill -9 <PID>
```

---

## Notes
- > [!IMPORTANT]
  > When debugging payment webhooks, use the official Razorpay or Stripe CLI to tunnel webhooks locally rather than testing on public staging servers directly.
- > [!WARNING]
  > Never increase log verbosity levels in production config files, as it can result in sensitive user parameters leaking into raw server outputs.

---

## Best Practices
- **Clean Node Modules**: If packages get corrupted, run `pnpm store prune` followed by a fresh installation.
- **Check Environments**: Always maintain an up-to-date local `.env` modeled off of the committed `.env.example` templates.
- **Use Dev Tools**: Leverage Chrome DevTools' Network tab (specifically WS sub-tab) to inspect WebSocket frame details.

---

## References
- [Official FAQ](FAQ.md)
- [Deployment Configuration Guide](DEPLOYMENT.md)
- [Prisma Engine Schema Spec](backend/prisma/schema.prisma)
