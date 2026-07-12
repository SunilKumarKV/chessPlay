# Frequently Asked Questions (FAQ)

## Purpose
This document provides answers to commonly asked questions regarding ChessPlay features, tech stack, billing options, and license parameters.

## Navigation
[README](README.md) • [TROUBLESHOOTING.md](TROUBLESHOOTING.md) • [SUPPORT.md](SUPPORT.md) • [docs/faq.md](docs/faq.md)

---

## FAQ Categories

### 1. General Questions

#### What is ChessPlay?
ChessPlay is a real-time multiplayer chess platform featuring premium memberships, chess puzzles, custom leaderboards, referral campaigns, and a Play vs AI trainer engine powered by Stockfish.

#### What license governs this project?
The core source code of ChessPlay is open-source under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. However, ChessPlay logos, branding, name, and artwork are proprietary trademarks and not licensed under the AGPL-3.0.

---

### 2. Technical Questions

#### Can I deploy ChessPlay on serverless architectures?
The React frontend can easily run on serverless hosting (e.g., Vercel, Netlify). However, the Express backend utilizes persistent Socket.IO connections for multiplayer game syncs and must be hosted on a stateful platform (e.g., Render, AWS EC2, or Heroku).

#### How does the Stockfish integration work?
ChessPlay uses a local compilation of the Stockfish engine. When a user creates a "Play vs AI" room, the backend spawns Stockfish as a subprocess (or compiles to WASM for browser-level offline workloads where configured), validating moves and running search depth queries based on the selected difficulty tier.

---

### 3. Billing & Monetization

#### Does the project support multiple payment gateways?
Yes. Currently, the platform implements a secure integration with Razorpay. Our roadmap includes expansion plans for Stripe and PayPal APIs under the same database schema interfaces.

---

## Examples

### 1. Troubleshooting Socket Block
* **Question**: *Why are my WebSocket connections failing with `CORS policy: No 'Access-Control-Allow-Origin' header`?*
* **Answer**: *Ensure your backend `.env` variables have allowlisted the exact frontend domain name, including matching protocols and ports:*
  ```bash
  # backend/.env
  FRONTEND_ORIGINS="http://localhost:5173,https://yourdomain.com"
  ```

---

## Notes
- > [!NOTE]
  > The Lichess CC0 puzzles imported into ChessPlay remain CC0 and are not covered by ChessPlay copyright claims.
- > [!IMPORTANT]
  > AGPL-3.0 copyleft terms dictate that if you host a modified version of ChessPlay on a public web server, you must publish your modifications under the same AGPL-3.0 license.

---

## Best Practices
- **Verify Version**: Ensure you are running supported Node and pnpm versions before raising setup questions.
- **Search Discussions**: Always search our GitHub Discussions threads before posting a new question.
- **Isolate Environments**: Make sure your issue isn't caused by a local configuration delta (e.g., database network rules).

---

## References
- [Detailed Technical FAQ](docs/faq.md)
- [Troubleshooting Reference Guide](TROUBLESHOOTING.md)
- [Security Guidelines and Rules](SECURITY.md)
