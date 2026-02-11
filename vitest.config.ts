import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "./packages/schemas",
      "./packages/client",
      "./packages/query-hooks",
      "./packages/api",
      "./packages/lib",
      "./packages/ui",
      "./apps/web",
      "./apps/ai",
    ],
  },
});
