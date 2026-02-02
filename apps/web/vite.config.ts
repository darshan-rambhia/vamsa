import path from "node:path";
import * as crypto from "node:crypto";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { config } from "dotenv";
import { vamsaDevApiPlugin } from "./server/dev";

// Load .env from monorepo root for server-side code (Drizzle, Better Auth, etc.)
config({ path: path.resolve(__dirname, "../../.env") });

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
      // Use react-native-svg-web for web builds
      "react-native-svg": "react-native-svg-web",
    },
  },
  optimizeDeps: {
    exclude: ["react-native"],
  },
  ssr: {
    external: [
      // Server-only dependencies from packages/lib that shouldn't be bundled
      "archiver",
      "arctic",
      "bcryptjs",
      // Note: i18next is NOT external - it needs to be bundled for both SSR and client
      // to ensure the hydration matches. Only i18next-fs-backend is server-only.
      "i18next-fs-backend",
      "node-cron",
      // pg-native is an optional native addon that pg tries to import
      "pg-native",
      // sharp is a native image processing library that must not be bundled
      "sharp",
    ],
  },
  build: {
    rollupOptions: {
      external: [
        // Server-only dependencies from packages/lib that shouldn't be bundled
        "archiver",
        "arctic",
        "bcryptjs",
        // Note: i18next is NOT external - it's needed on the client for react-i18next
        // Only i18next-fs-backend is server-only
        "i18next-fs-backend",
        "node-cron",
        // pg-native is an optional native addon that pg tries to import
        "pg-native",
        // Exclude react-native from web builds (react-native-svg-web provides web implementation)
        "react-native",
        // sharp is a native image processing library that must not be bundled
        "sharp",
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
    tanstackStart({
      serverFns: {
        // Generate deterministic function IDs based on filename + functionName
        // This prevents cache invalidation issues between dev server restarts
        generateFunctionId: ({
          filename,
          functionName,
        }: {
          filename: string;
          functionName: string;
        }) => {
          // Normalize the filename to be relative to src/
          const normalizedPath = filename.replace(/^.*\/src\//, "src/");
          const input = `${normalizedPath}--${functionName}`;
          return crypto
            .createHash("sha1")
            .update(input)
            .digest("hex")
            .slice(0, 16);
        },
      },
    }),
    viteReact(),
  ],
});
