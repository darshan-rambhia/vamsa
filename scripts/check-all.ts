#!/usr/bin/env bun
/**
 * Run all quality checks in parallel
 *
 * Runs lint, format check, typecheck, and tests concurrently using Bun's spawn.
 * Outputs each process's output sequentially (not interleaved) for readability.
 * Fails if any command fails and returns the exit code of the last failed process.
 *
 * Usage:
 *   bun scripts/check-all.ts
 */

import { spawn } from "bun";
import { logger } from "../packages/lib/src/logger";

interface ProcessResult {
  name: string;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

const CHECKS = [
  { name: "Lint", command: "pnpm lint" },
  { name: "Format", command: "pnpm format:check" },
  { name: "Typecheck", command: "pnpm typecheck" },
  { name: "Test", command: "pnpm test" },
];

async function runCommand(
  name: string,
  command: string
): Promise<ProcessResult> {
  const startTime = Date.now();

  logger.info(`🚀 Starting ${name}...`);

  const proc = spawn({
    cmd: command.split(" "),
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const duration = Date.now() - startTime;

  return { name, command, exitCode, stdout, stderr, duration };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function main() {
  const startTime = Date.now();

  logger.info("🔍 Running all quality checks in parallel...\n");

  // Run all checks in parallel
  const results = await Promise.all(
    CHECKS.map((check) => runCommand(check.name, check.command))
  );

  // Output results sequentially
  logger.info("\n" + "=".repeat(80));
  logger.info("📊 RESULTS");
  logger.info("=".repeat(80) + "\n");

  for (const result of results) {
    const status = result.exitCode === 0 ? "✅ PASSED" : "❌ FAILED";
    const icon = result.exitCode === 0 ? "✅" : "❌";

    logger.info(
      `${icon} ${result.name} (${formatDuration(result.duration)}) - ${status}`
    );
    logger.info("-".repeat(80));

    if (result.stdout) {
      process.stdout.write(result.stdout);
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    logger.info("");
  }

  // Summary
  const totalDuration = Date.now() - startTime;
  const passed = results.filter((r) => r.exitCode === 0);
  const failed = results.filter((r) => r.exitCode !== 0);

  logger.info("=".repeat(80));
  logger.info("📈 SUMMARY");
  logger.info("=".repeat(80));
  logger.info(
    `Total: ${results.length} checks | Passed: ${passed.length} | Failed: ${failed.length}`
  );
  logger.info(`Duration: ${formatDuration(totalDuration)}`);
  logger.info("=".repeat(80) + "\n");

  if (failed.length > 0) {
    logger.error("❌ Some checks failed:\n");
    for (const result of failed) {
      logger.error(`  - ${result.name} (exit code: ${result.exitCode})`);
    }
    // Return exit code of the last failed process
    process.exit(failed[failed.length - 1].exitCode);
  }

  logger.info("✅ All checks passed!");
  process.exit(0);
}

main().catch((error) => {
  logger.error({ error }, "Failed to run checks");
  process.exit(1);
});
