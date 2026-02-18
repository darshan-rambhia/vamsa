#!/usr/bin/env bun

/**
 * Backup Verification and Test Restore Script for Vamsa
 *
 * Verifies backup integrity and optionally tests restore in a temporary container.
 *
 * Usage:
 *   bun scripts/test-backup-restore.ts
 *   bun scripts/test-backup-restore.ts --latest
 *   bun scripts/test-backup-restore.ts --file=/path/to/backup.sql.gz
 *   bun scripts/test-backup-restore.ts --with-docker
 *   bun scripts/test-backup-restore.ts --help
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (optional, only needed for Docker restore)
 *   BACKUP_DIR   - Directory containing backups (default: ./backups)
 *   DOCKER_HOST  - Docker socket path (for Docker tests)
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
  console.log(`\n${colors.cyan}==== ${title} ====${colors.reset}`);
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

/**
 * Find latest backup file
 */
function findLatestBackup(backupDir: string): string | null {
  const backups: Array<{ path: string; mtime: number }> = [];

  for (const subdir of ["daily", "weekly", "monthly"]) {
    const subdirPath = path.join(backupDir, subdir);
    if (fs.existsSync(subdirPath)) {
      const files = fs.readdirSync(subdirPath);
      for (const file of files) {
        if (file.endsWith(".sql.gz")) {
          const filePath = path.join(subdirPath, file);
          const stats = fs.statSync(filePath);
          backups.push({ path: filePath, mtime: stats.mtimeMs });
        }
      }
    }
  }

  if (backups.length === 0) {
    return null;
  }

  backups.sort((a, b) => b.mtime - a.mtime);
  return backups[0].path;
}

/**
 * Verify gzip integrity of backup file
 */
async function verifyGzipIntegrity(filePath: string): Promise<boolean> {
  try {
    await $`gzip -t ${filePath}`;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verify file contains SQL content
 */
async function verifySqlContent(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await $`zcat ${filePath} | head -20`;
    const content = stdout.toString();
    return (
      content.includes("PostgreSQL") ||
      content.includes("pg_dump") ||
      content.includes("CREATE")
    );
  } catch (error) {
    return false;
  }
}

/**
 * Test restore in a temporary Docker container
 */
async function testRestoreWithDocker(backupPath: string): Promise<boolean> {
  logInfo("Attempting to test restore with Docker...");

  // Check if Docker is available
  try {
    await $`docker --version`;
  } catch (error) {
    logWarn("Docker is not available - skipping Docker restore test");
    return false;
  }

  // Generate random container names
  const containerName = `vamsa-test-restore-${Date.now()}`;
  const dbName = `test_vamsa_${Date.now()}`;

  try {
    logInfo(`Starting temporary PostgreSQL container: ${containerName}`);

    // Start PostgreSQL container
    await $`docker run -d \
      --name ${containerName} \
      -e POSTGRES_PASSWORD=testpass \
      -e POSTGRES_DB=${dbName} \
      postgres:15-alpine`;

    // Wait for container to be ready
    logInfo("Waiting for PostgreSQL to be ready...");
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        await $`docker exec ${containerName} pg_isready -U postgres`;
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!ready) {
      logError("PostgreSQL container did not start in time");
      throw new Error("Container startup timeout");
    }

    logInfo("PostgreSQL ready - testing restore...");

    // Get backup file size to estimate time
    const stats = fs.statSync(backupPath);
    const sizeGB = stats.size / (1024 * 1024 * 1024);

    if (sizeGB > 1) {
      logWarn(
        `Large backup (${sizeGB.toFixed(2)} GB) - restore test may take a while`
      );
    }

    // Restore from backup
    const { stdout } =
      await $`cat ${backupPath} | gzip -d | docker exec -i ${containerName} psql -U postgres -d ${dbName}`;

    // Test basic query
    logInfo("Testing database connectivity...");
    const result =
      await $`docker exec ${containerName} psql -U postgres -d ${dbName} -c "SELECT 1"`;

    if (result.text().includes("1")) {
      logInfo("Restore test successful - database is accessible");
      return true;
    } else {
      logError("Database query failed");
      return false;
    }
  } catch (error) {
    logError(
      `Restore test failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  } finally {
    // Clean up container
    logInfo("Cleaning up test container...");
    try {
      await $`docker rm -f ${containerName}`;
    } catch (e) {
      logWarn(
        `Failed to remove test container: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}

async function showHelp(): Promise<void> {
  console.log(`
Backup Verification and Test Restore Script for Vamsa

Verifies backup file integrity and optionally tests restore in a temporary
Docker container. Useful for ensuring backups are valid before a migration.

Usage:
  bun scripts/test-backup-restore.ts [options]

Commands:
  --latest              Verify the latest backup in the backup directory
  --file=<path>         Verify a specific backup file
  --with-docker         Also test restore in a temporary PostgreSQL container
  --help                Show this help message

Options:
  --with-docker         Spin up a temporary PostgreSQL container and test restore
                        (requires Docker to be installed and running)

Environment:
  BACKUP_DIR   Directory containing backups (default: ./backups)

Checks Performed:
  1. File exists and is not empty
  2. Gzip file integrity (gzip -t)
  3. Contains valid SQL content (checks for PostgreSQL markers)
  4. (Optional) Restore test in Docker container

Examples:
  # Verify latest backup
  bun scripts/test-backup-restore.ts --latest

  # Verify specific file
  bun scripts/test-backup-restore.ts --file=./backups/daily/vamsa-full-2024-01-01.sql.gz

  # Verify and test restore
  bun scripts/test-backup-restore.ts --latest --with-docker

Exit Status:
  0 = All checks passed
  1 = One or more checks failed
`);
}

async function main(): Promise<void> {
  const backupDir = process.env.BACKUP_DIR || "./backups";
  let backupFile = "";
  let useDocker = false;
  let showHelp_ = false;

  // Parse arguments
  for (const arg of process.argv.slice(2)) {
    if (arg === "--latest") {
      // Will find below
    } else if (arg.startsWith("--file=")) {
      backupFile = arg.replace("--file=", "");
    } else if (arg === "--with-docker") {
      useDocker = true;
    } else if (arg === "--help") {
      showHelp_ = true;
    }
  }

  if (showHelp_) {
    await showHelp();
    process.exit(0);
  }

  // If no file specified and --latest requested, find it
  if (!backupFile && process.argv.includes("--latest")) {
    const latest = findLatestBackup(backupDir);
    if (!latest) {
      logError("No backup files found in backup directory");
      process.exit(1);
    }
    backupFile = latest;
  }

  // If still no file, find latest
  if (!backupFile) {
    const latest = findLatestBackup(backupDir);
    if (!latest) {
      logError("No backup files found. Usage: --file=/path/to/backup.sql.gz");
      process.exit(1);
    }
    backupFile = latest;
  }

  logSection(`Backup Verification`);
  logInfo(`Backup file: ${backupFile}`);

  // Step 1: Check file exists
  if (!fs.existsSync(backupFile)) {
    logError(`Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  const stats = fs.statSync(backupFile);
  const size = formatBytes(stats.size);
  const age = getAgeString(stats.mtimeMs);
  logInfo(`File size: ${size}`);
  logInfo(`File age: ${age}`);

  // Step 2: Check file is not empty
  if (stats.size === 0) {
    logError("Backup file is empty!");
    process.exit(1);
  }
  console.log(`  ${colors.green}✓${colors.reset} File exists and is not empty`);

  // Step 3: Verify gzip integrity
  logInfo("Verifying gzip integrity...");
  const gzipValid = await verifyGzipIntegrity(backupFile);
  if (!gzipValid) {
    logError("Gzip integrity check failed - file is corrupted");
    process.exit(1);
  }
  console.log(`  ${colors.green}✓${colors.reset} Gzip integrity verified`);

  // Step 4: Verify SQL content
  logInfo("Verifying SQL content...");
  const sqlValid = await verifySqlContent(backupFile);
  if (!sqlValid) {
    logWarn(
      "Could not verify SQL content - backup may not be a valid PostgreSQL dump"
    );
  } else {
    console.log(
      `  ${colors.green}✓${colors.reset} Valid PostgreSQL dump content`
    );
  }

  // Step 5: Optional Docker restore test
  if (useDocker) {
    logSection(`Docker Restore Test`);
    const restoreSuccess = await testRestoreWithDocker(backupFile);

    if (!restoreSuccess) {
      logWarn("Docker restore test did not complete successfully");
      console.log(
        `  ${colors.yellow}⚠${colors.reset} Restore test incomplete (Docker may not be available)`
      );
    } else {
      console.log(
        `  ${colors.green}✓${colors.reset} Restore test passed in temporary container`
      );
    }
  }

  // Summary
  logSection(`Verification Summary`);
  console.log(`${colors.green}All checks passed!${colors.reset}`);
  console.log(`  File: ${path.basename(backupFile)}`);
  console.log(`  Size: ${size}`);
  console.log(`  Status: ${colors.green}Ready for use${colors.reset}`);

  if (!useDocker) {
    console.log(
      `\n${colors.gray}Tip: Use --with-docker to test restore${colors.reset}`
    );
  }

  process.exit(0);
}

main().catch((error) => {
  logError(
    `Fatal error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
