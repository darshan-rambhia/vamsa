import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: "web",
    environment: "happy-dom",
    include: [
      "src/**/*.test.{ts,tsx}",
      "server/**/*.test.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
    ],
    exclude: ["**/integration/**", "**/e2e/**"],
    setupFiles: ["./tests/setup/test-logger-mock.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "server/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "server/**/*.test.{ts,tsx}",
        "tests/**",
        "e2e/**",
      ],
      thresholds: { lines: 55, branches: 65 },
    },
  },
});
