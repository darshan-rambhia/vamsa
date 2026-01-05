#!/usr/bin/env bun
/**
 * Docker management script for production deployments
 *
 * Usage:
 *   bun run docker build [--sqlite]       # Build Docker image
 *   bun run docker run [--sqlite]         # Run Docker container
 *   bun run docker prod [--sqlite]        # Build and run (production)
 *   bun run docker up [--sqlite]          # Start via docker-compose
 *   bun run docker down [--sqlite]        # Stop via docker-compose
 */

import { $ } from "bun";
import { resolve } from "path";

const command = process.argv[2];
const isSqlite = process.argv.includes("--sqlite");

const projectRoot = resolve(import.meta.dir, "..");

const shellScript = (name: string) => {
  const suffix = isSqlite ? "sqlite" : "";
  return resolve(projectRoot, `scripts/${name}${suffix ? ".sqlite" : ""}.sh`);
};

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

const commands: Record<string, () => Promise<void>> = {
  build: async () => {
    const script = shellScript("build");
    const args = isSqlite ? ["sqlite"] : [];
    console.log(`🐳 Building Docker image${isSqlite ? " (SQLite)" : ""}...`);
    await runCommand("Docker build", ["bash", script, ...args]);
  },

  run: async () => {
    const script = shellScript("run");
    const args = isSqlite ? ["sqlite"] : [];
    console.log(`🐳 Running Docker container${isSqlite ? " (SQLite)" : ""}...`);
    await runCommand("Docker run", ["bash", script, ...args]);
  },

  prod: async () => {
    const buildScript = shellScript("build");
    const runScript = shellScript("run");
    const args = isSqlite ? ["sqlite"] : [];
    console.log(
      `🐳 Building and running production container${isSqlite ? " (SQLite)" : ""}...`
    );
    await runCommand("Docker build", ["bash", buildScript, ...args]);
    await runCommand("Docker run", ["bash", runScript, ...args]);
  },

  up: async () => {
    const script = shellScript("up");
    const args = isSqlite ? ["sqlite"] : [];
    console.log(`🐳 Starting docker-compose${isSqlite ? " (SQLite)" : ""}...`);
    await runCommand("Docker compose up", ["bash", script, ...args]);
  },

  down: async () => {
    const script = shellScript("down");
    const args = isSqlite ? ["sqlite"] : [];
    console.log(`🐳 Stopping docker-compose${isSqlite ? " (SQLite)" : ""}...`);
    await runCommand("Docker compose down", ["bash", script, ...args]);
  },
};

const printUsage = () => {
  console.log(`
Docker Management Commands

Usage: bun run docker <command> [options]

Commands:
  build      Build Docker image
  run        Run Docker container
  prod       Build and run (production workflow)
  up         Start services via docker-compose
  down       Stop services via docker-compose

Options:
  --sqlite   Use SQLite variant (default: PostgreSQL)

Examples:
  bun run docker build
  bun run docker build --sqlite
  bun run docker prod              # Build and run in one step
  bun run docker prod --sqlite
  bun run docker up
  bun run docker up --sqlite
  bun run docker down --sqlite
  `);
};

const main = async () => {
  if (!command || !commands[command]) {
    printUsage();
    process.exit(command ? 1 : 0);
  }

  try {
    await commands[command]();
  } catch {
    console.error("Error");
    process.exit(1);
  }
};

main();
