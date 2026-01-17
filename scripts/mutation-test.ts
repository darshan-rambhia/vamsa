#!/usr/bin/env bun
/**
 * Mutation Testing Script
 *
 * Runs Stryker mutation testing for individual packages in the monorepo.
 *
 * Usage:
 *   bun scripts/mutation-test.ts <package> [--file <pattern>] [--concurrency <n>]
 *
 * Examples:
 *   bun scripts/mutation-test.ts lib                    # Test all of @vamsa/lib
 *   bun scripts/mutation-test.ts lib --file date.ts     # Test specific file
 *   bun scripts/mutation-test.ts ui                     # Test @vamsa/ui
 *   bun scripts/mutation-test.ts web                    # Test apps/web server code
 *   bun scripts/mutation-test.ts api                    # Test @vamsa/api
 */

import { $ } from "bun";
import { existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { logger } from "@vamsa/lib/logger";

interface PackageConfig {
  name: string;
  mutate: string[];
  testCommand: string;
  tsconfigFile: string;
  ignorePatterns: string[];
}

const PACKAGES: Record<string, PackageConfig> = {
  lib: {
    name: "@vamsa/lib",
    mutate: [
      "packages/lib/src/**/*.ts",
      "!packages/lib/src/**/*.test.ts",
      "!packages/lib/src/**/index.ts",
    ],
    testCommand: "bun test packages/lib",
    tsconfigFile: "packages/lib/tsconfig.json",
    ignorePatterns: ["apps", "packages/ui", "packages/api", "packages/schemas"],
  },
  ui: {
    name: "@vamsa/ui",
    mutate: [
      "packages/ui/src/**/*.ts",
      "packages/ui/src/**/*.tsx",
      "!packages/ui/src/**/*.test.ts",
      "!packages/ui/src/**/*.test.tsx",
      "!packages/ui/src/**/index.ts",
      "!packages/ui/src/test-setup.ts",
    ],
    testCommand:
      "bun test --preload ./packages/ui/src/test-setup.ts packages/ui",
    tsconfigFile: "packages/ui/tsconfig.json",
    ignorePatterns: [
      "apps",
      "packages/lib",
      "packages/api",
      "packages/schemas",
    ],
  },
  api: {
    name: "@vamsa/api",
    mutate: [
      "packages/api/src/**/*.ts",
      "!packages/api/src/**/*.test.ts",
      "!packages/api/src/**/index.ts",
    ],
    testCommand: "bun test packages/api",
    tsconfigFile: "packages/api/tsconfig.json",
    ignorePatterns: ["apps", "packages/lib", "packages/ui", "packages/schemas"],
  },
  schemas: {
    name: "@vamsa/schemas",
    mutate: [
      "packages/schemas/src/**/*.ts",
      "!packages/schemas/src/**/*.test.ts",
      "!packages/schemas/src/**/index.ts",
    ],
    testCommand: "bun test packages/schemas",
    tsconfigFile: "packages/schemas/tsconfig.json",
    ignorePatterns: ["apps", "packages/lib", "packages/ui", "packages/api"],
  },
  web: {
    name: "@vamsa/web (server)",
    mutate: [
      "apps/web/src/server/**/*.ts",
      "apps/web/server/**/*.ts",
      "!apps/web/src/server/**/*.test.ts",
      "!apps/web/server/**/*.test.ts",
      "!apps/web/src/server/**/*.function.ts", // Server function wrappers
    ],
    testCommand:
      "bun test --preload ./packages/ui/src/test-setup.ts apps/web/src/server apps/web/server",
    tsconfigFile: "apps/web/tsconfig.json",
    ignorePatterns: [
      "apps/web/src/components",
      "apps/web/src/routes",
      "apps/web/src/hooks",
      "apps/web/src/stories",
      "apps/web/e2e",
      "packages",
    ],
  },
};

// Common ignore patterns for all packages
const COMMON_IGNORE_PATTERNS = [
  "node_modules",
  "dist",
  ".git",
  ".stryker-tmp",
  ".beads",
  ".claude",
  "coverage",
  "test-output",
  "docker",
  "docs",
  "scripts",
  "data",
  "bunfig.toml",
  "*.config.*",
  "*.spec.ts",
  "*.spec.tsx",
];

function parseArgs(): { package: string; file?: string; concurrency: number } {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    logger.info(`
Mutation Testing Script

Usage:
  bun scripts/mutation-test.ts <package> [options]

Packages:
  lib       Test @vamsa/lib (business logic, utilities)
  ui        Test @vamsa/ui (UI components)
  api       Test @vamsa/api (database/Prisma utilities)
  schemas   Test @vamsa/schemas (Zod schemas)
  web       Test @vamsa/web server code (server actions)

Options:
  --file <pattern>      Only mutate files matching pattern (e.g., "date.ts")
  --concurrency <n>     Number of parallel test runners (default: 4)
  --help, -h            Show this help message

Examples:
  bun scripts/mutation-test.ts lib
  bun scripts/mutation-test.ts lib --file date.ts
  bun scripts/mutation-test.ts ui --file button.tsx
  bun scripts/mutation-test.ts web --concurrency 2
`);
    process.exit(0);
  }

  const packageName = args[0];
  let file: string | undefined;
  let concurrency = 4;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      file = args[i + 1];
      i++;
    } else if (args[i] === "--concurrency" && args[i + 1]) {
      concurrency = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { package: packageName, file, concurrency };
}

function generateStrykerConfig(
  pkg: PackageConfig,
  file: string | undefined,
  concurrency: number
): object {
  let mutatePatterns = [...pkg.mutate];

  // If a specific file is requested, filter mutate patterns
  if (file) {
    // Find the base path from the first mutate pattern
    const basePath = pkg.mutate[0].split("/**")[0];
    mutatePatterns = [
      `${basePath}/**/*${file}*`,
      ...pkg.mutate.filter((p) => p.startsWith("!")),
    ];
  }

  return {
    $schema:
      "https://raw.githubusercontent.com/stryker-mutator/stryker-js/master/packages/core/schema/stryker-schema.json",
    packageManager: "pnpm",
    testRunner: "command",
    commandRunner: {
      command: pkg.testCommand,
    },
    checkers: ["typescript"],
    plugins: ["@stryker-mutator/typescript-checker"],
    tsconfigFile: pkg.tsconfigFile,
    typescriptChecker: {
      prioritizePerformanceOverAccuracy: true,
    },
    mutate: mutatePatterns,
    ignorePatterns: [...COMMON_IGNORE_PATTERNS, ...pkg.ignorePatterns],
    reporters: ["html", "clear-text", "progress"],
    htmlReporter: {
      fileName: `test-output/mutation/${pkg.name.replace("@vamsa/", "").replace(/[^a-z0-9]/g, "-")}/index.html`,
    },
    concurrency,
    tempDirName: ".stryker-tmp",
    coverageAnalysis: "off",
    timeoutMS: 30000,
    timeoutFactor: 2.5,
    disableBail: false,
    cleanTempDir: "always",
  };
}

async function main() {
  const { package: packageName, file, concurrency } = parseArgs();

  const pkg = PACKAGES[packageName];
  if (!pkg) {
    logger.error(`Unknown package: ${packageName}`);
    logger.error(`Available packages: ${Object.keys(PACKAGES).join(", ")}`);
    process.exit(1);
  }

  // Check if tsconfig exists
  if (!existsSync(pkg.tsconfigFile)) {
    logger.error(`tsconfig not found: ${pkg.tsconfigFile}`);
    process.exit(1);
  }

  logger.info(`\n🧬 Running mutation tests for ${pkg.name}`);
  if (file) {
    logger.info(`   Filtering to files matching: ${file}`);
  }
  logger.info(`   Concurrency: ${concurrency}`);
  logger.info(`   Test command: ${pkg.testCommand}`);
  logger.info("");

  // Generate temporary stryker config
  const config = generateStrykerConfig(pkg, file, concurrency);
  const tempConfigPath = join(process.cwd(), ".stryker-tmp-config.json");

  try {
    writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));

    // Run stryker with the temporary config (configFile is a positional argument)
    const result = await $`pnpm stryker run ${tempConfigPath}`.nothrow();

    if (result.exitCode !== 0) {
      logger.error("\n❌ Mutation testing failed");
      process.exit(result.exitCode);
    }

    logger.info("\n✅ Mutation testing complete");
    logger.info(
      `   Report: test-output/mutation/${pkg.name.replace("@vamsa/", "").replace(/[^a-z0-9]/g, "-")}/index.html`
    );
  } finally {
    // Clean up temporary config
    if (existsSync(tempConfigPath)) {
      unlinkSync(tempConfigPath);
    }
  }
}

main().catch((error) => {
  logger.error({ error }, "Error");
  process.exit(1);
});
