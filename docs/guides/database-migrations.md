# Database Migration and Backup Tools

This document describes the migration dry-run capability and backup verification tools added to Vamsa.

## Overview

Three new database utilities have been implemented to improve database migration safety and backup reliability:

1. **Migration Dry-Run Script** - Review pending migrations before applying them
2. **Backup Verification Script** - Verify backup file integrity and optionally test restores
3. **Seed Script Documentation** - Clarify the separation between development and production seeds

## 1. Migration Dry-Run (`db:migrate:dry-run`)

### Purpose

Shows all pending database migrations and displays the SQL that would be executed without actually running it. This allows you to review changes before applying them to production.

### Usage

```bash
# Show all migrations and pending SQL
bun run db:migrate:dry-run

# Show help
bun run db:migrate:dry-run --help
```

### Features

- Lists all migration files in `packages/api/drizzle/`
- Shows which migrations have already been applied (if database is connected)
- Displays the SQL content for each pending migration
- Color-coded SQL keywords for easy reading (CREATE TABLE, ALTER TABLE, UPDATE, etc.)
- Statement count for each migration
- Works with or without a database connection

### Example Output

```
[INFO] Analyzing database migrations...

==== Migration Overview ====
[INFO] Total migrations found: 2
[INFO] Applied migrations: 0
[INFO] Pending migrations: 2

==== Pending Migrations (will be applied with 'bun run db:migrate') ====

0000_initial.sql
129 SQL statement(s)

  CREATE TYPE "public"."AuditAction" AS ENUM('CREATE', 'UPDATE', 'DELETE', ...);
  CREATE TYPE "public"."BackupStatus" AS ENUM('PENDING', 'IN_PROGRESS', ...);
  ...
  CREATE TABLE "Account" (
    "id" text PRIMARY KEY NOT NULL,
    ...
  );

0001_grandfather_verified_users.sql
1 SQL statement(s)

  UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false OR "emailVerified" IS NULL;
```

### Environment Variables

- `DATABASE_URL` (optional) - PostgreSQL connection string
  - If not set, shows all migration files but cannot determine applied migrations
  - If set, compares files against `__drizzle_migrations__` table

## 2. Backup Verification (`db:backup:verify` and `db:backup:verify:docker`)

### Purpose

Verifies that backup files are valid and optionally tests restore functionality in a temporary Docker container. Essential before performing migrations or major updates.

### Usage

```bash
# Verify the latest backup
bun run db:backup:verify

# Verify the latest backup and test restore with Docker
bun run db:backup:verify:docker

# Verify a specific backup file
bun scripts/test-backup-restore.ts --file=/path/to/backup.sql.gz

# Verify and test restore
bun scripts/test-backup-restore.ts --file=/path/to/backup.sql.gz --with-docker

# Show help
bun scripts/test-backup-restore.ts --help
```

### Features

**Standard Verification** (all modes)
1. Verify file exists and is not empty
2. Verify gzip file integrity (`gzip -t`)
3. Verify contains valid PostgreSQL SQL dump content

**Docker Restore Test** (with `--with-docker` flag)
4. Spin up temporary PostgreSQL 15 container
5. Restore backup into temporary database
6. Run basic `SELECT 1` test query
7. Clean up container

### Example Output

```
[INFO] Backup file: ./backups/daily/vamsa-full-2026-02-16T20-45-30-123Z.sql.gz
[INFO] File size: 2.45 MB
[INFO] File age: 2h 30m ago
  ✓ File exists and is not empty
[INFO] Verifying gzip integrity...
  ✓ Gzip integrity verified
[INFO] Verifying SQL content...
  ✓ Valid PostgreSQL dump content

==== Verification Summary ====
All checks passed!
  File: vamsa-full-2026-02-16T20-45-30-123Z.sql.gz
  Size: 2.45 MB
  Status: Ready for use

Tip: Use --with-docker to test restore
```

### When to Use

- **Before migrations**: `bun run db:backup:verify` - Quick integrity check
- **Before major updates**: `bun run db:backup:verify:docker` - Full restore test
- **Production deployments**: Always run at least the standard verification

### Environment Variables

- `BACKUP_DIR` (optional) - Directory containing backups (default: `./backups`)
  - Script looks in `./backups/daily/`, `./backups/weekly/`, `./backups/monthly/`
  - Safety backups in `./backups/safety-backup-*.sql.gz` are also found

### Requirements for Docker Tests

- Docker must be installed and running
- Sufficient disk space for temporary container
- PostgreSQL 15 Docker image will be pulled if not present

## 3. Seed Scripts (Already Separated)

The seed scripts are already properly separated by use case:

### Production Seed (`db:seed`)

**File**: `packages/api/src/drizzle/seed.ts`

**Purpose**: Minimal data needed for production deployments

**Creates**:
- Family settings (app name, registration/approval settings)
- Single admin user from `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables

**When to use**:
- Production deployments
- First-time setup on production server
- When ADMIN_EMAIL/ADMIN_PASSWORD are set in `.env`

**Example**:
```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SecurePassword123 bun run db:seed
```

### Development Seed (`db:seed:dev`)

**File**: `packages/api/src/drizzle/seed-dev.ts`

**Purpose**: Comprehensive test data for local development

**Creates**:
- Family settings
- 30+ people across 5 generations with relationships
- Multiple test users (admin, member, viewer)
- All with realistic data for UI/UX testing

**When to use**:
- Local development
- Automatic during `bun run dev` (dev.ts calls this)
- When testing UI with realistic family data

**Features**:
- Automatic admin user sync from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- Test users: `admin@test.vamsa.local`, `member@test.vamsa.local`, `viewer@test.vamsa.local`
- If database already seeded, only updates admin credentials (allows changing `.env` and having it take effect)

### E2E Test Seed (`db:seed:e2e`)

**File**: `packages/api/src/drizzle/seed-e2e.ts`

**Purpose**: Test data for end-to-end tests

**When to use**: E2E test runs (via `scripts/run-e2e.ts`)

## Pre-Migration Checklist

When planning a database migration:

1. **Create backup**
   ```bash
   bun run db:backup:pre-migration
   ```
   This creates a backup with 90-day retention for safety

2. **Verify backup integrity** (optional but recommended)
   ```bash
   bun run db:backup:verify
   ```

3. **Review pending migrations**
   ```bash
   bun run db:migrate:dry-run
   ```

4. **Apply migrations** (when ready)
   ```bash
   bun run db:migrate
   ```

5. **Seed initial data** (if new database)
   ```bash
   bun run db:seed              # Production
   # OR
   bun run db:seed:dev         # Development
   ```

## Troubleshooting

### "DATABASE_URL not set" warnings

This is normal if `DATABASE_URL` is not in your environment. The tools will still work, they just can't query the database for applied migrations.

**Solution**: Set `DATABASE_URL` in `.env` to enable full functionality:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/vamsa"
```

### "Docker is not available"

The backup verification script works without Docker, but restore testing requires it.

**Solutions**:
- Install Docker Desktop
- Or use `bun run db:backup:verify` (without `--with-docker`)

### "Migrations table does not exist"

This is normal for a fresh database. The tools handle this gracefully.

**Solution**: Run `bun run db:migrate` to initialize migrations

### "Backup file not found"

The default backup directory is `./backups`. Check:
1. Backups exist in `./backups/daily/`, `./backups/weekly/`, or `./backups/monthly/`
2. Set `BACKUP_DIR` environment variable if using a different location

**Example**:
```bash
BACKUP_DIR=/data/backups bun run db:backup:verify --latest
```

## Implementation Details

### Migration Dry-Run Script

- **Location**: `scripts/migrate-dry-run.ts`
- **Dependencies**: Bun `$` shell execution (no external database libraries required)
- **Logic**:
  1. Find all `.sql` files in `packages/api/drizzle/`
  2. Query `__drizzle_migrations__` table (if DB available) to determine applied migrations
  3. Display pending migration SQL with syntax highlighting

### Backup Verification Script

- **Location**: `scripts/test-backup-restore.ts`
- **Dependencies**: Bun `$` shell execution, `gzip`, `pg_dump`, optionally Docker
- **Logic**:
  1. Find backup files in directory structure
  2. Verify file exists, not empty, gzip integrity
  3. Extract and check SQL content headers
  4. (Optional) Start Docker container, restore backup, test query

### Package.json Scripts

New npm scripts added to `/package.json`:

```json
"db:migrate:dry-run": "bun scripts/migrate-dry-run.ts",
"db:backup:verify": "bun scripts/test-backup-restore.ts --latest",
"db:backup:verify:docker": "bun scripts/test-backup-restore.ts --latest --with-docker"
```

## Best Practices

1. **Always verify backups** before production migrations
2. **Review pending migrations** with dry-run before applying
3. **Test restore process** periodically to ensure backup validity
4. **Keep multiple backup generations** (daily, weekly, monthly)
5. **Document significant migrations** in commit messages
6. **Use pre-migration backups** with longer retention (90 days)

## Related Documentation

- [Backup Documentation](./BACKUP_GUIDE.md) (if exists)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html)
