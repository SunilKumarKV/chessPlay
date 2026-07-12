# Developer Guidelines & Advanced Setup

## Purpose
This document provides advanced instructions for developers setting up ChessPlay locally, detailing monorepo management, build sequences, validation suites, and git workflow protocols.

## Navigation
[README](../README.md) • [CONTRIBUTING.md](../CONTRIBUTING.md) • [STYLE_GUIDE.md](../STYLE_GUIDE.md) • [architecture.md](architecture.md)

---

## Workspace Setup

ChessPlay is managed as a **pnpm monorepo**:
```txt
Root workspace
├── backend/   # Nesting package (Express App)
└── frontend/  # Nesting package (React App)
```

To initialize your development environment:
1. Ensure Node.js `20.x` and pnpm `10.15.0` are installed.
2. Clone the repository and run:
   ```bash
   pnpm install --frozen-lockfile
   ```
3. Set up the local environment variables in `backend/.env` and `frontend/.env`.

---

## Git Workflow Protocols

### 1. Branch Naming Conventions
Always create a descriptive branch from the latest `main`:
- `feature/your-feature-name`
- `bugfix/your-bugfix-name`
- `docs/your-docs-update-name`

### 2. Commit Message Formats
We strictly enforce **Conventional Commits**:
- `feat(frontend): add wooden board style selection`
- `fix(backend): validate stockfish moves boundary checks`
- `docs(readme): rewrite deployment steps`

---

## Examples

### 1. Initializing and Seeding Local Database
Initialize Prisma migrations and seed the database with premium plan profiles:
```bash
# Generate Prisma Client
pnpm --filter backend prisma:generate

# Run DB migrations
pnpm --filter backend prisma:migrate:dev

# Seed premium plans
pnpm --filter backend prisma:seed
```

### 2. Pre-Commit Verification Steps
Before pushing commits to GitHub, run the validation check suite:
```bash
# Check code syntax and type safety
pnpm --filter frontend lint
pnpm --filter backend typecheck

# Run testing suites
pnpm test:frontend
pnpm test:backend
pnpm test:e2e
```

---

## Notes
- > [!IMPORTANT]
  > Never commit a `.env` file or real secrets to the repository. The `.gitignore` files are pre-configured to block them.
- > [!WARNING]
  > Do not upgrade dependencies without running `pnpm audit` first to verify that the library doesn't introduce vulnerabilities.

---

## Best Practices
- **Atomic Commits**: Keep commits focused and logically grouped.
- **Run Tests Early**: Run Vitest and Playwright test suites locally before submitting pull requests.
- **Write Tests**: Include corresponding tests when introducing new routes or UI flows.

---

## References
- [General Contributor Guidelines](../CONTRIBUTING.md)
- [Coding Styles and Standards](../STYLE_GUIDE.md)
- [Prisma DB Setup Guide](database.md)
