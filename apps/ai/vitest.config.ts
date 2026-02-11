import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "ai",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/index.ts", // Server bootstrap (Bun.serve)
      ],
      thresholds: { lines: 95, branches: 90 },
    },
  },
});
