import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reportsDirectory: "test-output/coverage",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules",
        ".next",
        "e2e",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/*",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/vitest.setup.ts",
        "src/app/**",
        "src/config/env.ts",
        "prisma/**",
        "src/lib/backup/**",
        "src/actions/**",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
        100: false,
      },
    },
  },
});
