#!/usr/bin/env bun
/**
 * End-to-End test script
 *
 * Orchestrates:
 * 1. Start PostgreSQL via docker compose
 * 2. Run Playwright tests (with optional ui/headed modes)
 *
 * Usage:
 *   bun run e2e              # Run E2E tests normally
 *   bun run e2e --ui        # Run with Playwright UI
 *   bun run e2e --headed    # Run in headed mode (browser visible)
 */

import { $ } from "bun";

const args = process.argv.slice(2);
const uiMode = args.includes("--ui");
const headedMode = args.includes("--headed");

const runCommand = async (label: string, cmd: string[]) => {
  console.log(`\n📋 ${label}...`);
  try {
    await $`${cmd}`;
    console.log(`✅ ${label} complete`);
  } catch {
    console.error(`❌ ${label} failed`);
    process.exit(1);
  }
};

const main = async () => {
  try {
    // Start PostgreSQL
    await runCommand("Starting PostgreSQL for E2E tests", [
      "bash",
      "./scripts/db-start.sh",
    ]);
    console.log("✅ PostgreSQL ready");

    // Run Playwright tests
    const testCommand = ["playwright", "test"];
    if (uiMode) {
      testCommand.push("--ui");
    } else if (headedMode) {
      testCommand.push("--headed");
    }

    // Note: Database migrations are pre-applied. Prisma 7 requires proper config setup
    // for migrations to work, which will be addressed in a separate task (vamsa-rqc).
    // Test data is seeded by e2e/global-setup.ts before tests run (vamsa-1ca).
    console.log(
      "\n📋 Database ready (migrations pre-applied, test data seeded)"
    );

    console.log(
      `\n📋 Running E2E tests${uiMode ? " (UI mode)" : headedMode ? " (headed)" : ""}...`
    );
    await $`${testCommand}`;
    console.log("✅ E2E tests passed");
  } catch {
    console.error("❌ E2E test setup failed");
    process.exit(1);
  }
};

main();
