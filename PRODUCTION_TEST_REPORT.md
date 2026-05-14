# ChessPlay Production Test Report — v1.3.0-beta

**Release:** `v1.3.0-beta`  
**Build target:** Production web app + Node backend  
**Status:** Ready for staging/production verification after environment variables are configured.

## 1. Test Summary

This report covers the production-readiness checks for ChessPlay after the v1.3.0 upgrade series: authentication, multiplayer, AI, monetization, social, profile/settings, SaaS homepage, and direct backend Telegram/email alerts.

| Area | Status | Notes |
|---|---:|---|
| Frontend lint | ✅ Pass | Vite/React source check completed. |
| Frontend production build | ✅ Pass | Production bundle generated successfully. |
| Backend syntax check | ✅ Pass | Node syntax checks passed for backend JS files. |
| Production smoke tests | ✅ Pass | Existing smoke checks passed. |
| Stockfish smoke test | ✅ Pass | Worker/static engine file checks passed. |
| Auth flow review | ✅ Pass with env required | Google login requires `VITE_GOOGLE_CLIENT_ID` and backend `GOOGLE_CLIENT_ID`. |
| Socket.IO multiplayer review | ✅ Pass with env required | Requires correct backend URL and frontend origin allowlist. |
| Monetization routes review | ✅ Pass | Manual + gateway foundation present; real gateways require live keys. |
| Direct alert system | ✅ Pass with env required | Telegram/email alerts are safe no-op when credentials are missing. |

## 2. Commands Used

Run these locally before every production deploy:

```bash
npm install
npm run lint
npm run build
npm run test:production
npm --workspace backend test
```

Backend syntax-only check:

```bash
find backend -path backend/node_modules -prune -o -name '*.js' -exec node -c {} \;
```

## 3. Critical Production Environment Checklist

### Frontend — Vercel

```bash
VITE_BACKEND_URL=https://your-backend.onrender.com
VITE_SOCKET_URL=https://your-backend.onrender.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_APP_VERSION=1.3.0-beta
```

### Backend — Render/Railway/Fly

```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=your-mongodb-atlas-uri
JWT_SECRET=use-a-real-32-plus-character-secret
FRONTEND_ORIGINS=https://getchessplay.com,https://www.getchessplay.com,https://your-vercel-domain.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
COOKIE_DOMAIN=
```

### Optional production services

```bash
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_ADMIN_CHAT_ID=your-admin-chat-id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SUPPORT_EMAIL_TO=support@getchessplay.com
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
STRIPE_SECRET_KEY=your-stripe-key
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
```

## 4. Manual QA Checklist

### Authentication

- [ ] Register with a valid email domain.
- [ ] Login with email/password.
- [ ] Login with Google on localhost.
- [ ] Login with Google on Vercel domain.
- [ ] Login with Google on custom domain.
- [ ] Refresh page after login and confirm session persists.
- [ ] Logout and confirm protected routes redirect safely.

### Multiplayer / Socket.IO

- [ ] Open two browsers and login with two users.
- [ ] Create room and join room.
- [ ] Make legal moves from both sides.
- [ ] Refresh one browser and verify reconnect/rejoin behavior.
- [ ] Confirm invalid token message shows friendly retry text.
- [ ] Confirm backend CORS allows only configured frontend origins.

### Play vs AI

- [ ] Easy mode uses low depth and easier moves.
- [ ] Medium mode works.
- [ ] Hard mode works.
- [ ] Pro mode is locked/limited as intended for monetization.
- [ ] Eval/depth indicators update.
- [ ] Move quality labels appear after moves.

### Analysis Board

- [ ] Open analysis board and make moves.
- [ ] Promote pawn on analysis board.
- [ ] Confirm play-vs-player board state does not change.
- [ ] Confirm review game route opens from result popup.

### Monetization

- [ ] Pricing page loads.
- [ ] UPI/manual proof submission works.
- [ ] Admin approval/rejection works.
- [ ] Premium user disables ads.
- [ ] Free user sees ads after match/dashboard/home placements.
- [ ] Referral link copies and tracks signup path.
- [ ] Tournament list/create/join flows load.

### Social

- [ ] Community page loads.
- [ ] Create/read posts.
- [ ] View puzzles, discussions, achievements, tournaments.
- [ ] Private friend chat UI loads.
- [ ] Public room chat UI loads.
- [ ] Block/report/mute actions do not crash.
- [ ] Typing and online status indicators render.

### Settings/Profile

- [ ] Upload/change profile photo.
- [ ] Avatar fallback appears when image missing.
- [ ] Change language and confirm UI labels update.
- [ ] Change dark/light mode.
- [ ] Change font, font size, accent color, and text color.
- [ ] Settings persist after refresh.

### Alerts

- [ ] Submit payment proof and receive Telegram/email alert.
- [ ] Create support ticket and receive alert.
- [ ] Request refund and receive alert.
- [ ] Missing alert credentials should not crash backend.

## 5. Known Production Requirements

- Real Google login will not work until Google OAuth client ID is configured in both frontend and backend.
- Stripe/PayPal require live/sandbox credentials and webhook secrets before real payments can be fully automated.
- WhatsApp automation is intentionally deferred; current release keeps a safe placeholder for later Twilio/Meta integration.
- Render free tier can sleep; users may see a short cold-start delay. For stable multiplayer, upgrade backend hosting or use Railway/Fly/Render paid instance.

## 6. Release Decision

`v1.3.0-beta` is suitable for beta production release after environment setup and manual QA are completed on the deployed domain.
