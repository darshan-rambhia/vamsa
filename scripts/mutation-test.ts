#!/usr/bin/env bun
/**
 * Mutation Testing Script
 *
 * Runs Stryker mutation testing for individual packages in the monorepo.
 * Each package has its own stryker.config.json that extends the root config.
 *
 * Usage:
 *   bun scripts/mutation-test.ts [package] [--file <pattern>] [--concurrency <n>]
 *
 * Examples:
 *   bun scripts/mutation-test.ts                        # Test all packages
 *   bun scripts/mutation-test.ts lib                    # Test all of @vamsa/lib
 *   bun scripts/mutation-test.ts lib --file date.ts     # Test specific file
 *   bun scripts/mutation-test.ts schemas --concurrency 8 # Test with 8 workers
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { logger } from "../packages/lib/src/logger";

interface PackageInfo {
  name: string;
  directory: string;
}

const PACKAGES: Record<string, PackageInfo> = {
  lib: {
    name: "@vamsa/lib",
    directory: "packages/lib",
  },
  ui: {
    name: "@vamsa/ui",
    directory: "packages/ui",
  },
  api: {
    name: "@vamsa/api",
    directory: "packages/api",
  },
  schemas: {
    name: "@vamsa/schemas",
    directory: "packages/schemas",
  },
  web: {
    name: "@vamsa/web (server)",
    directory: "apps/web",
  },
};

function parseArgs(): {
  packages: string[];
  file?: string;
  concurrency?: number;
} {
  const args = process.argv.slice(2);

  if (args[0] === "--help" || args[0] === "-h") {
    logger.info(`
Mutation Testing Script

Usage:
  bun scripts/mutation-test.ts [package] [options]

Packages:
  (none)    Test all packages
  lib       Test @vamsa/lib (business logic, utilities)
  ui        Test @vamsa/ui (UI components)
  api       Test @vamsa/api (database/Drizzle utilities)
  schemas   Test @vamsa/schemas (Zod schemas)
  web       Test @vamsa/web server code (server actions)

Options:
  --file <pattern>      Only mutate files matching pattern (e.g., "date.ts")
  --concurrency <n>     Number of parallel test runners (default: from config)
  --help, -h            Show this help message

Examples:
  bun scripts/mutation-test.ts              # Test all packages
  bun scripts/mutation-test.ts lib
  bun scripts/mutation-test.ts lib --file date.ts
  bun scripts/mutation-test.ts ui --file button.tsx
  bun scripts/mutation-test.ts web --concurrency 2
`);
    process.exit(0);
  }

  // If no package specified, run all packages
  let packages: string[];
  let startIndex = 0;

  if (args.length === 0 || args[0].startsWith("--")) {
    packages = Object.keys(PACKAGES);
  } else {
    packages = [args[0]];
    startIndex = 1;
  }

  let file: string | undefined;
  let concurrency: number | undefined;

  for (let i = startIndex; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      file = args[i + 1];
      i++;
    } else if (args[i] === "--concurrency" && args[i + 1]) {
      concurrency = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { packages, file, concurrency };
}

async function runMutationTestsForPackage(
  packageName: string,
  file: string | undefined,
  concurrency: number | undefined
): Promise<boolean> {
  const pkg = PACKAGES[packageName];
  if (!pkg) {
    logger.error(`Unknown package: ${packageName}`);
    logger.error(`Available packages: ${Object.keys(PACKAGES).join(", ")}`);
    return false;
  }

  const configPath = `${pkg.directory}/stryker.config.json`;
  if (!existsSync(configPath)) {
    logger.error(`Stryker config not found: ${configPath}`);
    logger.error(
      "Each package should have its own stryker.config.json that extends the root config."
    );
    return false;
  }

  logger.info(`Running mutation tests for ${pkg.name}`);
  if (file) {
    logger.info(`   Filtering to files matching: ${file}`);
  }
  if (concurrency) {
    logger.info(`   Concurrency: ${concurrency}`);
  }
  logger.info(`   Directory: ${pkg.directory}`);
  logger.info("");

  // Build Stryker CLI arguments
  const args = ["stryker", "run"];

  // Add file filter if specified
  if (file) {
    args.push("--mutate", `src/**/*${file}*`);
  }

  // Add concurrency if specified
  if (concurrency) {
    args.push("--concurrency", concurrency.toString());
  }

  try {
    // Run stryker in the package directory
    const result = await $`cd ${pkg.directory} && bun run ${args}`.nothrow();

    if (result.exitCode !== 0) {
      logger.error(`❌ Mutation testing failed for ${pkg.name}`);
      return false;
    }

    logger.info(`✅ Mutation testing complete for ${pkg.name}`);
    const outputDir = pkg.directory.replace(/^(packages|apps)\//, "");
    logger.info(`   Report: test-output/mutation/${outputDir}/index.html`);
    return true;
  } catch (error) {
    logger.error({ error }, `Failed to run mutation tests for ${pkg.name}`);
    return false;
  }
}

async function main() {
  const { packages, file, concurrency } = parseArgs();

  if (packages.length > 1) {
    logger.info(
      `Running mutation tests for all packages: ${packages.join(", ")}`
    );
  }

  const results: { package: string; success: boolean }[] = [];

  for (const packageName of packages) {
    const success = await runMutationTestsForPackage(
      packageName,
      file,
      concurrency
    );
    results.push({ package: packageName, success });
  }

  // Summary for multiple packages
  if (packages.length > 1) {
    logger.info("📊 Mutation Testing Summary");
    logger.info("─".repeat(40));
    for (const result of results) {
      const status = result.success ? "✅" : "❌";
      logger.info(`   ${status} ${result.package}`);
    }

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      logger.error(`❌ ${failed.length} package(s) failed mutation testing`);
      process.exit(1);
    }

    logger.info(`✅ All ${packages.length} packages passed mutation testing`);
  } else if (!results[0].success) {
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error({ error }, "Error");
  process.exit(1);
});
