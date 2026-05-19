import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    cssCodeSplit: true,
    cssMinify: true,
    chunkSizeWarningLimit: 1000,
    minify: "esbuild",
    modulePreload: {
      polyfill: false,
    },
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          const modulePath = id
            .split("node_modules/")
            .pop()
            .split(/[\\/]/);

          const pkgName = modulePath[0].startsWith("@")
            ? `${modulePath[0]}/${modulePath[1]}`
            : modulePath[0];

          if (pkgName === "react" || pkgName === "react-dom" || pkgName === "scheduler") {
            return "vendor-react";
          }
          if (pkgName === "@reduxjs/toolkit" || pkgName === "react-redux" || pkgName === "redux" || pkgName === "redux-thunk" || pkgName === "immer" || pkgName === "use-sync-external-store" || pkgName === "reselect") {
            return "vendor-redux";
          }
          if (pkgName === "framer-motion" || pkgName === "motion-dom" || pkgName === "motion-utils") {
            return "vendor-motion";
          }
          if (pkgName === "socket.io-client" || pkgName === "socket.io-parser" || pkgName === "engine.io-client" || pkgName === "engine.io-parser" || pkgName === "@socket.io/component-emitter") {
            return "vendor-socket";
          }
          if (pkgName === "chess.js") {
            return "vendor-chess";
          }
          return "vendor-misc";
        },
      },
    },
  },
});
