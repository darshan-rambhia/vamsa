#!/usr/bin/env bun
/**
 * Development startup script
 *
 * SQLite mode (default): Zero-dependency local development
 * PostgreSQL mode (DB_DRIVER=postgres): Docker-based, full feature parity
 */

import { $ } from "bun";
import * as fs from "node:fs";
import * as path from "node:path";
import { logger } from "../packages/lib/src/logger";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const SQLITE_DB_PATH = path.join(DATA_DIR, "vamsa-dev.db");

const DOCKER_COMPOSE_FILE = "docker/docker-compose.local.yml";
const DOCKER_PROFILE = "dev";

async function startWithSqlite() {
  logger.info("Starting Vamsa with SQLite (zero-dependency mode)...");

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    logger.info({ path: DATA_DIR }, "Created data directory");
  }

  // Push SQLite schema (creates tables if they don't exist)
  logger.info("Syncing SQLite schema...");
  await $`cd packages/api && DATABASE_URL=${SQLITE_DB_PATH} bunx drizzle-kit push --config=drizzle-sqlite.config.ts --force`;

  // Seed database with dev data (ignore errors if already seeded)
  logger.info("Seeding database with dev data...");
  await $`DB_DRIVER=sqlite DATABASE_URL=${SQLITE_DB_PATH} bun run db:seed:dev`.nothrow();

  // Start dev server with SQLite env vars
  logger.info("Starting development server (SQLite)...");
  await $`DB_DRIVER=sqlite DATABASE_URL=${SQLITE_DB_PATH} bun run --filter @vamsa/web dev`;
}

async function startWithPostgres() {
  logger.info("Starting Vamsa with PostgreSQL (Docker mode)...");

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

  // Push schema to database
  logger.info("Syncing database schema...");
  await $`cd packages/api && bunx drizzle-kit push --force`;

  // Seed database with dev data
  logger.info("Seeding database with dev data...");
  await $`DB_DRIVER=postgres bun run db:seed:dev`.nothrow();

  // Start dev server
  logger.info("Starting development server (PostgreSQL)...");
  await $`DB_DRIVER=postgres bun run --filter @vamsa/web dev`;
}

async function main() {
  const driver = process.env.DB_DRIVER || "sqlite";

  if (driver === "postgres") {
    await startWithPostgres();
  } else {
    await startWithSqlite();
  }
}

main().catch((error) => {
  logger.error(
    { error: error.message },
    "Error starting development environment"
  );
  process.exit(1);
});
