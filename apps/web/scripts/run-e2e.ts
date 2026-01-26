#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * E2E Test Runner Script
 *
 * This script handles all steps needed to run E2E tests:
 * 1. Start PostgreSQL via Docker
 * 2. Run Drizzle migrations (push schema)
 * 3. Seed test data
 * 4. Run Playwright tests
 * 5. Clean up Docker containers
 *
 * Usage: bun run scripts/run-e2e.ts [playwright-args...]
 *
 * Flags:
 *   --logs         Show webserver output
 *   --bun-runtime  Run Playwright with Bun runtime (experimental, not yet working)
 *
 * Note: The --bun-runtime flag doesn't work yet because Playwright's TypeScript
 * loader conflicts with Bun's loader. Playwright uses .esm.preflight files for
 * ESM module loading which Bun doesn't support. Setting PW_DISABLE_TS_ESM=1
 * doesn't fully resolve this. Once Playwright adds native Bun support, this
 * flag should work.
 */

import { spawn } from "bun";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT_DIR = resolve(import.meta.dirname, "../../..");
const API_DIR = resolve(ROOT_DIR, "packages/api");
const DOCKER_DIR = resolve(ROOT_DIR, "docker");
const WEB_DIR = resolve(ROOT_DIR, "apps/web");

// Docker compose file for E2E tests (db only)
const E2E_COMPOSE = `
services:
  db:
    image: postgres:18-alpine
    ports:
      - "5433:5432"
    environment:
      - POSTGRES_USER=vamsa_test
      - POSTGRES_PASSWORD=vamsa_test
      - POSTGRES_DB=vamsa_test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vamsa_test"]
      interval: 2s
      timeout: 5s
      retries: 10
`;

const E2E_DATABASE_URL =
  "postgresql://vamsa_test:vamsa_test@localhost:5433/vamsa_test";

const composeFile = resolve(DOCKER_DIR, "docker-compose.e2e.yml");

async function run(
  cmd: string[],
  options: { cwd?: string; env?: Record<string, string>; quiet?: boolean } = {}
): Promise<number> {
  const proc = spawn({
    cmd,
    cwd: options.cwd || ROOT_DIR,
    env: { ...process.env, ...options.env },
    stdout: options.quiet ? "ignore" : "inherit",
    stderr: options.quiet ? "ignore" : "inherit",
  });

  return await proc.exited;
}

async function cleanup() {
  console.log("🧹 Cleaning up...");
  await run(["docker-compose", "-f", composeFile, "down", "-v"], {
    quiet: true,
  });
  if (existsSync(composeFile)) {
    unlinkSync(composeFile);
  }
  console.log("✅ Cleanup complete\n");
}

async function main() {
  const playwrightArgs = process.argv.slice(2);

  // Check if --logs flag is present to enable webserver logs
  const hasServerLogs = playwrightArgs.includes("--logs");

  // Check if --bun-runtime flag is present to use Bun runtime for Playwright
  const useBunRuntime = playwrightArgs.includes("--bun-runtime");

  // Remove our custom flags from playwright args (playwright doesn't know about them)
  const filteredArgs = playwrightArgs.filter(
    (arg) => arg !== "--logs" && arg !== "--bun-runtime"
  );

  console.log("🚀 Starting E2E test runner...\n");
  if (useBunRuntime) {
    console.log("⚡ Running Playwright with Bun runtime (experimental)");
    console.log(
      "⚠️  Warning: This may not work due to Playwright's ESM loader conflict with Bun\n"
    );
  }

  // Create temp docker-compose file for E2E
  writeFileSync(composeFile, E2E_COMPOSE);

  try {
    // Step 1: Start PostgreSQL
    console.log("📦 Step 1/4: Starting PostgreSQL...");

    // First, ensure any old containers are removed
    console.log("   - Cleaning up old containers...");
    await run(["docker-compose", "-f", composeFile, "down", "-v"], {
      quiet: true,
    });

    const dockerResult = await run([
      "docker-compose",
      "-f",
      composeFile,
      "up",
      "-d",
      "--wait",
    ]);
    if (dockerResult !== 0) {
      throw new Error(`Docker compose failed with exit code ${dockerResult}`);
    }
    console.log("✅ PostgreSQL is ready\n");

    // Step 2: Run Drizzle migrations and seed
    console.log("🔄 Step 2/4: Running Drizzle migrations and seeding...");

    // Push schema to database using Drizzle
    console.log("   - Applying database schema with Drizzle...");
    const pushResult = await run(["bunx", "drizzle-kit", "push", "--force"], {
      cwd: API_DIR,
      env: { DATABASE_URL: E2E_DATABASE_URL },
    });
    if (pushResult !== 0) {
      throw new Error(`Drizzle push failed with exit code ${pushResult}`);
    }
    console.log("✅ Database schema applied");

    // Run seed to create test users
    console.log("   - Seeding test data...");
    const seedResult = await run(["bun", "run", "src/drizzle/seed.ts"], {
      cwd: API_DIR,
      env: { DATABASE_URL: E2E_DATABASE_URL },
    });
    if (seedResult !== 0) {
      throw new Error(`Database seed failed with exit code ${seedResult}`);
    }
    console.log("✅ Test data seeded\n");

    // Step 3: Run Playwright tests
    console.log("🧪 Step 3/4: Running Playwright tests...\n");

    // Build the playwright command
    // Using `bun --bun x` runs the command with Bun as the JavaScript runtime
    const playwrightCmd = useBunRuntime
      ? ["bun", "--bun", "x", "playwright", "test", ...filteredArgs]
      : ["bunx", "playwright", "test", ...filteredArgs];

    const testResult = await run(playwrightCmd, {
      cwd: WEB_DIR,
      env: {
        ...process.env,
        DATABASE_URL: E2E_DATABASE_URL,
        // Pass server logs flag to Playwright config
        PLAYWRIGHT_LOGS: hasServerLogs ? "true" : "false",
        // Disable Playwright's ESM transform when using Bun runtime
        ...(useBunRuntime && { PW_DISABLE_TS_ESM: "1" }),
      },
    });

    // Step 4: Cleanup
    console.log("\n🧹 Step 4/4: Cleaning up...");
    await cleanup();

    // Exit with test result code
    if (testResult !== 0) {
      console.log("❌ E2E tests failed");
      process.exit(testResult);
    }

    console.log("✅ E2E tests passed!");
  } catch (error) {
    console.error("\n❌ Error:", error);

    // Cleanup on error
    try {
      await cleanup();
    } catch {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

main();
