#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * E2E Test Runner Script
 *
 * This script handles all steps needed to run E2E tests:
 * 1. Start PostgreSQL via Docker
 * 2. Run Prisma migrations
 * 3. Run Playwright tests
 * 4. Clean up Docker containers
 *
 * Usage: bun run scripts/run-e2e.ts [playwright-args...]
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
    image: postgres:16-alpine
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

  // Check if --debug flag is present to enable webserver logs
  const isDebugMode = playwrightArgs.includes("--debug");

  console.log("🚀 Starting E2E test runner...\n");

  // Create temp docker-compose file for E2E
  writeFileSync(composeFile, E2E_COMPOSE);

  try {
    // Step 1: Start PostgreSQL
    console.log("📦 Step 1/4: Starting PostgreSQL...");
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

    // Step 2: Run migrations and seed
    console.log("🔄 Step 2/4: Running Prisma migrations and seeding...");

    // Reset database (delete all data) to ensure clean state
    console.log("   - Resetting database...");
    const resetResult = await run(["bunx", "prisma", "db", "push", "--force-reset"], {
      cwd: API_DIR,
      env: { DATABASE_URL: E2E_DATABASE_URL },
    });
    if (resetResult !== 0) {
      // If force-reset fails, try regular push (might be first run)
      const pushResult = await run(["bunx", "prisma", "db", "push"], {
        cwd: API_DIR,
        env: { DATABASE_URL: E2E_DATABASE_URL },
      });
      if (pushResult !== 0) {
        throw new Error(`Prisma db push failed with exit code ${pushResult}`);
      }
    }
    console.log("✅ Database schema applied");

    // Run seed to create test users
    console.log("   - Seeding test data...");
    const seedResult = await run(["bunx", "tsx", "prisma/seed.ts"], {
      cwd: API_DIR,
      env: { DATABASE_URL: E2E_DATABASE_URL },
    });
    if (seedResult !== 0) {
      throw new Error(`Prisma seed failed with exit code ${seedResult}`);
    }
    console.log("✅ Test data seeded\n");

    // Step 3: Run Playwright tests
    console.log("🧪 Step 3/4: Running Playwright tests...\n");
    const testResult = await run(
      ["bunx", "playwright", "test", ...playwrightArgs],
      {
        cwd: WEB_DIR,
        env: {
          DATABASE_URL: E2E_DATABASE_URL,
          // Pass debug mode to Playwright config
          PLAYWRIGHT_DEBUG: isDebugMode ? "true" : "false",
        },
      }
    );

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
