import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "schemas",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      thresholds: { lines: 90, branches: 85 },
    },
  },
});
