#!/usr/bin/env bun

import { spawn } from "bun";
import { logger } from "../packages/lib/src/logger";

type TestMode = "unit" | "integration" | "e2e" | "mutation" | "ci" | "focus";

interface ParsedArgs {
  mode: TestMode;
  db: "sqlite" | "postgres";
  suite?: "unit" | "integration" | "e2e" | "visual" | "perf" | "mutation";
  coverage: boolean;
  updateSnapshots: boolean;
  passthrough: string[];
}

const LEGACY_TEST_SCRIPT_REPLACEMENTS: Record<string, string> = {
  "test:unit": "bun run test",
  "test:int": "bun run test:integration --db sqlite",
  "test:int:sqlite": "bun run test:integration --db sqlite",
  "test:int:postgres": "bun run test:integration --db postgres",
  "test:perf": "bun run test:focus --suite perf",
  "test:visual": "bun run test:focus --suite visual",
  "test:visual:update": "bun run test:focus --suite visual --update-snapshots",
  "test:mutation": "bun run test:focus --suite mutation",
};

function warnIfDeprecatedAliasUsed() {
  const lifecycleEvent = process.env.npm_lifecycle_event;
  if (!lifecycleEvent) return;

  const replacement = LEGACY_TEST_SCRIPT_REPLACEMENTS[lifecycleEvent];
  if (!replacement) return;

  logger.warn(
    {
      deprecatedScript: lifecycleEvent,
      replacement,
    },
    "Deprecated test alias in use. Please migrate to the canonical command."
  );
}

function parseArgs(argv: string[]): ParsedArgs {
  const [modeArg, ...rest] = argv;
  const mode = (modeArg ?? "unit") as TestMode;

  let db: "sqlite" | "postgres" = "sqlite";
  let suite: ParsedArgs["suite"];
  let coverage = false;
  let updateSnapshots = false;
  const passthrough: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];

    if (arg === "--") {
      passthrough.push(...rest.slice(i + 1));
      break;
    }

    if (arg === "--db" && rest[i + 1]) {
      const candidate = rest[++i];
      if (candidate === "sqlite" || candidate === "postgres") {
        db = candidate;
      }
      continue;
    }

    if (arg === "--suite" && rest[i + 1]) {
      const candidate = rest[++i] as ParsedArgs["suite"];
      suite = candidate;
      continue;
    }

    if (arg === "--coverage") {
      coverage = true;
      continue;
    }

    if (arg === "--update-snapshots") {
      updateSnapshots = true;
      continue;
    }

    passthrough.push(arg);
  }

  return { mode, db, suite, coverage, updateSnapshots, passthrough };
}

async function run(cmd: string[], env?: NodeJS.ProcessEnv) {
  logger.info({ cmd: cmd.join(" ") }, "Running test command");

  const proc = spawn({
    cmd,
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const code = await proc.exited;

  if (code !== 0) {
    process.exit(code);
  }
}

function unitVitestCommand(coverage: boolean, passthrough: string[]): string[] {
  const base = [
    "bun",
    "--bun",
    "vitest",
    "run",
    "--config",
    "vitest.config.ts",
    "--project",
    "schemas",
    "--project",
    "client",
    "--project",
    "query-hooks",
    "--project",
    "api",
    "--project",
    "lib",
    "--project",
    "ui",
  ];

  if (coverage) base.push("--coverage");
  base.push(...passthrough);
  return base;
}

async function runMode(args: ParsedArgs) {
  switch (args.mode) {
    case "unit": {
      await run(unitVitestCommand(args.coverage, args.passthrough));
      return;
    }

    case "integration": {
      if (args.db === "postgres") {
        await run([
          "bun",
          "run",
          "--filter",
          "@vamsa/web",
          "test:int:postgres",
          ...args.passthrough,
        ]);
      } else {
        await run(
          [
            "bun",
            "run",
            "--filter",
            "@vamsa/web",
            "test:int:sqlite",
            ...args.passthrough,
          ],
          {
            DB_DRIVER: "sqlite",
            DATABASE_URL: ":memory:",
          }
        );
      }
      return;
    }

    case "e2e": {
      const e2eArgs = [...args.passthrough];
      if (args.updateSnapshots) {
        e2eArgs.push("--update-snapshots");
      }
      await run([
        "bun",
        "run",
        "--filter",
        "@vamsa/web",
        "test:e2e",
        ...e2eArgs,
      ]);
      return;
    }

    case "mutation": {
      await run(["bun", "scripts/mutation-test.ts", ...args.passthrough]);
      return;
    }

    case "ci": {
      await run(unitVitestCommand(true, []));
      await run(["bun", "run", "--filter", "@vamsa/web", "test:int:sqlite"]);
      await run(["bun", "run", "--filter", "@vamsa/web", "test:int:postgres"]);
      return;
    }

    case "focus": {
      const suite = args.suite ?? "unit";
      if (suite === "unit") {
        await run(unitVitestCommand(args.coverage, args.passthrough));
        return;
      }

      if (suite === "integration") {
        await runMode({ ...args, mode: "integration" });
        return;
      }

      if (suite === "e2e") {
        await runMode({ ...args, mode: "e2e" });
        return;
      }

      if (suite === "visual") {
        await run([
          "bun",
          "run",
          "--filter",
          "@vamsa/web",
          "test:visual",
          ...args.passthrough,
          ...(args.updateSnapshots ? ["--update-snapshots"] : []),
        ]);
        return;
      }

      if (suite === "perf") {
        await run([
          "bun",
          "run",
          "--filter",
          "@vamsa/web",
          "test:perf",
          ...args.passthrough,
        ]);
        return;
      }

      await runMode({ ...args, mode: "mutation" });
      return;
    }

    default: {
      logger.error(
        { mode: args.mode },
        "Invalid test mode. Use one of: unit, integration, e2e, mutation, ci, focus"
      );
      process.exit(2);
    }
  }
}

async function main() {
  warnIfDeprecatedAliasUsed();
  const args = parseArgs(Bun.argv.slice(2));
  await runMode(args);
}

main().catch((error) => {
  logger.error({ error }, "Failed to run test dispatcher");
  process.exit(1);
});
