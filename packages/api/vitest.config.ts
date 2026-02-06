import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/drizzle/schema/**",
        "src/drizzle/migrations/**",
        "src/seeds/**",
      ],
      thresholds: { lines: 80, branches: 70 },
    },
  },
});
