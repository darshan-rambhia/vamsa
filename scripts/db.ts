#!/usr/bin/env bun
/**
 * Database management script
 *
 * Usage:
 *   bun run db start      # Start PostgreSQL container
 *   bun run db stop       # Stop PostgreSQL container
 *   bun run db migrate    # Run Prisma migrations
 *   bun run db push       # Push schema to database
 *   bun run db seed       # Seed the database
 *   bun run db generate   # Generate Prisma client
 *   bun run db studio     # Open Prisma Studio
 *   bun run db reset      # Reset database (destructive)
 */

import { $ } from "bun";
import { resolve } from "path";

const command = process.argv[2];

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

const projectRoot = resolve(import.meta.dir, "..");
const dockerComposePath = resolve(projectRoot, "docker/docker-compose.dev.yml");

const commands: Record<string, () => Promise<void>> = {
  start: async () => {
    console.log("🚀 Starting PostgreSQL...");
    // Check if already running
    try {
      await $`docker compose -f ${dockerComposePath} ps --status running db`;
      console.log("✅ PostgreSQL is already running");
      return;
    } catch {
      // Not running, start it
      await runCommand("Starting PostgreSQL container", [
        "docker",
        "compose",
        "-f",
        dockerComposePath,
        "up",
        "-d",
        "--wait",
      ]);
    }
  },

  stop: async () => {
    await runCommand("Stopping PostgreSQL", [
      "docker",
      "compose",
      "-f",
      dockerComposePath,
      "down",
    ]);
  },

  migrate: async () => {
    await runCommand("Running migrations", [
      "bunx",
      "prisma",
      "migrate",
      "dev",
    ]);
  },

  push: async () => {
    await runCommand("Pushing schema to database", [
      "bunx",
      "prisma",
      "db",
      "push",
    ]);
  },

  seed: async () => {
    await runCommand("Seeding database", ["bun", "run", "prisma/seed.ts"]);
  },

  generate: async () => {
    await runCommand("Generating Prisma client", [
      "bunx",
      "prisma",
      "generate",
    ]);
  },

  studio: async () => {
    console.log("🎨 Opening Prisma Studio...");
    await $`bunx prisma studio`;
  },

  reset: async () => {
    console.log("⚠️  Warning: This will delete all data in the database!");
    const confirm = process.argv[3];
    if (confirm !== "--force") {
      console.log("Run with --force to confirm");
      return;
    }
    await runCommand("Resetting database", [
      "bunx",
      "prisma",
      "migrate",
      "reset",
      "--force",
    ]);
  },
};

const printUsage = () => {
  console.log(`
Database Management Commands

Usage: bun run db <command> [options]

Commands:
  start      Start PostgreSQL container
  stop       Stop PostgreSQL container
  migrate    Run pending migrations
  push       Push schema changes to database
  seed       Seed the database with initial data
  generate   Generate Prisma client
  studio     Open Prisma Studio
  reset      Reset database (destructive) - requires --force flag

Examples:
  bun run db start
  bun run db migrate
  bun run db reset --force
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
