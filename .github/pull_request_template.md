## Summary

- 

## Change Type

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Security fix
- [ ] Documentation
- [ ] Deployment / CI

## Risk Level

- [ ] Low
- [ ] Medium
- [ ] High

## Security Checklist

- [ ] No secrets, tokens, credentials, or `.env` files added
- [ ] No production URLs, database URLs, JWT secrets, payment keys, or API keys exposed
- [ ] Auth/session behavior reviewed if touched
- [ ] CORS/security headers reviewed if touched
- [ ] GitHub Actions/deployment changes reviewed if touched
- [ ] Database/Prisma migration risk reviewed if touched
- [ ] Logs do not expose sensitive user, auth, payment, or infrastructure data

## Validation

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm audit --audit-level high`
- [ ] `pnpm -C backend typecheck`
- [ ] `pnpm -C backend build`
- [ ] `pnpm -C frontend lint`
- [ ] `pnpm -C frontend build`

## Release Review

- [ ] Security Checker review completed
- [ ] Founder / CEO review completed
- [ ] PM review completed
- [ ] Production release approval completed

## Notes

Add screenshots, test notes, rollback notes, or deployment notes here.
