#!/usr/bin/env bun

/**
 * Database restore script for Vamsa
 *
 * Restores a PostgreSQL backup created by backup-database.ts or backup-db.sh
 *
 * Usage:
 *   bun scripts/restore-database.ts <backup_file.sql.gz>
 *   bun scripts/restore-database.ts <backup_file.sql.gz> --dry-run
 *   bun scripts/restore-database.ts --list
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   BACKUP_DIR   - Directory containing backups (default: ./backups)
 *
 * WARNING: This will DROP and recreate the database!
 */

import { $ } from "bun";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Color output helpers
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
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

async function checkPrerequisites(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logError("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  try {
    const { stdout } = await $`which psql`;
    if (!stdout) {
      logError("psql is not installed");
      process.exit(1);
    }
  } catch {
    logError("psql is not installed");
    process.exit(1);
  }
}

function getDatabaseName(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  // Extract database name from URL: postgresql://user:pass@host/dbname
  const match = databaseUrl.match(/\/([^?]+)(?:\?|$)/);
  if (!match) {
    throw new Error("Could not parse database name from DATABASE_URL");
  }

  return match[1];
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function confirmRestore(backupPath: string): Promise<boolean> {
  const dbName = getDatabaseName();

  logWarn(`This will restore ${backupPath} to database: ${dbName}`);
  logWarn("All existing data will be LOST!");
  console.log("");

  const confirm = await prompt(
    `${colors.yellow}Are you sure you want to continue? (type 'yes' to confirm):${colors.reset} `
  );

  if (confirm !== "yes") {
    logInfo("Restore cancelled");
    return false;
  }

  return true;
}

async function verifyBackupFile(backupPath: string): Promise<boolean> {
  logInfo("Verifying backup integrity...");

  // Check if file exists
  if (!fs.existsSync(backupPath)) {
    logError(`Backup file not found: ${backupPath}`);
    return false;
  }

  // Check if file is not empty
  const stats = fs.statSync(backupPath);
  if (stats.size === 0) {
    logError("Backup file is empty");
    return false;
  }

  try {
    // Verify gzip integrity
    await $`gzip -t ${backupPath}`;

    const size = formatBytes(stats.size);
    logInfo(`Backup file valid (${size})`);
    return true;
  } catch (error) {
    logError(
      `Backup file is corrupted: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

async function createSafetyBackup(backupDir: string): Promise<string> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safetyBackupPath = path.join(
    backupDir,
    `safety-backup-${timestamp}.sql.gz`
  );

  logInfo("Creating safety backup of current database...");

  try {
    await $`pg_dump ${databaseUrl} | gzip > ${safetyBackupPath}`;
    const stats = fs.statSync(safetyBackupPath);
    const size = formatBytes(stats.size);
    logInfo(`Safety backup created: ${safetyBackupPath} (${size})`);
    return safetyBackupPath;
  } catch (error) {
    logError(
      `Failed to create safety backup: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

async function restoreBackup(
  backupPath: string,
  dryRun: boolean = false
): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (dryRun) {
    logInfo("[DRY RUN] Would restore from: " + backupPath);
    const stats = fs.statSync(backupPath);
    logInfo(`[DRY RUN] Backup size: ${formatBytes(stats.size)}`);
    logInfo("[DRY RUN] No changes made");
    return;
  }

  logInfo(`Restoring database from ${path.basename(backupPath)}...`);

  try {
    await $`zcat ${backupPath} | psql ${databaseUrl} --quiet`;
    logInfo("Restore complete!");
  } catch (error) {
    logError(
      `Restore failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

async function listBackups(backupDir: string): Promise<void> {
  logInfo("Available backups:");
  console.log("");

  const backups: Array<{ path: string; mtime: number; size: number }> = [];

  for (const subdir of ["daily", "weekly", "monthly"]) {
    const subdirPath = path.join(backupDir, subdir);
    if (fs.existsSync(subdirPath)) {
      const files = fs.readdirSync(subdirPath);
      for (const file of files) {
        if (file.endsWith(".sql.gz")) {
          const filePath = path.join(subdirPath, file);
          const stats = fs.statSync(filePath);
          backups.push({
            path: filePath,
            mtime: stats.mtimeMs,
            size: stats.size,
          });
        }
      }
    }
  }

  // Also list safety backups
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    for (const file of files) {
      if (file.startsWith("safety-backup-") && file.endsWith(".sql.gz")) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        backups.push({
          path: filePath,
          mtime: stats.mtimeMs,
          size: stats.size,
        });
      }
    }
  }

  if (backups.length === 0) {
    console.log("  No backups found");
    return;
  }

  // Sort by mtime descending
  backups.sort((a, b) => b.mtime - a.mtime);

  // Display backups with relative paths
  for (let i = 0; i < Math.min(backups.length, 20); i++) {
    const backup = backups[i];
    const basename = path.basename(backup.path);
    const size = formatBytes(backup.size);
    const age = getAgeString(backup.mtime);

    console.log(`  ${basename.padEnd(60)} ${size.padStart(12)}  (${age})`);
  }

  if (backups.length > 20) {
    console.log(`  ... and ${backups.length - 20} more`);
  }
}

function getAgeString(mtimeMs: number): string {
  const ageMs = Date.now() - mtimeMs;
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const ageHours = Math.floor(
    (ageMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
  );
  const ageMins = Math.floor((ageMs % (60 * 60 * 1000)) / (60 * 1000));

  if (ageDays > 0) {
    return `${ageDays}d ${ageHours}h ago`;
  } else if (ageHours > 0) {
    return `${ageHours}h ${ageMins}m ago`;
  } else {
    return `${ageMins}m ago`;
  }
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function showHelp(): Promise<void> {
  console.log(`
Database Restore Script for Vamsa

Usage:
  bun scripts/restore-database.ts <backup_file.sql.gz> [options]
  bun scripts/restore-database.ts [command]

Commands:
  --list                List available backups
  --help                Show this help message

Options:
  --dry-run             Show what would be done without making changes

Environment:
  DATABASE_URL  PostgreSQL connection string (required)
  BACKUP_DIR    Directory containing backups (default: ./backups)

Examples:
  # List available backups
  bun scripts/restore-database.ts --list

  # Dry run before restoring
  bun scripts/restore-database.ts ./backups/daily/backup_20240101.sql.gz --dry-run

  # Restore from backup
  bun scripts/restore-database.ts ./backups/daily/backup_20240101.sql.gz

WARNING:
  This will DROP and recreate the database!
  A safety backup will be created before restoration.
`);
}

async function main(): Promise<void> {
  const backupDir = process.env.BACKUP_DIR || "./backups";
  let backupFile = "";
  let dryRun = false;
  let showHelp_ = false;
  let listBackups_ = false;

  // Parse arguments
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--list") {
      listBackups_ = true;
    } else if (arg === "--help") {
      showHelp_ = true;
    } else if (!arg.startsWith("--")) {
      backupFile = arg;
    }
  }

  if (showHelp_) {
    await showHelp();
    process.exit(0);
  }

  if (listBackups_) {
    await listBackups(backupDir);
    process.exit(0);
  }

  if (!backupFile) {
    logError("Backup file is required");
    await showHelp();
    process.exit(1);
  }

  try {
    await checkPrerequisites();

    if (!(await verifyBackupFile(backupFile))) {
      process.exit(1);
    }

    if (!dryRun) {
      const confirm = await confirmRestore(backupFile);
      if (!confirm) {
        process.exit(0);
      }

      // Create safety backup
      await createSafetyBackup(backupDir);
    }

    await restoreBackup(backupFile, dryRun);

    if (dryRun) {
      logInfo("Dry run completed. No changes made.");
    } else {
      logInfo("Restore completed successfully!");
    }
  } catch (error) {
    logError(
      `Fatal error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

main();
