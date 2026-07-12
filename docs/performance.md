# Platform Performance & Core Web Vitals

## Purpose
This document describes the benchmarking criteria, performance metrics, database query tuning, and asset caching strategies for ChessPlay.

## Navigation
[README](../README.md) • [architecture.md](architecture.md) • [database.md](database.md) • [testing.md](testing.md)

---

## Core Performance Metrics

We actively measure and optimize ChessPlay against Google's Core Web Vitals criteria:

| Metric | Full Name | Target Range | Measurement Strategy |
|---|---|---|---|
| **LCP** | Largest Contentful Paint | `< 2.5s` | Time for the chessboard hero component to draw on screen. |
| **INP** | Interaction to Next Paint | `< 200ms` | Response time for clicking and dragging pieces. |
| **CLS** | Cumulative Layout Shift | `< 0.1` | Visual stability of the match board and stats sidebars. |
| **TBT** | Total Blocking Time | `< 150ms` | Main thread execution blocks during Stockfish analysis boots. |

---

## Technical Performance Optimization

### 1. Vite Client Bundle Splitting
To keep client load times fast, we partition our code using Vite chunking config, isolating large library dependencies (like Recharts or Redux) into separate cached browser files:

```typescript
// frontend/vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          state: ['@reduxjs/toolkit', 'react-redux', 'zustand'],
          charts: ['recharts']
        }
      }
    }
  }
});
```

### 2. Relational Database Query Optimization
We prevent N+1 database queries by using Prisma's `include` and explicit `select` properties, loading only the data we need:
- Use indexes on `whitePlayerId`, `blackPlayerId`, and `status`.
- Utilize connection pooling via PgBouncer.

---

## Examples

### 1. Optimized User Profile Query
Avoid downloading password hashes during profile calls:
```typescript
export const getSafeUserProfile = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      rating: true,
      isPremium: true,
      createdAt: true
      // passwordHash and refreshTokenHash are excluded automatically
    }
  });
};
```

### 2. CSS content-visibility Optimization
Speed up landing pages by delaying rendering of off-screen components:
```css
.premium-plans-section {
  content-visibility: auto;
  contain-intrinsic-size: 500px;
}
```

---

## Notes
- > [!IMPORTANT]
  > Stockfish.js running in the client browser relies heavily on Web Assembly (WASM). Verify that the server sends COOP/COEP security headers, otherwise modern browsers will block thread execution.
- > [!TIP]
  > Compress sound file cues (move clicks, capture clicks, error alerts) into OGG or MP3 format to reduce initial page asset payloads.

---

## Best Practices
- **Implement Lazy Loading**: Wrap non-critical pages (like the premium dashboard) in `React.lazy` to load them only when the user requests them.
- **Cache static assets**: Configure HTTP `Cache-Control` header lifetimes up to **1 year** for images and sound files on cloud hosting CDNs.
- **Index query fields**: Regularly run database queries analysis (`EXPLAIN ANALYZE`) to verify query paths.

---

## References
- [Frontend App Build Configs](frontend.md)
- [Database Schema Index Designs](database.md)
- [Lighthouse Benchmarking Suite Instructions](testing.md)
