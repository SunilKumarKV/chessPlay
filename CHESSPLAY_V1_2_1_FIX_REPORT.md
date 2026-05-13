# ChessPlay v1.2.1 Hotfix Report

## Fixed

1. Email domain validation now accepts both `gmail.com` and `@gmail.com` style environment values.
2. Google login now passes through the same production email validation as normal signup.
3. Login, signup, refresh, and Google login now return a short-lived `socketToken` for Socket.IO handshake fallback.
4. Added `/api/auth/socket-token` endpoint for multiplayer reconnect/token refresh.
5. Socket.IO client now sends auth token during handshake and falls back to secure cookies.
6. Socket.IO connection now prefers websocket first, then polling.
7. Multiplayer server URL is no longer editable/visible to users in the production UI.
8. Added light-theme contrast guard CSS for older hardcoded Tailwind dark classes.
9. Auth middleware now supports secure HttpOnly cookies and optional `Authorization: Bearer` token for socket-token protected flows.

## Required production environment variables

### Render backend

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=your_mongodb_atlas_uri
JWT_ACCESS_SECRET=generate_64_char_random_secret_1
JWT_REFRESH_SECRET=generate_64_char_random_secret_2
FRONTEND_ORIGINS=https://getchessplay.vercel.app
AUTH_ALLOWED_EMAIL_DOMAINS=gmail.com,yahoo.com,outlook.com,icloud.com,protonmail.com,aol.com,zoho.com,mail.com,gmx.com,yandex.com,tutanota.com,fastmail.com,hushmail.com,mailfence.com,runbox.com,posteo.net,countermail.com,startmail.com,disroot.org,mailbox.org,lavabit.com,safe-mail.net
GOOGLE_CLIENT_ID=your_google_client_id
COOKIE_DOMAIN=
```

Do not include `@` in `AUTH_ALLOWED_EMAIL_DOMAINS`. The code now supports it, but the clean production format is without `@`.

### Vercel frontend

```env
VITE_BACKEND_URL=https://chessplay-b5ve.onrender.com
VITE_SOCKET_URL=https://chessplay-b5ve.onrender.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Manual deployment steps

1. Push this updated code to GitHub.
2. Redeploy backend on Render first.
3. In Render, confirm `/healthz` returns JSON with `status: ok`.
4. Redeploy frontend on Vercel after backend is live.
5. Clear browser site data for `getchessplay.vercel.app`, then login again.
6. Test normal signup with Gmail.
7. Test Google login.
8. Open Multiplayer → click **Test Server**.
9. Use two browsers/accounts and click **Quick Match** to verify matchmaking.
10. Test Create Room and Join Room with a second account.

## Same WiFi / LAN note

Same WiFi play still needs one local backend server running on your laptop or LAN host. A Vercel static frontend cannot discover nearby devices directly without a local/signaling backend. Use the app's Same WiFi page for pass-and-play, or run backend locally and point a local frontend build to the LAN backend URL.
