# Changelog

## Purpose
This document tracks all user-facing and architectural changes, features, and security updates for the ChessPlay platform, conforming to Semantic Versioning (SemVer) and "Keep a Changelog" guidelines.

## Navigation
[README](README.md) • [ROADMAP.md](ROADMAP.md) • [docs/release-process.md](docs/release-process.md)

---

All notable changes to ChessPlay will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0-beta] - 2026-05-12

### Added
- **Monetization & Billing**:
  - Subscription system supporting Free, Pro, Premium, and Lifetime tiers.
  - Razorpay integration for safe orders, signature verification, webhook processing, coupon validations, and payment logs.
  - Support databases/models for subscriptions, manual/automated payments, coupons, waited lists, and feature entitlement mapping.
  - Public waitlist registration and platform feedback endpoints.
- **Puzzle Engine**:
  - Automated importer pipeline for Lichess CC0 database chess puzzles.
  - Pre-seeded sample puzzles collection, daily attempt tracking, and move validation logic.
  - Multi-level hint system and clear game-learning explanations.
- **User Interface surfaces**:
  - Visual comparison tables for premium plan features and modular Upgrade/Billing checkout overlays.
  - Entitlement-backed profile badges and interactive lock states for restricted interfaces.
  - Dynamic puzzle panel featuring daily play quotas, wrong-move retry indicators, victory splash animations, and step summaries.
  - Float feedback modal controls, reusable empty states, loader grids, and interactive error banners.
  - Legal footers containing standard privacy, terms, refunds, and cookie consent links.
  - Growth-focused target routes for puzzles, online lobbies, AI matching, performance reviews, openings index, and product store.
- **Admin Tooling**:
  - Back-office administration screens reporting live revenue sums, active premium users count, puzzle utilization stats, and conversion funnels.

### Security
- **Hardened Platform Defense**:
  - Secure response headers via `helmet` and custom Content Security Policy (CSP).
  - Explicit allowlist-checked CORS layers.
  - Advanced Express-rate limits protecting sensitive authentication and gateway channels.
  - Request schema validations and cryptographic Razorpay webhook signature verification.
  - Security locks preventing waitlist and discount code spamming.
  - Production log obfuscation to prevent data leakage and Sentry tracking configuration.

---

## [1.3.0] - 2026-02-15

### Added
- **Real-Time Baseline**:
  - User authentication, session middleware, and user profiles database.
  - Play vs AI engine powered by local Stockfish integration.
  - Real-time multiplayer matching via Socket.IO events.
  - Dashboard analytics, supporter badges, and backend administrative controllers.

---

## Examples

### 1. Adding a Changelog Entry
To submit a changelog update in your PR, add a single bullet point under the corresponding subsection:
```markdown
### Added
- New wood texture themes for chessboards.
```

---

## Notes
- > [!NOTE]
  > Beta releases (indicated by `-beta` tag) are deployed to staging environments for regression and smoke testing before promotion to main.
- > [!IMPORTANT]
  > Version increases follow SemVer: `MAJOR.MINOR.PATCH`. Major bumps represent breaking API modifications, Minor represent backward-compatible features, and Patch represent backward-compatible bug fixes.

---

## Best Practices
- **No Private Details**: Do not reference internal issue IDs or private developer names in changelogs.
- **Categorize Appropriately**: Always classify changes into `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`.
- **Be Concise**: Keep descriptions focused on user-visible or developer-critical outcomes.

---

## References
- [Semantic Versioning Spec](https://semver.org/spec/v2.0.0.html)
- [Keep a Changelog Guide](https://keepachangelog.com/en/1.1.0/)
- [Release Process Guidelines](docs/release-process.md)
