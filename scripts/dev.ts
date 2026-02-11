#!/usr/bin/env bun
/**
 * Development startup script
 * Starts PostgreSQL, runs migrations, seeds database, and starts dev server
 */

import { $ } from "bun";
import { logger } from "../packages/lib/src/logger";

const DOCKER_COMPOSE_FILE = "docker/docker-compose.local.yml";
const DOCKER_PROFILE = "dev";

async function main() {
  logger.info("Starting Vamsa development environment...");

  // Start postgres container
  logger.info("Starting PostgreSQL...");
  await $`docker compose -f ${DOCKER_COMPOSE_FILE} --profile ${DOCKER_PROFILE} up -d`.quiet();

  // Wait for postgres to be ready
  logger.info("Waiting for PostgreSQL to be ready...");
  let ready = false;
  let attempts = 0;
  const maxAttempts = 30;

  while (!ready && attempts < maxAttempts) {
    try {
      const result =
        await $`docker compose -f ${DOCKER_COMPOSE_FILE} --profile ${DOCKER_PROFILE} exec -T db pg_isready -U vamsa`
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
    logger.error("PostgreSQL failed to start after 30 seconds");
    process.exit(1);
  }
  logger.info("PostgreSQL is ready!");

  // Push schema to database (creates tables if they don't exist)
  // This is safe for dev - it syncs the schema without migrations
  // Using --force to skip interactive confirmation in dev environment
  logger.info("Syncing database schema...");
  await $`cd packages/api && bunx drizzle-kit push --force`;

  // Seed database with dev data (ignore errors if already seeded)
  logger.info("Seeding database with dev data...");
  await $`bun run db:seed:dev`.nothrow();

  // Start dev server
  logger.info("Starting development server...");
  await $`bun run --filter @vamsa/web dev`;
}

main().catch((error) => {
  logger.error(
    { error: error.message },
    "Error starting development environment"
  );
  process.exit(1);
});
