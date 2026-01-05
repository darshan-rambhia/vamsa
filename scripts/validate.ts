#!/usr/bin/env bun
/**
 * Validation script - runs all checks: lint, typecheck, test, format
 *
 * Usage:
 *   bun run validate              # Run all checks sequentially
 *   bun run validate --parallel   # Run all checks in parallel
 *   bun run validate --check      # Dry-run (no fixes)
 */

import { $ } from "bun";

const args = process.argv.slice(2);
const isParallel = args.includes("--parallel");
const isCheck = args.includes("--check");

const commands = {
  test: ["bun", "test"],
  lint: isCheck ? ["eslint", "."] : ["eslint", ".", "--fix"],
  typecheck: ["tsc"],
  format: isCheck ? ["prettier", "--check", "."] : ["prettier", "--write", "."],
};

const runCommand = async (label: string, cmd: string[]) => {
  console.log(`\n📋 ${label}...`);
  try {
    await $`${cmd}`;
    console.log(`✅ ${label} passed`);
    return true;
  } catch {
    console.error(`❌ ${label} failed`);
    return false;
  }
};

const runParallel = async () => {
  console.log("🚀 Running validation checks in parallel...\n");

  const results = await Promise.allSettled([
    runCommand("Tests", commands.test),
    runCommand("Linting", commands.lint),
    runCommand("Type checking", commands.typecheck),
    runCommand("Formatting", commands.format),
  ]);

  const failures = results.filter((r) => r.status === "rejected" || !r.value);
  if (failures.length > 0) {
    console.error("\n❌ Some checks failed");
    process.exit(1);
  }

  console.log("\n✅ All validation checks passed!");
};

const runSequential = async () => {
  console.log("🚀 Running validation checks sequentially...\n");

  const checks = [
    ["Tests", commands.test],
    ["Linting", commands.lint],
    ["Type checking", commands.typecheck],
    ["Formatting", commands.format],
  ] as const;

  for (const [label, cmd] of checks) {
    const success = await runCommand(label, cmd);
    if (!success) {
      console.error(`\n❌ Validation stopped at ${label}`);
      process.exit(1);
    }
  }

  console.log("\n✅ All validation checks passed!");
};

const main = async () => {
  if (isCheck) {
    console.log("🔍 Running in CHECK mode (no fixes applied)\n");
  }

  if (isParallel) {
    await runParallel();
  } else {
    await runSequential();
  }
};

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
