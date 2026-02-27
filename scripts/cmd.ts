#!/usr/bin/env bun

import { spawn } from "bun";
import { logger } from "../packages/lib/src/logger";

type Domain =
  | "db"
  | "docker"
  | "docs"
  | "obs"
  | "observability"
  | "prod"
  | "load";

interface CommandDef {
  cmd: string[];
}

const COMMANDS: Record<string, Record<string, CommandDef>> = {
  db: {
    generate: { cmd: ["bun", "run", "--filter", "@vamsa/api", "db:generate"] },
    push: { cmd: ["bun", "run", "--filter", "@vamsa/api", "db:push"] },
    migrate: { cmd: ["bun", "run", "--filter", "@vamsa/api", "db:migrate"] },
    seed: { cmd: ["bun", "run", "--filter", "@vamsa/api", "db:seed"] },
    "seed-dev": {
      cmd: ["bun", "run", "--filter", "@vamsa/api", "db:seed:dev"],
    },
    "seed-e2e": {
      cmd: ["bun", "run", "--filter", "@vamsa/api", "db:seed:e2e"],
    },
    studio: { cmd: ["bun", "run", "--filter", "@vamsa/api", "db:studio"] },
    backup: { cmd: ["bun", "scripts/backup-database.ts", "--type=full"] },
    "backup-pre-migration": {
      cmd: [
        "bun",
        "scripts/backup-database.ts",
        "--type=pre-migration",
        "--verify",
      ],
    },
    "backup-status": { cmd: ["bun", "scripts/backup-database.ts", "--status"] },
    "backup-verify": {
      cmd: ["bun", "scripts/test-backup-restore.ts", "--latest"],
    },
    "backup-verify-docker": {
      cmd: [
        "bun",
        "scripts/test-backup-restore.ts",
        "--latest",
        "--with-docker",
      ],
    },
    "migrate-dry-run": { cmd: ["bun", "scripts/migrate-dry-run.ts"] },
    restore: { cmd: ["bun", "scripts/restore-database.ts"] },
    "restore-list": { cmd: ["bun", "scripts/restore-database.ts", "--list"] },
  },
  docker: {
    up: {
      cmd: [
        "docker",
        "compose",
        "--env-file",
        ".env",
        "-f",
        "docker/docker-compose.yml",
        "up",
        "-d",
      ],
    },
    down: {
      cmd: [
        "docker",
        "compose",
        "--env-file",
        ".env",
        "-f",
        "docker/docker-compose.yml",
        "down",
      ],
    },
    logs: {
      cmd: [
        "docker",
        "compose",
        "--env-file",
        ".env",
        "-f",
        "docker/docker-compose.yml",
        "logs",
        "-f",
      ],
    },
    build: {
      cmd: [
        "docker",
        "build",
        "-f",
        "docker/Dockerfile",
        "-t",
        "vamsa-app",
        ".",
      ],
    },
    "build-ssl-skip": {
      cmd: [
        "docker",
        "build",
        "-f",
        "docker/Dockerfile",
        "-t",
        "vamsa-app",
        "--build-arg",
        "SKIP_SSL_VERIFY=true",
        ".",
      ],
    },
    dev: {
      cmd: [
        "docker",
        "compose",
        "-f",
        "docker/docker-compose.local.yml",
        "--profile",
        "dev",
        "up",
        "-d",
      ],
    },
    "dev-app": {
      cmd: [
        "docker",
        "compose",
        "-f",
        "docker/docker-compose.local.yml",
        "--profile",
        "dev-app",
        "up",
        "-d",
      ],
    },
    "dev-down": {
      cmd: [
        "docker",
        "compose",
        "-f",
        "docker/docker-compose.local.yml",
        "--profile",
        "dev",
        "--profile",
        "dev-app",
        "down",
      ],
    },
    "dev-logs": {
      cmd: [
        "docker",
        "compose",
        "-f",
        "docker/docker-compose.local.yml",
        "--profile",
        "dev",
        "logs",
        "-f",
      ],
    },
    e2e: {
      cmd: [
        "docker",
        "compose",
        "-f",
        "docker/docker-compose.local.yml",
        "--profile",
        "e2e",
        "up",
        "--exit-code-from",
        "e2e",
        "--abort-on-container-exit",
      ],
    },
    "e2e-down": {
      cmd: [
        "docker",
        "compose",
        "-f",
        "docker/docker-compose.local.yml",
        "--profile",
        "e2e",
        "down",
        "-v",
      ],
    },
    "e2e-build": {
      cmd: [
        "docker",
        "build",
        "-t",
        "ghcr.io/darshan-rambhia/vamsa/e2e:local",
        "-f",
        "docker/Dockerfile.e2e",
        ".",
      ],
    },
    backup: {
      cmd: [
        "docker",
        "compose",
        "--env-file",
        ".env",
        "-f",
        "docker/docker-compose.yml",
        "-f",
        "docker/docker-compose.backup.yml",
        "up",
        "-d",
      ],
    },
    "backup-down": {
      cmd: [
        "docker",
        "compose",
        "--env-file",
        ".env",
        "-f",
        "docker/docker-compose.yml",
        "-f",
        "docker/docker-compose.backup.yml",
        "down",
      ],
    },
  },
  prod: {
    start: { cmd: ["bm2", "start", "bm2.config.ts"] },
    stop: { cmd: ["bm2", "stop", "all"] },
    status: { cmd: ["bm2", "list"] },
    logs: { cmd: ["bm2", "logs", "vamsa", "--follow"] },
    reload: { cmd: ["bm2", "reload", "vamsa"] },
  },
  docs: {
    prebuild: { cmd: ["bash", "scripts/docs-prebuild.sh"] },
    dev: {
      cmd: ["bash", "-lc", "bash scripts/docs-prebuild.sh && mkdocs serve"],
    },
    build: {
      cmd: ["bash", "-lc", "bash scripts/docs-prebuild.sh && mkdocs build"],
    },
    "build-docker": {
      cmd: [
        "bash",
        "-lc",
        "bash scripts/docs-prebuild.sh && docker run --rm -v ${PWD}:/docs squidfunk/mkdocs-material build",
      ],
    },
  },
  obs: {
    up: {
      cmd: [
        "docker",
        "compose",
        "--env-file",
        ".env",
        "-f",
        "docker/observability/docker-compose.yml",
        "up",
        "-d",
      ],
    },
    down: {
      cmd: [
        "docker",
        "compose",
        "--env-file",
        ".env",
        "-f",
        "docker/observability/docker-compose.yml",
        "down",
      ],
    },
    logs: {
      cmd: [
        "docker",
        "compose",
        "--env-file",
        ".env",
        "-f",
        "docker/observability/docker-compose.yml",
        "logs",
        "-f",
      ],
    },
  },
};

async function run(cmd: string[], passthrough: string[] = []) {
  const finalCmd = [...cmd, ...passthrough];
  logger.info({ cmd: finalCmd.join(" ") }, "Running command");

  const proc = spawn({
    cmd: finalCmd,
    cwd: process.cwd(),
    env: process.env,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const code = await proc.exited;
  process.exit(code);
}

function printHelp() {
  logger.info(`
Command Center

Usage:
  bun run cmd -- <domain> <action> [...args]

Domains:
  db            Database tasks
  docker        Docker workflows
  docs          Documentation workflows
  obs           Observability workflows
  prod          Production process tasks
  load          k6 load testing

Examples:
  bun run cmd -- db migrate
  bun run cmd -- docker dev
  bun run cmd -- load run search
`);
}

async function main() {
  const [domainArg, actionArg, ...rest] = Bun.argv.slice(2);

  if (!domainArg || domainArg === "-h" || domainArg === "--help") {
    printHelp();
    return;
  }

  if (domainArg === "load") {
    const action = actionArg ?? "run";
    if (action !== "run") {
      logger.error({ action }, "Unsupported load action. Use: run");
      process.exit(2);
    }

    const scenario = rest[0] ?? "mixed";
    const supported = new Set(["mixed", "auth", "people", "search", "detail"]);

    if (!supported.has(scenario)) {
      logger.error({ scenario }, "Invalid load-test scenario");
      process.exit(2);
    }

    const scenarioFiles: Record<string, string> = {
      mixed: "tests/load/mixed.js",
      auth: "tests/load/auth.js",
      people: "tests/load/people-list.js",
      search: "tests/load/search.js",
      detail: "tests/load/person-detail.js",
    };

    await run(["k6", "run", scenarioFiles[scenario]], rest.slice(1));
    return;
  }

  if (domainArg === "observability") {
    logger.warn(
      {
        deprecatedAlias: "observability",
        replacement: "obs",
      },
      "Deprecated domain alias in use. Please migrate to the canonical domain."
    );
  }

  const normalizedDomain: Domain =
    domainArg === "observability" ? "obs" : (domainArg as Domain);

  const domainMap = COMMANDS[normalizedDomain];

  if (!domainMap) {
    logger.error({ domain: domainArg }, "Unsupported domain");
    printHelp();
    process.exit(2);
  }

  const action = actionArg ?? "help";

  if (action === "help") {
    logger.info(
      { actions: Object.keys(domainMap) },
      `Available actions for ${normalizedDomain}`
    );
    return;
  }

  const command = domainMap[action];

  if (!command) {
    logger.error(
      { domain: normalizedDomain, action },
      "Unsupported action for selected domain"
    );
    process.exit(2);
  }

  await run(command.cmd, rest);
}

main().catch((error) => {
  logger.error({ error }, "Command dispatcher failed");
  process.exit(1);
});
