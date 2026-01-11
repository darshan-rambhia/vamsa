#!/usr/bin/env bun
/**
 * Development startup script
 * Starts PostgreSQL, runs migrations, seeds database, and starts dev server
 */

import { $ } from "bun";

const DOCKER_COMPOSE_FILE = "docker/docker-compose.dev.yml";

async function main() {
  console.log("🚀 Starting Vamsa development environment...\n");

  // Start postgres container
  console.log("📦 Starting PostgreSQL...");
  await $`docker-compose -f ${DOCKER_COMPOSE_FILE} up -d`.quiet();

  // Wait for postgres to be ready
  console.log("⏳ Waiting for PostgreSQL to be ready...");
  let ready = false;
  let attempts = 0;
  const maxAttempts = 30;

  while (!ready && attempts < maxAttempts) {
    try {
      const result =
        await $`docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T postgres pg_isready -U vamsa`
          .quiet()
          .nothrow();
      if (result.exitCode === 0) {
        ready = true;
      } else {
        await Bun.sleep(1000);
        attempts++;
      }
    } catch {
      await Bun.sleep(1000);
      attempts++;
    }
  }

  if (!ready) {
    console.error("❌ PostgreSQL failed to start after 30 seconds");
    process.exit(1);
  }
  console.log("✅ PostgreSQL is ready!\n");

  // Push schema to database (creates tables if they don't exist)
  // This is safe for dev - it syncs the schema without migrations
  console.log("🔄 Syncing database schema...");
  await $`pnpm db:push`;
  console.log("");

  // Seed database (ignore errors if already seeded)
  console.log("🌱 Seeding database...");
  await $`pnpm db:seed`.nothrow();
  console.log("");

  // Start dev server
  console.log("🎯 Starting development server...\n");
  await $`turbo run dev --filter=@vamsa/web`;
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
