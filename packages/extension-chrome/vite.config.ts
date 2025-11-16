import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "public/sidepanel.html"),
        contentScript: resolve(__dirname, "src/contentScript/contentScript.ts"),
        serviceWorker: resolve(__dirname, "src/background/serviceWorker.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep specific names for extension scripts
          if (chunkInfo.name === "contentScript") {
            return "contentScript.js";
          }
          if (chunkInfo.name === "serviceWorker") {
            return "serviceWorker.js";
          }
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@lumerisca/core": resolve(__dirname, "../core/src"),
    },
  },
});
