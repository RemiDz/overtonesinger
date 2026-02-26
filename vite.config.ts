import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { copyFileSync } from "fs";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    {
      name: "copy-index-to-404",
      closeBundle() {
        // GitHub Pages SPA fix: serve the app shell for any unknown route
        const outDir = path.resolve(import.meta.dirname, "dist");
        copyFileSync(
          path.resolve(outDir, "index.html"),
          path.resolve(outDir, "404.html"),
        );
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
