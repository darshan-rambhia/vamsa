import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest config for integration tests.
 *
 * Intentionally separate from vitest.config.ts (unit tests) so integration
 * tests are NOT included in the default `bun run test` workspace run.
 *
 * Run with:
 *   bun run test:int            # SQLite (fast, no Docker required)
 *   bun run test:int:postgres   # PostgreSQL (requires Docker test DB)
 *
 * Start test DB for Postgres:
 *   docker compose -f docker/docker-compose.local.yml --profile test up -d --wait
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: "integration",
    environment: "node",
    include: ["tests/integration/**/*.int.ts"],
    testTimeout: 30000,
    // Runs migrations once before any forks start (postgres only).
    // Prevents race conditions when parallel workers all try to migrate the same DB.
    globalSetup: ["./tests/integration/global-setup.ts"],
    // Each file runs in its own process — critical for SQLite :memory: isolation
    // and for ensuring each file gets a fresh DB connection.
    pool: "forks",
  },
});
