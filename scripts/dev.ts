#!/usr/bin/env bun
/**
 * Development server startup script
 *
 * Orchestrates:
 * 1. Start PostgreSQL via docker compose
 * 2. Run Prisma migrations
 * 3. Start Next.js dev server
 */

import { $ } from "bun";

// Load environment variables from .env file
const loadEnv = async () => {
  try {
    const envFile = await Bun.file(".env").text();
    envFile.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        let value = valueParts.join("=").trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch {
    // .env file not found, use defaults
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = "postgresql://vamsa:password@localhost:5432/vamsa";
    }
  }
};

const runCommand = async (label: string, command: string[]) => {
  console.log(`\n📋 ${label}...`);
  try {
    // Execute command with inherited environment
    const proc = Bun.spawn(command, {
      env: process.env as Record<string, string>,
      stdio: ["inherit", "inherit", "inherit"],
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`Command failed with exit code ${exitCode}`);
    }
  } catch {
    console.error(`❌ ${label} failed`);
    process.exit(1);
  }
};

const main = async () => {
  try {
    // Step 1: Start PostgreSQL
    await runCommand("Starting PostgreSQL", ["bash", "./scripts/db-start.sh"]);
    console.log("✅ PostgreSQL started");

    // Step 2: Run Prisma migrations
    const dbUrl = process.env.DATABASE_URL;
    await runCommand("Running Prisma migrations", [
      "bunx",
      "prisma",
      "migrate",
      "dev",
      ...(dbUrl ? ["--url", dbUrl] : []),
    ]);
    console.log("✅ Migrations complete");

    // Step 3: Start Next.js dev server
    console.log("\n📋 Starting Next.js dev server...");
    console.log("🎉 Dev environment ready!\n");
    await $`next dev`;
  } catch {
    console.error("❌ Development setup failed");
    process.exit(1);
  }
};

const cleanup = async () => {
  console.log("\n\n🛑 Shutting down...");
  try {
    console.log("📋 Stopping PostgreSQL...");
    const proc = Bun.spawn(["docker", "compose", "-f", "docker/docker-compose.dev.yml", "down"], {
      stdio: ["inherit", "inherit", "inherit"],
    });
    await proc.exited;
    console.log("✅ PostgreSQL stopped");
  } catch {
    console.error("⚠️  Failed to stop PostgreSQL gracefully");
  }
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

await loadEnv();
main();
