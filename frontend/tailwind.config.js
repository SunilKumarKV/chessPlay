/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Crimson Text"', "Georgia", "serif"],
        display: ['"Playfair Display"', "serif"],
      },
      colors: {
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
