/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
        serif: ['"Crimson Text"', "Georgia", "serif"],
        display: ['"Playfair Display"', "serif"],
      },
      colors: {
        // Custom chess theme colors
        primary: {
          bg: '#0e0e0e',
          card: '#1a1a1a',
          border: '#2a2a2a',
          text: '#e0e0e0',
          muted: '#7a7a7a',
          accent: '#81b64c',
        },
        gold: {
          300: "#f5d78e",
          400: "#e8b84b",
          500: "#c8943a",
          600: "#a07020",
        },
        board: {
          light: "#f0d9b5",
          dark: "#b58863",
          lightHighlight: "#cdd16f",
          darkHighlight: "#aaa23a",
          selected: "#7fc97f",
        },
      },
    },
  },
  plugins: [],
};
