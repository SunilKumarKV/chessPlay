# Relational Database & Prisma Schema

## Purpose
This document describes the schema design, table structures, relationships, and indexing patterns for the PostgreSQL database in ChessPlay.

## Navigation
[README](../README.md) • [architecture.md](architecture.md) • [backend.md](backend.md) • [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## Database Overview
ChessPlay uses **PostgreSQL** as its primary relational store. Database interaction is handled through **Prisma ORM**, providing compile-time type safety for backend controllers.

---

## Core Models & Relations

### 1. User & Game Model Relation
A user can participate in games as either the White player or the Black player. This forms a one-to-many relationship mapped twice between `User` and `Game`:

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  username      String   @unique
  rating        Int      @default(1200)

  gamesAsWhite  Game[]   @relation("WhitePlayer")
  gamesAsBlack  Game[]   @relation("BlackPlayer")
}

model Game {
  id            String      @id @default(cuid())
  whitePlayerId String?
  blackPlayerId String?
  whitePlayer   User?       @relation("WhitePlayer", fields: [whitePlayerId], references: [id], onDelete: SetNull)
  blackPlayer   User?       @relation("BlackPlayer", fields: [blackPlayerId], references: [id], onDelete: SetNull)
  status        GameStatus  @default(WAITING)
  pgn           String?
  fen           String?
}
```

### 2. Indexes and Performance Optimizations
To keep query times fast under heavy multiplayer traffic, we define database indexes on fields commonly used in filtering, ordering, or joint queries:
- `@@index([whitePlayerId])` and `@@index([blackPlayerId])`: Speeds up fetching user game histories.
- `@@index([email])` and `@@index([username])`: Speeds up authentication lookups.
- `@@index([status])`: Speeds up fetching active lobbies or matchmaking lists.

---

## Examples

### 1. Querying User History via Prisma Client
Fetch a user's game history, including profiles for their opponents:
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getUserGames = async (userId: string) => {
  return await prisma.game.findMany({
    where: {
      OR: [
        { whitePlayerId: userId },
        { blackPlayerId: userId }
      ]
    },
    include: {
      whitePlayer: { select: { username: true, rating: true } },
      blackPlayer: { select: { username: true, rating: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
};
```

### 2. Standard Migration Command Sequence
```bash
# Generate new migration files based on schema changes
pnpm --filter backend exec prisma migrate dev --name add_premium_features

# Deploy pending migrations on staging or production servers
pnpm --filter backend exec prisma migrate deploy
```

---

## Notes
- > [!IMPORTANT]
  > Never run `prisma db push` on production databases. Always use `prisma migrate deploy` to ensure schema migrations are tracked and reversible.
- > [!WARNING]
  > Relational tables containing user emails are flagged as sensitive. Always limit administrative access to these fields.

---

## Best Practices
- **Use CUIDs**: Leverage CUIDs (`@default(cuid())`) rather than auto-incrementing integers to prevent URL enumeration attacks.
- **Set Cascade Deletes carefully**: Cascade deletions for child dependencies (e.g., deleting user deletes tokens) but use `onDelete: SetNull` for game records to preserve historic match results.
- **Index Foreign Keys**: Ensure all foreign key relations have an explicit index defined to prevent full table scans on queries.

---

## References
- [Prisma Schema Config File](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/backend/prisma/schema.prisma)
- [Monorepo Package Environment Templates](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/backend/.env.example)
- [System Architecture Guide](architecture.md)
