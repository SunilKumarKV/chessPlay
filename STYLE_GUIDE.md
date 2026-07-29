# ChessPlay Style Guide & Standards

## Purpose
This document defines coding styles, language standards, formatting rules, and directory conventions for the ChessPlay codebase to ensure readability and maintainability.

## Navigation
[README](README.md) • [CONTRIBUTING.md](CONTRIBUTING.md) • [docs/contributing.md](docs/contributing.md)

---

## Coding Standards

### 1. TypeScript Rules
We use TypeScript for all backend logic and frontend modules.
- **Strict Types**: Set `"strict": true` in `tsconfig.json`. Avoid `any`. Use `unknown` or explicit types/interfaces.
- **Interfaces vs. Types**: Use `interface` for object shapes that may need extension, and `type` for unions, intersections, or primitives.
- **Utility Types**: Use TypeScript utilities (`Pick`, `Omit`, `Partial`, `Record`) to keep type structures DRY.

### 2. React Guidelines
- **Functional Components**: All components must be written as functional components using the `const MyComponent: React.FC` syntax.
- **Hooks**: Isolate side-effects using custom React hooks. Avoid placing massive data-fetching or socket sync loops directly inside component render cycles.
- **Styling**: Utilize Tailwind CSS classes for utility-based UI construction, supplemented by Framer Motion for micro-interactions and transitions.

### 3. Markdown Formatting
All documentation within this repository must adhere to the following layout:
- Include a descriptive `# H1` title at the top.
- Establish a clear "Purpose" section.
- Provide interactive navigation links below the title.
- Incorporate concrete code, config, or command-line examples.
- Include structured callouts for notes, tips, and warnings.
- End with bulleted best practices and valid local markdown references.

---

## Examples

### 1. Standard React Component Structure
`frontend/src/components/ChessBadge.tsx`
```typescript
import React from 'react';

interface ChessBadgeProps {
  label: string;
  isPremium?: boolean;
}

export const ChessBadge: React.FC<ChessBadgeProps> = ({ label, isPremium = false }) => {
  return (
    <div
      className={`px-2 py-1 rounded text-xs font-semibold ${
        isPremium
          ? 'bg-amber-500 text-slate-900 shadow-md animate-pulse'
          : 'bg-slate-700 text-slate-200'
      }`}
    >
      {label}
    </div>
  );
};
```

### 2. Standard TypeScript Interface
`backend/src/types/game.ts`
```typescript
export interface ChessMovePayload {
  gameId: string;
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}
```

---

## Notes
- > [!IMPORTANT]
  > We enforce automated linting and formatting via ESLint. Pre-commit hooks will reject code that fails checks.
- > [!TIP]
  > Use visual layout components (grids, flex flexboxes) rather than hardcoded width/height dimensions to guarantee mobile responsiveness.

---

## Best Practices
- **Write Self-Documenting Code**: Choose descriptive variable names over short acronyms.
- **Keep Components Small**: Break large components down into sub-components under 150 lines.
- **Optimize Re-renders**: Wrap heavy chart components in `React.memo` or use `useMemo` for complex math calculations.

---

## References
- [ESLint Rules configuration File](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/frontend/eslint.config.js)
- [Monorepo tsconfig Settings](file:///Users/sunilkumarkv/Desktop/Projects/chessPlay/backend/tsconfig.json)
- [Contributor Documentation](CONTRIBUTING.md)
