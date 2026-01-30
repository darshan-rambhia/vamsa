# Database Backup Quick Reference

Fast lookup for common backup and restore operations.

## Most Common Operations

### Create a Backup
```bash
# Quick backup
bun run db:backup

# Or with TypeScript script
bun scripts/backup-database.ts --type=full
```

### Create Pre-Migration Backup
```bash
# Create and verify before migrations
bun run db:backup:pre-migration

# Or manually
bun scripts/backup-database.ts --type=pre-migration --verify
```

### Check Backup Status
```bash
bun run db:backup:status
```

### List Available Backups
```bash
bun run db:restore:list
```

### Restore from Backup
```bash
# List to find backup file
bun run db:restore:list

# Restore (requires confirmation)
bun run db:restore ./backups/daily/backup.sql.gz
```

### Dry Run Restore
```bash
# Preview restore without making changes
bun scripts/restore-database.ts ./backups/daily/backup.sql.gz --dry-run
```

## Docker Compose Automated Backups

### Enable Automatic Backups
```bash
# Start with backup service
docker compose -f docker/docker-compose.yml -f docker/docker-compose.backup.yml up -d

# Check backup service status
docker compose logs postgres-backup
```

### View Automated Backups
```bash
# List all backups
ls -lh backups/

# List daily backups
ls -lh backups/daily/

# List weekly backups
ls -lh backups/weekly/

# List monthly backups
ls -lh backups/monthly/
```

## npm Scripts

| Script | Purpose |
|--------|---------|
| `bun run db:backup` | Create full backup |
| `bun run db:backup:pre-migration` | Create pre-migration backup with verification |
| `bun run db:backup:status` | Show backup status and statistics |
| `bun run db:backup:verify` | Verify latest backup integrity |
| `bun run db:restore` | Restore from backup (interactive) |
| `bun run db:restore:list` | List available backups |

## TypeScript Script Commands

### Backup Script
```bash
# Full backup
bun scripts/backup-database.ts --type=full

# Full backup with verification
bun scripts/backup-database.ts --type=full --verify

# Pre-migration backup (90-day retention)
bun scripts/backup-database.ts --type=pre-migration

# Incremental backup (7-day retention)
bun scripts/backup-database.ts --type=incremental

# Show backup status
bun scripts/backup-database.ts --status

# Verify latest backup
bun scripts/backup-database.ts --verify

# Show help
bun scripts/backup-database.ts --help
```

### Restore Script
```bash
# List available backups
bun scripts/restore-database.ts --list

# Dry run (preview)
bun scripts/restore-database.ts ./backups/daily/backup.sql.gz --dry-run

# Restore (requires 'yes' confirmation)
bun scripts/restore-database.ts ./backups/daily/backup.sql.gz

# Show help
bun scripts/restore-database.ts --help
```

## Legacy Shell Scripts

```bash
# Create backup with shell script
./scripts/backup-db.sh

# Create and verify
./scripts/backup-db.sh --verify

# Show status
./scripts/backup-db.sh --status

# List backups
./scripts/restore-db.sh --list

# Restore from backup
./scripts/restore-db.sh ./backups/daily/backup.sql.gz
```

## Emergency Recovery

### If Database is Corrupted

1. Stop the app
   ```bash
   docker compose down
   ```

2. Find a backup
   ```bash
   ls -lh backups/daily/
   ```

3. Restore
   ```bash
   bun scripts/restore-database.ts ./backups/daily/latest-backup.sql.gz
   ```

4. Restart
   ```bash
   docker compose up -d
   ```

### If You Deleted Data By Mistake

1. Stop the app immediately
   ```bash
   docker compose down
   ```

2. Find a backup from before the deletion
   ```bash
   ls -lh backups/daily/
   ```

3. Restore that backup
   ```bash
   bun scripts/restore-database.ts ./backups/daily/backup-before-deletion.sql.gz
   ```

4. Start the app
   ```bash
   docker compose up -d
   ```

## Environment Setup

### Required
```bash
# In .env file
DATABASE_URL="postgresql://user:password@localhost:5432/vamsa"
```

### Optional
```bash
# Custom backup directory
BACKUP_DIR="./backups"

# For Docker Compose backup service
DB_PASSWORD=your-password
```

## Backup Directory Structure

```
backups/
├── daily/          # 30-day retention (one per day)
├── weekly/         # 12-week retention (one per Sunday)
├── monthly/        # 12-month retention (1st of month)
└── safety-backup-* # Auto-backups before restore
```

## Backup File Naming

```
vamsa-full-2024-01-29T00-00-00-000Z.sql.gz
vamsa-pre-migration-2024-01-29T12-30-45-123Z.sql.gz
vamsa-incremental-2024-01-29T13-45-30-456Z.sql.gz
```

## File Sizes

- Uncompressed dump: ~500 MB - 2 GB (varies with data)
- Compressed (gzip): ~50-200 MB
- All backups: ~50-100 GB (with full retention)

## Retention Policy

| Backup Type | Frequency | Kept | Total |
|------------|-----------|------|-------|
| Daily | Every day | 30 days | 30 backups |
| Weekly | Every Sunday | 12 weeks | 12 backups |
| Monthly | 1st of month | 12 months | 12 backups |
| Pre-migration | Before migrations | 90 days | As needed |

## Common Issues

### "DATABASE_URL required"
```bash
# Set the environment variable
export DATABASE_URL="postgresql://user:pass@localhost/vamsa"

# Or in .env file
DATABASE_URL="postgresql://user:pass@localhost/vamsa"
```

### "pg_dump not installed"
```bash
# Install PostgreSQL client tools
brew install postgresql    # macOS
apt-get install postgresql-client  # Ubuntu
```

### "Backup file corrupted"
```bash
# Try a different backup
bun run db:restore:list

# Use an older backup
bun scripts/restore-database.ts ./backups/daily/older-backup.sql.gz --dry-run
```

## Monitoring Health

```bash
# Check latest backup age
bun run db:backup:status

# Expected output should show backup is recent (< 24h)
# If backup is older than 24h, manually create one:
bun run db:backup
```

## For More Information

See [BACKUP.md](./BACKUP.md) for complete documentation including:
- Disaster recovery procedures
- Security considerations
- Cloud storage setup
- Backup encryption
- Troubleshooting guide
- Advanced topics

---

**Quick Reference Version**: 1.0
**Last Updated**: 2024-01-29
