import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "lib",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./tests/setup/test-logger-mock.ts"],
    coverage: {
      provider: "istanbul",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/testing/**", "tests/**"],
      thresholds: { lines: 80, branches: 80 },
    },
  },
});
