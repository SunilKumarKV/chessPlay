# Contributing to ChessPlay

## Purpose
This document provides developer guidelines for local environment setup, branching strategies, coding conventions, testing requirements, and submission procedures for contributing code and documentation to ChessPlay.

## Navigation
[README](README.md) • [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) • [STYLE_GUIDE.md](STYLE_GUIDE.md) • [SECURITY.md](SECURITY.md) • [SUPPORT.md](SUPPORT.md)

---

## Welcome to ChessPlay Contributions!
We are excited that you want to help make ChessPlay the best open-source real-time chess platform. As an active maintainer, reviewer, or developer, you are expected to follow these guidelines to keep the codebase secure, readable, and highly maintainable.

---

## Development Workflow

### 1. Branch Naming Conventions
Always create a new branch for your work. Never push commits directly to the `main` branch.
- **Features**: `feature/slug-name` (e.g., `feature/matchmaking-queues`)
- **Bug Fixes**: `bugfix/slug-name` (e.g., `bugfix/socket-leak-fix`)
- **Documentation**: `docs/slug-name` (e.g., `docs/api-overhaul`)
- **Refactoring**: `refactor/slug-name` (e.g., `refactor/jwt-verification-cleanup`)
- **Performance**: `perf/slug-name` (e.g., `perf/lighthouse-audit-fixes`)

### 2. Commit Message Rules
We strictly enforce the **Conventional Commits** specification. Commit messages must be formatted as:
```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```
Supported types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code (formatting, white-space)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

---

## Required Local Checks

Before requesting reviews on a Pull Request, you must run the local verification suite:

### Security Auditing & Secret Scanning
```bash
# Detect accidental credentials in the repository
gitleaks detect --source . --verbose

# Run package audits
pnpm audit

# List outdated packages
pnpm outdated
```

### Static Analysis and Build
Ensure both the React frontend and Express backend type-check and compile successfully:
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Generate Prisma Client
pnpm --filter backend prisma:generate

# Build both applications
pnpm build
```

---

## Pull Request Requirements

When submitting a Pull Request (PR):
1. **Scope**: Keep PRs focused on a single issue. Avoid massive "catch-all" changes.
2. **Template**: Fill out the [PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) completely.
3. **Tests**: Include automated unit or integration tests for any new logic.
4. **Secrets**: Verify that NO production endpoints, database credentials, or API keys are written in code or test configs.

---

## Examples

### 1. Standard Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b feature/board-theme-customizer
```

### 2. Conventional Commit Example
```text
feat(frontend): add dark-mode wood board theme

Introduces wood-patterned board texture option for the game viewer interface,
controlled via user settings storage.

Closes #142
```

---

## Notes
- > [!IMPORTANT]
  > ChessPlay is treated as a high-security repository. Direct push to `main` is completely blocked.
- > [!WARNING]
  > Committing private API keys, database credentials, or real `.env` variables to public commits will result in immediate PR closure and token revocation. Use sample configs instead.

---

## Best Practices
- **Write Focused Commits**: Commit early and often with small, atomic logical changes.
- **Maintain Test Integrity**: Ensure you run unit and E2E tests before checking in code changes.
- **Document Code**: Write clear JSDoc and TypeScript annotations for new routes, services, and hooks.
- **Review Peers**: Take part in reviewing other contributors' PRs to understand new updates and share knowledge.

---

## References
- [Style Guide](STYLE_GUIDE.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Monorepo Package Configuration](package.json)
- [Playwright Config](playwright.config.ts)
