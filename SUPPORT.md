# ChessPlay Support Policy

## Purpose
This document outlines the official channels for requesting help, reporting bugs, asking questions, and details our support commitments (SLA) for the ChessPlay platform.

## Navigation
[README](README.md) • [FAQ.md](FAQ.md) • [SECURITY.md](SECURITY.md) • [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Official Channels

We provide multiple channels depending on the nature of your request:

### 1. Technical Questions & Community Help
For assistance setting up your local environment, general web design help, or how to integrate APIs:
- **Platform**: [GitHub Discussions](https://github.com/SunilKumarKV/chessPlay/discussions)
- **Response Target**: 48 hours (Community driven)

### 2. Bug Reports & Feature Ideas
If you found an issue in the application code, a design defect, or want to suggest new features:
- **Platform**: [GitHub Issues](https://github.com/SunilKumarKV/chessPlay/issues)
- **Response Target**: 72 hours (Maintainer triaged)

### 3. Security Vulnerabilities
If you discover a vulnerability, leak, or potential security bypass:
- **Platform**: Private Advisory / Email (See [SECURITY.md](SECURITY.md))
- **Response Target**: 24 hours (Critical priority)

---

## Service Level Agreements (SLA)

| Request Type | Channel | Initial Triage | Resolution Target |
|---|---|---|---|
| Security Flaw | Email/Private | < 24 Hours | 7 Days (Or patch release) |
| Core Application Bug | GitHub Issues | < 48 Hours | Next release window |
| General Question | Discussions | < 72 Hours | Community dependent |

---

## Examples

### How to ask for setup support
When posting on GitHub Discussions, provide the following format:
```text
Environment: macOS Sequoia / Node v20.10.0 / pnpm v10.15.0
Command Run: pnpm build
Error Message: "Failed to compile backend, module not found"
Steps to Reproduce:
1. Fresh clone of repository
2. Run pnpm install
3. Run pnpm build
```

---

## Notes
- > [!IMPORTANT]
  > Do not post your database credentials, JWT secrets, or production IP addresses in support threads.
- > [!TIP]
  > Before opening a new support issue, search existing closed issues and the [FAQ.md](FAQ.md) file to see if your query has already been resolved.

---

## Best Practices
- **Verify Locally**: Make sure the issue isn't due to missing local environment files (e.g., `.env`).
- **Provide Logs**: Attach stderr outputs or browser console stack traces.
- **Isolate the Bug**: Determine if the problem is specific to the frontend, backend, or database.

---

## References
- [GitHub Issues Tracker](https://github.com/SunilKumarKV/chessPlay/issues)
- [Project Troubleshooting Guide](TROUBLESHOOTING.md)
- [Security Disclosures Guidelines](SECURITY.md)
