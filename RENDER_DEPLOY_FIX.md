# Render Deploy Fix — Prisma Client Generation

Render failed because `backend/dist/server.js` requires a successful TypeScript build, and TypeScript imports the generated Prisma client from `backend/generated/prisma/client`.

The backend build now runs Prisma generate before TypeScript compile:

```bash
npm run prisma:generate && tsc -p tsconfig.json
```

## Render Backend Settings

Root Directory:

```txt
backend
```

Build Command:

```bash
npm install && npm run build
```

Start Command:

```bash
npm run start
```

## Required Render Environment Variables

```txt
DATABASE_URL
MONGO_URI
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
FRONTEND_ORIGINS
NODE_ENV=production
```

Do not commit `.env` files. Add these only in Render Environment settings.
