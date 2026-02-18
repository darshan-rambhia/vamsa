#!/usr/bin/env bun

/**
 * Database Migration Dry-Run Script for Vamsa
 *
 * Shows pending migrations without executing them.
 *
 * Usage:
 *   bun scripts/migrate-dry-run.ts
 *   bun scripts/migrate-dry-run.ts --help
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (optional for listing migrations)
 */

import * as fs from "fs";
import * as path from "path";
import { $ } from "bun";

// Color output helpers
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

function log(level: "info" | "warn" | "error", message: string): void {
  const timestamp = new Date().toISOString();
  const prefix =
    level === "info"
      ? `${colors.green}[INFO]${colors.reset}`
      : level === "warn"
        ? `${colors.yellow}[WARN]${colors.reset}`
        : `${colors.red}[ERROR]${colors.reset}`;
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function logInfo(message: string): void {
  log("info", message);
}

function logWarn(message: string): void {
  log("warn", message);
}

function logError(message: string): void {
  log("error", message);
}

function logSection(title: string): void {
  console.log(
    `\n${colors.cyan}${colors.cyan}==== ${title} ====${colors.reset}`
  );
}

/**
 * List all migration files from drizzle directory
 */
function listMigrationFiles(): Array<{ name: string; path: string }> {
  const drizzleDir = path.join(__dirname, "../packages/api/drizzle");

  if (!fs.existsSync(drizzleDir)) {
    logError(`Drizzle directory not found: ${drizzleDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql") && /^\d+_/.test(f))
    .sort();

  return files.map((name) => ({
    name,
    path: path.join(drizzleDir, name),
  }));
}

/**
 * Get applied migrations from database
 */
async function getAppliedMigrations(): Promise<Set<string>> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logWarn("DATABASE_URL not set - cannot check applied migrations");
    return new Set();
  }

  try {
    // Use psql to query migrations table
    const { stdout } =
      await $`psql ${databaseUrl} -t -c "SELECT name FROM \"__drizzle_migrations__\" ORDER BY installed_on DESC" 2>/dev/null || echo ""`;

    const output = stdout.toString().trim();
    if (!output) {
      return new Set();
    }

    const applied = new Set(
      output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    );
    return applied;
  } catch (error) {
    logWarn(
      "Could not query migrations from database - either DATABASE_URL is invalid or migrations table doesn't exist yet"
    );
    return new Set();
  }
}

/**
 * Read and display migration SQL content
 */
function readMigrationContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    logError(
      `Failed to read migration: ${error instanceof Error ? error.message : String(error)}`
    );
    return "";
  }
}

/**
 * Count SQL statements in migration
 */
function countStatements(sql: string): number {
  // Simple counting: split by statement-breakpoint comment
  return sql.split("--> statement-breakpoint").length - 1;
}

async function showHelp(): Promise<void> {
  console.log(`
Database Migration Dry-Run Script for Vamsa

Shows pending migrations without executing them. Allows you to review
the SQL that would be executed before running actual migrations.

Usage:
  bun scripts/migrate-dry-run.ts
  bun scripts/migrate-dry-run.ts --help

Commands:
  --help            Show this help message

Environment:
  DATABASE_URL  PostgreSQL connection string (optional)
                If not set, lists all migration files but cannot determine
                which migrations have already been applied.

Output:
  - Lists all available migration files
  - Shows which migrations have been applied (if DB connected)
  - Displays SQL for pending migrations
  - Shows statement count for each migration

Examples:
  # Show all migrations and pending SQL
  bun scripts/migrate-dry-run.ts

  # With database connection to see what's pending
  DATABASE_URL="postgresql://user:pass@localhost/vamsa" bun scripts/migrate-dry-run.ts
`);
}

async function main(): Promise<void> {
  // Parse arguments
  if (process.argv.slice(2).includes("--help")) {
    await showHelp();
    process.exit(0);
  }

  logInfo("Analyzing database migrations...");

  // Get all migration files
  const allMigrations = listMigrationFiles();

  if (allMigrations.length === 0) {
    logWarn("No migration files found");
    process.exit(0);
  }

  // Get applied migrations from database
  const appliedMigrations = await getAppliedMigrations();

  logSection(`Migration Overview`);
  logInfo(`Total migrations found: ${allMigrations.length}`);
  logInfo(`Applied migrations: ${appliedMigrations.size}`);

  const pending = allMigrations.filter(
    (m) => !appliedMigrations.has(m.name.replace(".sql", ""))
  );
  logInfo(`Pending migrations: ${pending.length}`);

  if (appliedMigrations.size > 0) {
    logSection(`Applied Migrations`);
    allMigrations.forEach((m) => {
      if (appliedMigrations.has(m.name.replace(".sql", ""))) {
        const content = readMigrationContent(m.path);
        const statements = countStatements(content);
        console.log(
          `  ${colors.green}✓${colors.reset} ${m.name} (${statements} statements)`
        );
      }
    });
  }

  if (pending.length === 0) {
    logSection(`Status`);
    logInfo("All migrations have been applied. No pending migrations.");
    process.exit(0);
  }

  // Show pending migrations
  logSection(`Pending Migrations (will be applied with 'bun run db:migrate')`);

  for (const migration of pending) {
    const content = readMigrationContent(migration.path);
    const statements = countStatements(content);

    console.log(`\n${colors.blue}${migration.name}${colors.reset}`);
    console.log(
      `${colors.gray}${statements} SQL statement(s)${colors.reset}\n`
    );

    // Display the SQL content with syntax highlighting info
    const sqlLines = content.split("\n");
    for (const line of sqlLines) {
      if (line.trim() === "") continue;

      // Highlight different SQL keywords
      let highlightedLine = line;
      if (line.includes("CREATE TABLE")) {
        highlightedLine = line.replace(
          "CREATE TABLE",
          `${colors.cyan}CREATE TABLE${colors.reset}`
        );
      } else if (line.includes("ALTER TABLE")) {
        highlightedLine = line.replace(
          "ALTER TABLE",
          `${colors.cyan}ALTER TABLE${colors.reset}`
        );
      } else if (line.includes("DROP TABLE")) {
        highlightedLine = line.replace(
          "DROP TABLE",
          `${colors.red}DROP TABLE${colors.reset}`
        );
      } else if (line.includes("UPDATE")) {
        highlightedLine = line.replace(
          "UPDATE",
          `${colors.yellow}UPDATE${colors.reset}`
        );
      } else if (line.includes("DELETE")) {
        highlightedLine = line.replace(
          "DELETE",
          `${colors.red}DELETE${colors.reset}`
        );
      } else if (line.includes("INSERT")) {
        highlightedLine = line.replace(
          "INSERT",
          `${colors.green}INSERT${colors.reset}`
        );
      }

      console.log(`  ${highlightedLine}`);
    }
  }

  logSection(`Summary`);
  console.log(
    `  ${colors.yellow}${pending.length} migration(s) ready to apply${colors.reset}`
  );
  console.log(
    `  ${colors.gray}Run: ${colors.cyan}bun run db:migrate${colors.gray} to apply${colors.reset}`
  );

  process.exit(0);
}

main().catch((error) => {
  logError(
    `Fatal error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
