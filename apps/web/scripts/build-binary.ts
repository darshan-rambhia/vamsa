#!/usr/bin/env bun
/**
 * Build a single compiled binary for Vamsa.
 *
 * Usage:
 *   bun run scripts/build-binary.ts [--output <path>] [--target <bun-target>]
 *
 * Steps:
 *   1. Runs `bun run build` (Vite/TanStack Start) to produce dist/
 *   2. Copies i18n locale files into dist/locales/
 *   3. Runs `bun build --compile` on the server entry point
 *
 * The resulting binary expects these adjacent directories at runtime:
 *   ./dist/client/   — Static assets (CSS, JS, images)
 *   ./dist/server/   — Server bundle (TanStack Start fetch handler)
 *   ./locales/       — i18n translation files
 *   ./data/          — Runtime data (SQLite DB, uploads) — created automatically
 *
 * Environment:
 *   DB_DRIVER=sqlite  — Required for single-binary SQLite mode
 *   DATABASE_URL=./data/vamsa.db  — SQLite database path
 */

import { $ } from "bun";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

function getArg(name: string, defaultValue: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return defaultValue;
}

const outputPath = getArg("output", "./vamsa");
const target = getArg("target", "bun");

const webRoot = path.resolve(import.meta.dirname, "..");

console.log("=== Vamsa Single Binary Build ===\n");

// Step 1: Build the web app (Vite + TanStack Start)
console.log("[1/3] Building web app...");
const buildResult = await $`bun run build`.cwd(webRoot).nothrow();
if (buildResult.exitCode !== 0) {
  console.error("Build failed!");
  process.exit(1);
}
console.log("  Web app built successfully.\n");

// Step 2: Copy i18n locale files
console.log("[2/3] Copying i18n locale files...");
const localesSrc = path.join(webRoot, "src/i18n/locales");
const localesDest = path.join(webRoot, "dist/locales");
await mkdir(localesDest, { recursive: true });
await cp(localesSrc, localesDest, { recursive: true });
console.log(`  Locales copied to dist/locales/\n`);

// Step 3: Compile the server into a single binary
console.log("[3/3] Compiling server binary...");
const serverEntry = path.join(webRoot, "server/index.ts");
const compileResult =
  await $`bun build --compile --target=${target} ${serverEntry} --outfile ${outputPath}`
    .cwd(webRoot)
    .nothrow();
if (compileResult.exitCode !== 0) {
  console.error("Binary compilation failed!");
  process.exit(1);
}

console.log(`\n=== Build Complete ===`);
console.log(`Binary: ${outputPath}`);
console.log(`\nTo run:`);
console.log(`  DB_DRIVER=sqlite DATABASE_URL=./data/vamsa.db ${outputPath}`);
console.log(`\nThe binary expects these adjacent directories:`);
console.log(`  ./dist/client/  — Static assets`);
console.log(`  ./dist/server/  — Server bundle`);
console.log(`  ./dist/locales/ — i18n translations`);
