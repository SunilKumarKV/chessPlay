---
name: "🐛 Bug Report"
about: Submit a reproducible error report to help us improve ChessPlay
title: "bug: [Short description of the bug]"
labels: ["bug", "triage"]
assignees: ""
---

## Summary
Provide a clear and concise description of what the bug is, including the expected behavior versus the actual behavior observed.

---

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error '...'

---

## Expected Behavior
A clear and concise description of what you expected to happen.

---

## Environment Information
- **App Version**: [e.g. v1.4.0-beta]
- **Deployment Tier**: [e.g. Local Host, Staging, Production]
- **Browser/OS**: [e.g. Chrome 122 / macOS Sonoma]
- **Node.js / pnpm Versions**: [e.g. Node 20.10.0 / pnpm 10.15.0]

---

## Context and Diagnostics
- **Affected Area**:
  - [ ] Frontend Client UI
  - [] Backend Router API
  - [ ] Socket.IO / Real-Time Matching
  - [ ] Database / Postgres Schema
  - [ ] Stockfish AI Subprocess
  - [ ] Razorpay Payment flow
- **Browser Console Errors**:
  ```text
  [Paste any Javascript stack traces here]
  ```
- **Backend Server Logs**:
  ```text
  [Paste backend CLI error outputs here]
  ```

---

## Security Compliance Verification
- [ ] I have verified that no production database connection strings, JWT passwords, or client cookies are contained in the logs attached above.
- [ ] I understand that posting credentials or secret keys publicly will result in this issue being immediately closed and the exposed keys revoked.
