# Dark/Light Mode Theme System Documentation

## Overview

This project now features a production-grade theme system that provides:

- ✅ Global dark/light mode toggle
- ✅ Persistent theme preference (localStorage)
- ✅ System preference detection
- ✅ Smooth transitions between themes
- ✅ Comprehensive color palette for both themes
- ✅ Applied across all components (Sidebar, Topbar, Dashboard, etc.)

## Architecture

### Files Created

1. **`src/context/ThemeContext.jsx`** - Global theme state management using React Context
   - Defines color palettes for dark and light themes
   - Manages theme persistence
   - Listens to system theme preferences
   - Provides `ThemeProvider` wrapper component

2. **`src/hooks/useTheme.js`** - Custom hook for accessing theme
   - Provides easy access to theme colors and toggle function
   - Throws error if used outside of `ThemeProvider`

### Setup

The app is wrapped with `ThemeProvider` in `src/app/main.jsx`:

```jsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

## Usage

### Using the Theme in Components

```jsx
import { useTheme } from "../hooks/useTheme";

export function MyComponent() {
  const { isDark, theme, toggleTheme } = useTheme();

  return (
    <div
      style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}
    >
      <button onClick={toggleTheme}>
        {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
      </button>
    </div>
  );
}
```

### Available Theme Properties

```javascript
{
  isDark,           // boolean - current theme mode
  theme,           // object - current theme colors
  toggleTheme,     // function - switch between dark and light

  // Quick access properties
  bg,              // background colors
  text,            // text colors
  border,          // border colors
  primary,         // primary accent color
}
```

### Color Palette Structure

Each theme has:

```javascript
{
  primary: "#81b64c",           // Main accent color
  primaryDark: "#6a9a3d",       // Darker variant
  primaryLight: "#9ecf5e",      // Lighter variant

  bg: {
    primary: "#0e0e0e",        // Main background
    secondary: "#1a1a1a",      // Secondary background
    tertiary: "#262421",       // Tertiary background
    quaternary: "#312e2b",     // Quaternary background
    overlay: "#111827",        // Overlay/header background
  },

  text: {
    primary: "#e0e0e0",        // Primary text
    secondary: "#a0a0a0",      // Secondary text
    tertiary: "#7a7a7a",       // Tertiary text
    muted: "#505050",          // Muted text
  },

  border: {
    primary: "#2a2a2a",        // Primary borders
    secondary: "#3a3a3a",      // Secondary borders
    light: "#404040",          // Light borders
  },

  success: "#10b981",          // Success state
  warning: "#f59e0b",          // Warning state
  error: "#ef4444",            // Error state
  info: "#3b82f6",             // Info state

  hover: "rgba(129, 182, 76, 0.1)",    // Hover state background
  active: "rgba(129, 182, 76, 0.2)",   // Active state background
  disabled: "#4a4a4a",         // Disabled state
}
```

## Components Updated

### ✅ Sidebar (`src/features/dashboard/components/Sidebar.jsx`)

- Uses theme colors for background, text, borders
- Smooth hover states with theme.hover
- Theme toggle support

### ✅ Topbar (`src/features/dashboard/components/Topbar.jsx`)

- **NEW: Theme Toggle Button** - Sun/Moon icon to switch modes
- Dynamic search input styling
- Theme-aware dropdown menu
- Icon button hover states

### ✅ SidebarItem (`src/features/dashboard/components/SidebarItem.jsx`)

- Active state uses theme.active
- Hover states with dynamic colors
- Tooltip background uses theme colors

### ✅ DashboardLayout (`src/layouts/DashboardLayout.jsx`)

- Container uses theme background colors
- Smooth transitions on theme change (300ms)
- Right panel uses theme colors

## Theme Persistence

The theme preference is saved in three ways (in order of priority):

1. **localStorage** - User's manual selection (`theme=dark` or `theme=light`)
2. **System preference** - Respects OS dark/light mode setting
3. **Default** - Falls back to dark mode

## Extending the Theme

To add a new color to the theme palette, update both theme objects in `src/context/ThemeContext.jsx`:

```javascript
const THEMES = {
  dark: {
    // ... existing colors
    customColor: "#your-dark-color",
  },
  light: {
    // ... existing colors
    customColor: "#your-light-color",
  },
};
```

Then access it in components:

```javascript
const { theme } = useTheme();
const customColor = theme.customColor;
```

## Components Still Needing Theme Support

The following components should be updated to use the theme system:

- `src/pages/DashboardPage.jsx` - Dashboard cards and layout
- `src/pages/LandingPage.jsx` - Auth forms and landing UI
- `src/pages/SettingsPage.jsx` - Settings form and toggles
- `src/pages/ProfilePage.jsx` - Profile card and form
- `src/pages/GameHistoryPage.jsx` - History table and filters
- `src/pages/LeaderboardPage.jsx` - Leaderboard table
- `src/features/chess/pages/ChessPage.jsx` - Chess board and controls
- All other pages and components

## Best Practices

1. **Always use `useTheme()` hook** instead of hardcoding colors
2. **Use inline styles** for dynamic theme application
3. **Add smooth transitions** with `transition-colors duration-300` class
4. **Test both themes** to ensure readability and contrast
5. **Use semantic colors** (success, error, warning, info) for state indication
6. **Respect user preference** - don't force a single theme

## Testing the Theme

1. **Manual Toggle**: Click the sun/moon icon in the Topbar
2. **localStorage Check**: Open DevTools → Application → localStorage → check `theme` value
3. **System Preference**: Change OS dark/light mode, refresh without localStorage entry
4. **Persistence**: Toggle theme, refresh page - theme should persist

## Future Enhancements

- [ ] Add theme customizer modal for user-defined colors
- [ ] Additional theme presets (e.g., High Contrast, Sepia)
- [ ] Per-page theme preferences
- [ ] Animated theme transition effects
- [ ] Theme sync across browser tabs
