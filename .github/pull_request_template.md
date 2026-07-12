## Purpose & Description
Provide a clear summary of the changes made, the problem solved, and any design or architectural decisions.

Fixes # [Insert Issue Number here]

---

## Type of Change
- [ ] 🐛 Bug Fix (non-breaking change resolving an issue)
- [ ] 🚀 New Feature (non-breaking change adding capability)
- [ ] 🛠️ Refactor (non-breaking code cleanup)
- [ ] 🔒 Security Patch (fixes vulnerabilities or hardens routes)
- [ ] 📝 Documentation Update (modifies markdown or guides)
- [ ] ⚙️ CI/CD / Build Pipeline Update

---

## Security Audit Checklist
- [ ] **No Credentials**: No database URLs, JWT keys, payment secrets, or API keys are committed.
- [ ] **No `.env` Files**: Checked that no local environment variables are tracked by git.
- [ ] **Data Sanitation**: User inputs are sanitized to protect against SQLi, XSS, or CSRF.
- [ ] **Safe Log Output**: Ensured server log outputs do not write cookies, tokens, or PII.

---

## Quality Gate Validation
Before marking this PR as ready for review, verify the following checks have run and passed:

```bash
# Verify monorepo dependencies compile cleanly
pnpm install --frozen-lockfile
pnpm build

# Run formatting and syntax checks
pnpm --filter frontend lint
pnpm --filter backend typecheck

# Execute local test suite
pnpm test:frontend
pnpm test:backend

# Scan repository for accidental secret leaks
gitleaks detect --source . --verbose
```

---

## Screenshots / Visual Checks
*If your change modifies UI layout, components, or transitions, attach before/after screenshots or animations below:*
- **Before**: [Link or Image]
- **After**: [Link or Image]
