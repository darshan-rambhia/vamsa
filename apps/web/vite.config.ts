import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { vamsaDevApiPlugin } from "./server/dev";

export default defineConfig({
  // Load .env from monorepo root
  envDir: path.resolve(__dirname, "../.."),
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@vamsa/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@vamsa/api": path.resolve(__dirname, "../../packages/api"),
      "@vamsa/lib": path.resolve(__dirname, "../../packages/lib/src"),
      "@vamsa/schemas": path.resolve(__dirname, "../../packages/schemas/src"),
    },
  },
  ssr: {
    external: [
      // Server-only dependencies from packages/lib that shouldn't be bundled
      "archiver",
      "arctic",
      "bcryptjs",
      "i18next",
      "i18next-fs-backend",
      "node-cron",
    ],
  },
  build: {
    rollupOptions: {
      external: [
        // Server-only dependencies from packages/lib that shouldn't be bundled
        "archiver",
        "arctic",
        "bcryptjs",
        "i18next",
        "i18next-fs-backend",
        "node-cron",
      ],
    },
  },
  plugins: [
    // Add API routes in dev mode for dev/prod parity
    vamsaDevApiPlugin(),
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    viteReact(),
  ],
});
