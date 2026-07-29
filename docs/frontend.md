# Frontend Development & Client State

## Purpose
This document describes the design architecture, state management divisions, visual layouts, and transitions within the ChessPlay React frontend client.

## Navigation
[README](../README.md) • [architecture.md](architecture.md) • [socket-events.md](socket-events.md) • [STYLE_GUIDE.md](../STYLE_GUIDE.md)

---

## Client Directory Map
The frontend application is built as a single-page application using React, Vite, and Tailwind CSS:
```txt
frontend/
├── src/
│   ├── assets/       # Branding SVGs, sound cues, and chessboard patterns
│   ├── components/   # Reusable UI widgets (badges, loaders, modals, nav)
│   ├── hooks/        # React hooks (custom socket queries, timers)
│   ├── pages/        # Main views (Lobby, Dashboard, Puzzles, Billing)
│   ├── store/        # State stores (Zustand logic, Redux configs)
│   ├── utils/        # Board coordinate formatters and validators
│   └── main.tsx      # Vite entrypoint script
└── tailwind.config.js # Styling token rules
```

---

## Client State Partitioning
To maximize speed and maintain clean code, state is split into two systems:

### 1. Game & Socket State (Zustand)
Used for highly volatile, fast-updating states. 
- Track active matchmaking queues.
- Synchronize WebSocket connection statuses.
- Update active game coordinates, FEN, moves history, and clock countdowns.

### 2. Billing & User Session State (Redux Toolkit)
Used for global, relatively static application states.
- Session authorization tokens.
- User profile updates and referral histories.
- Subscription tiers and entitlement arrays (e.g. Pro, Premium feature flags).

---

## Examples

### 1. Zustand Active Game Store Example
```typescript
import { create } from 'zustand';

interface GameState {
  fen: string;
  moves: string[];
  setFen: (fen: string) => void;
  addMove: (move: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  fen: 'start',
  moves: [],
  setFen: (fen) => set({ fen }),
  addMove: (move) => set((state) => ({ moves: [...state.moves, move] })),
}));
```

### 2. Framer Motion Chessboard Slide Animation
Animate the chessboard entrance when matchmaking completes:
```tsx
import { motion } from 'framer-motion';

export const AnimatedBoard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-2xl"
    >
      {children}
    </motion.div>
  );
};
```

---

## Notes
- > [!IMPORTANT]
  > Since ChessPlay needs to support high-performance chess engines in the client browser, ensure standard assets (like wood/glass theme graphics) are compressed to prevent LCP degradation.
- > [!TIP]
  > Store the socket client instance in a React Context Provider to make it accessible across all game pages without resetting the WebSocket link.

---

## Best Practices
- **Prevent Unnecessary Re-renders**: Use shallow equality selectors when pulling data from state stores.
- **Graceful Sound Fallbacks**: Wrap audio effects (e.g. piece slide sound cues) in client-setting condition checks to allow muting.
- **Device Support**: Test all designs down to **360px** widths to guarantee mobile compatibility.

---

## References
- [Frontend Monorepo package.json](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/frontend/package.json)
- [Client Entry Main File](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/frontend/src/app/main.tsx)
- [Coding and Formatting Rules Guide](../STYLE_GUIDE.md)
