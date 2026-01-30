#!/usr/bin/env bun

/**
 * Database backup script for Vamsa
 *
 * Creates a compressed PostgreSQL backup with validation and rotation.
 *
 * Usage:
 *   bun scripts/backup-database.ts --type=full
 *   bun scripts/backup-database.ts --type=incremental
 *   bun scripts/backup-database.ts --type=pre-migration
 *   bun scripts/backup-database.ts --status
 *   bun scripts/backup-database.ts --verify
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   BACKUP_DIR   - Directory for backups (default: ./backups)
 */

import { $ } from "bun";
import * as fs from "fs";
import * as path from "path";

interface BackupConfig {
  retention: number; // days
  schedule: string;
}

const BACKUP_TYPES: Record<string, BackupConfig> = {
  full: { retention: 30, schedule: "daily" },
  incremental: { retention: 7, schedule: "hourly" },
  "pre-migration": { retention: 90, schedule: "manual" },
};

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
    const { stdout } = await $`which pg_dump`;
    if (!stdout) {
      logError("pg_dump is not installed");
      process.exit(1);
    }
  } catch {
    logError("pg_dump is not installed");
    process.exit(1);
  }
}

async function ensureBackupDirectories(backupDir: string): Promise<void> {
  const dirs = [
    backupDir,
    `${backupDir}/daily`,
    `${backupDir}/weekly`,
    `${backupDir}/monthly`,
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

async function createBackup(
  type: keyof typeof BACKUP_TYPES,
  backupDir: string
): Promise<string> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `vamsa-${type}-${timestamp}.sql.gz`;

  // Determine backup subdirectory
  const now = new Date();
  const dayOfMonth = now.getDate();
  const dayOfWeek = now.getDay();

  let backupSubdir = "daily";
  let logPrefix = "Creating daily backup";

  if (dayOfMonth === 1) {
    backupSubdir = "monthly";
    logPrefix = "Creating monthly backup";
  } else if (dayOfWeek === 0) {
    backupSubdir = "weekly";
    logPrefix = "Creating weekly backup";
  }

  const backupPath = path.join(backupDir, backupSubdir, filename);
  logInfo(`${logPrefix}...`);
  logInfo(`Backing up database to ${backupPath}...`);

  try {
    await $`pg_dump ${databaseUrl} | gzip > ${backupPath}`;

    const stats = fs.statSync(backupPath);
    const size = formatBytes(stats.size);
    logInfo(`Backup complete: ${size}`);

    return backupPath;
  } catch (error) {
    logError(
      `Backup failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

async function verifyBackup(backupPath: string): Promise<boolean> {
  logInfo("Verifying backup integrity...");

  // Check if file exists and is not empty
  if (!fs.existsSync(backupPath)) {
    logError("Backup file not found");
    return false;
  }

  const stats = fs.statSync(backupPath);
  if (stats.size === 0) {
    logError("Backup file is empty");
    return false;
  }

  try {
    // Verify gzip integrity
    await $`gzip -t ${backupPath}`;

    // Check if it contains SQL
    const { stdout } = await $`zcat ${backupPath} | head -1`;
    const content = stdout.toString();

    if (!content.includes("PostgreSQL") && !content.includes("pg_dump")) {
      logWarn("Backup may not be valid PostgreSQL dump");
    }

    logInfo("Backup verification passed");
    return true;
  } catch (error) {
    logError(
      `Backup verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

async function rotateBackups(
  backupDir: string,
  type: keyof typeof BACKUP_TYPES
): Promise<void> {
  const config = BACKUP_TYPES[type];
  const retentionMs = config.retention * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Determine which subdirectory to clean
  let subdir = "daily";
  if (type === "pre-migration") {
    subdir = "monthly";
  } else if (type === "incremental") {
    subdir = "daily";
  }

  const backupSubdirPath = path.join(backupDir, subdir);
  if (!fs.existsSync(backupSubdirPath)) {
    return;
  }

  const files = fs.readdirSync(backupSubdirPath);
  let deletedCount = 0;

  for (const file of files) {
    const filePath = path.join(backupSubdirPath, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;

    if (age > retentionMs) {
      fs.unlinkSync(filePath);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    logInfo(`Rotated backups: deleted ${deletedCount} old ${type} backup(s)`);
  }
}

async function showStatus(backupDir: string): Promise<void> {
  logInfo("Backup Status:");

  // Find latest backup
  const allBackups: Array<{ path: string; mtime: number }> = [];

  for (const subdir of ["daily", "weekly", "monthly"]) {
    const subdirPath = path.join(backupDir, subdir);
    if (fs.existsSync(subdirPath)) {
      const files = fs.readdirSync(subdirPath);
      for (const file of files) {
        const filePath = path.join(subdirPath, file);
        const stats = fs.statSync(filePath);
        allBackups.push({ path: filePath, mtime: stats.mtimeMs });
      }
    }
  }

  if (allBackups.length === 0) {
    logWarn("  No backups found");
    return;
  }

  allBackups.sort((a, b) => b.mtime - a.mtime);
  const latest = allBackups[0];
  const ageHours = Math.floor((Date.now() - latest.mtime) / (60 * 60 * 1000));

  logInfo(`  Latest backup: ${path.basename(latest.path)} (${ageHours}h ago)`);

  if (ageHours > 24) {
    logWarn("  WARNING: Latest backup is more than 24 hours old!");
  }

  // Count backups by type
  const dailyCount = fs
    .readdirSync(path.join(backupDir, "daily"))
    .filter((f) => f.endsWith(".sql.gz")).length;
  const weeklyCount = fs
    .readdirSync(path.join(backupDir, "weekly"))
    .filter((f) => f.endsWith(".sql.gz")).length;
  const monthlyCount = fs
    .readdirSync(path.join(backupDir, "monthly"))
    .filter((f) => f.endsWith(".sql.gz")).length;

  logInfo(`  Daily backups: ${dailyCount}`);
  logInfo(`  Weekly backups: ${weeklyCount}`);
  logInfo(`  Monthly backups: ${monthlyCount}`);

  // Total size
  const totalSize = calculateDirSize(backupDir);
  logInfo(`  Total backup size: ${formatBytes(totalSize)}`);
}

function calculateDirSize(dir: string): number {
  let size = 0;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      size += calculateDirSize(filePath);
    } else {
      size += stats.size;
    }
  }

  return size;
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
Database Backup Script for Vamsa

Usage:
  bun scripts/backup-database.ts [command] [options]

Commands:
  --type=full            Full database backup (schema + data) [default]
  --type=incremental     Incremental backup
  --type=pre-migration   Pre-migration backup (higher retention)
  --status              Show backup status
  --verify              Verify latest backup integrity
  --help                Show this help message

Options:
  --verify              Verify backup after creation

Environment:
  DATABASE_URL  PostgreSQL connection string (required)
  BACKUP_DIR    Directory for backups (default: ./backups)

Examples:
  # Create full backup
  bun scripts/backup-database.ts --type=full

  # Create and verify
  bun scripts/backup-database.ts --type=full --verify

  # Show status
  bun scripts/backup-database.ts --status

  # Verify existing backup
  bun scripts/backup-database.ts --verify
`);
}

async function main(): Promise<void> {
  const backupDir = process.env.BACKUP_DIR || "./backups";
  let backupType: keyof typeof BACKUP_TYPES = "full";
  let shouldVerify = false;
  let showHelp_ = false;
  let showStatus_ = false;
  let verifyOnly = false;

  // Parse arguments
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--type=")) {
      const type = arg.replace("--type=", "");
      if (type in BACKUP_TYPES) {
        backupType = type as keyof typeof BACKUP_TYPES;
      } else {
        logError(`Unknown backup type: ${type}`);
        process.exit(1);
      }
    } else if (arg === "--verify" && verifyOnly === false) {
      shouldVerify = true;
    } else if (arg === "--status") {
      showStatus_ = true;
    } else if (arg === "--help") {
      showHelp_ = true;
    } else if (arg === "--verify" && process.argv.length === 3) {
      // If --verify is the only argument, treat as verify-only
      verifyOnly = true;
    }
  }

  if (showHelp_) {
    await showHelp();
    process.exit(0);
  }

  if (showStatus_) {
    await checkPrerequisites();
    await ensureBackupDirectories(backupDir);
    await showStatus(backupDir);
    process.exit(0);
  }

  if (verifyOnly) {
    // Find and verify latest backup
    const allBackups: Array<{ path: string; mtime: number }> = [];
    for (const subdir of ["daily", "weekly", "monthly"]) {
      const subdirPath = path.join(backupDir, subdir);
      if (fs.existsSync(subdirPath)) {
        const files = fs.readdirSync(subdirPath);
        for (const file of files) {
          const filePath = path.join(subdirPath, file);
          const stats = fs.statSync(filePath);
          allBackups.push({ path: filePath, mtime: stats.mtimeMs });
        }
      }
    }

    if (allBackups.length === 0) {
      logError("No backups found");
      process.exit(1);
    }

    allBackups.sort((a, b) => b.mtime - a.mtime);
    const latest = allBackups[0];

    logInfo(`Verifying: ${path.basename(latest.path)}`);
    const verified = await verifyBackup(latest.path);
    process.exit(verified ? 0 : 1);
  }

  logInfo("Starting database backup...");

  try {
    await checkPrerequisites();
    await ensureBackupDirectories(backupDir);

    const backupPath = await createBackup(backupType, backupDir);

    if (shouldVerify) {
      const verified = await verifyBackup(backupPath);
      if (!verified) {
        logError("Backup verification failed!");
        process.exit(1);
      }
    }

    await rotateBackups(backupDir, backupType);
    await showStatus(backupDir);

    logInfo("Backup completed successfully!");
  } catch (error) {
    logError(
      `Fatal error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

main();
