# Database Backup and Restore Strategy

Vamsa family genealogy data is irreplaceable. This document describes the automated backup and manual recovery procedures for PostgreSQL.

## Overview

The backup strategy consists of:

- **Automated daily backups** - Created daily via Docker Compose
- **Retention policy** - Daily (30 days), weekly (12 weeks), monthly (12 months)
- **Manual backups** - Before migrations and major changes
- **Backup verification** - Integrity checks via gzip verification
- **Safety backups** - Automatic backup before restore operations
- **Compression** - All backups compressed with gzip to save space

## Backup Types and Schedules

### Full Backup (Daily)
- **Frequency**: Every day (default: 00:00 UTC)
- **Retention**: 30 days
- **Contents**: Full schema + data
- **Use case**: Daily protection against data loss

### Weekly Backup (Sunday)
- **Frequency**: Every Sunday at 00:00 UTC
- **Retention**: 12 weeks (84 days)
- **Contents**: Full schema + data
- **Use case**: Longer-term retention for accidental data deletion

### Monthly Backup (1st of Month)
- **Frequency**: 1st day of each month at 00:00 UTC
- **Retention**: 12 months (365 days)
- **Contents**: Full schema + data
- **Use case**: Disaster recovery and compliance archival

### Pre-Migration Backup (Manual)
- **Frequency**: Before database migrations
- **Retention**: 90 days
- **Contents**: Full schema + data
- **Use case**: Rollback if migration fails

## Quick Start

### Using Docker Compose (Recommended for Production)

Enable automated backups with Docker Compose:

```bash
# Start services with automated backups
docker compose -f docker/docker-compose.yml -f docker/docker-compose.backup.yml up -d

# Check backup service status
docker compose logs -f postgres-backup

# View available backups
ls -lh backups/daily/
ls -lh backups/weekly/
ls -lh backups/monthly/
```

### Using Shell Scripts (Manual)

Create a backup before a migration:

```bash
# Create full backup
./scripts/backup-db.sh

# Create and verify
./scripts/backup-db.sh --verify

# Check backup status
./scripts/backup-db.sh --status
```

### Using TypeScript Scripts

```bash
# Create full backup
bun scripts/backup-database.ts --type=full

# Create full backup and verify
bun scripts/backup-database.ts --type=full --verify

# Create pre-migration backup
bun scripts/backup-database.ts --type=pre-migration

# Show backup status
bun scripts/backup-database.ts --status

# Verify latest backup
bun scripts/backup-database.ts --verify
```

### Using npm Scripts

```bash
# Create backup (runs shell script)
bun run db:backup

# Restore from backup (runs shell script)
bun run db:restore
```

## Backup Management

### Creating Manual Backups

Before significant database changes (migrations, schema updates):

```bash
# Create pre-migration backup
bun scripts/backup-database.ts --type=pre-migration --verify

# Verify backup was created
bun scripts/backup-database.ts --status
```

### Verifying Backups

Verify backup integrity after creation:

```bash
# Verify during backup creation
bun scripts/backup-database.ts --type=full --verify

# Verify existing backup
bun scripts/backup-database.ts --verify
```

Verification checks:
- File exists and is not empty
- Gzip integrity (magic number and checksum)
- Contains valid PostgreSQL dump markers

### Monitoring Backup Status

Check the status of backups:

```bash
# View backup status
bun scripts/backup-database.ts --status

# Output example:
# [INFO] [2024-01-29T12:30:45.123Z] Backup Status:
# [INFO] [2024-01-29T12:30:45.123Z]   Latest backup: vamsa-full-2024-01-29T00-00-00-000Z.sql.gz (12h ago)
# [INFO] [2024-01-29T12:30:45.123Z]   Daily backups: 30
# [INFO] [2024-01-29T12:30:45.123Z]   Weekly backups: 4
# [INFO] [2024-01-29T12:30:45.123Z]   Monthly backups: 6
# [INFO] [2024-01-29T12:30:45.123Z]   Total backup size: 2.45 GB
```

### Rotating Old Backups

Old backups are automatically deleted based on retention policy:

- **Daily**: Backups older than 30 days are deleted
- **Weekly**: Backups older than 84 days (12 weeks) are deleted
- **Monthly**: Backups older than 365 days (12 months) are deleted

Manual rotation:

```bash
# Create and auto-rotate
bun scripts/backup-database.ts --type=full

# Rotation happens automatically based on backup type
```

## Database Restore Procedure

### Before Restoring

1. **Identify the correct backup file**
   ```bash
   bun scripts/restore-database.ts --list
   ```

2. **Do a dry run**
   ```bash
   bun scripts/restore-database.ts ./backups/daily/backup.sql.gz --dry-run
   ```

3. **Create a safety backup** (automatic)
   - The restore script creates a safety backup before proceeding

### Step-by-Step Restore

1. **List available backups**
   ```bash
   bun scripts/restore-database.ts --list
   ```

2. **Perform a dry run** (recommended)
   ```bash
   bun scripts/restore-database.ts ./backups/daily/vamsa-full-2024-01-29.sql.gz --dry-run
   ```

3. **Execute the restore**
   ```bash
   bun scripts/restore-database.ts ./backups/daily/vamsa-full-2024-01-29.sql.gz
   ```

4. **Confirm the restore**
   - Script will show: `Are you sure you want to continue? (type 'yes' to confirm):`
   - Type `yes` to proceed

5. **Verify the restoration**
   ```bash
   # Check database integrity
   bun run db:studio

   # Or run manual verification
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
   ```

### Recovery Scenarios

#### Scenario 1: Accidental Data Deletion

1. Stop the application to prevent further writes
   ```bash
   docker compose down
   ```

2. Identify when the deletion occurred from logs

3. Find a backup from before the deletion
   ```bash
   bun scripts/restore-database.ts --list
   ```

4. Restore from that backup
   ```bash
   bun scripts/restore-database.ts ./backups/daily/backup_20240129.sql.gz
   ```

5. Verify data is restored
   ```bash
   bun run db:studio
   ```

6. Restart the application
   ```bash
   docker compose up -d
   ```

#### Scenario 2: Database Corruption

1. Stop the application immediately
   ```bash
   docker compose down
   ```

2. Restore from the most recent valid backup
   ```bash
   bun scripts/restore-database.ts ./backups/daily/backup_20240129.sql.gz
   ```

3. Run database integrity checks
   ```bash
   psql $DATABASE_URL -c "VACUUM ANALYZE;"
   ```

4. Verify application functionality

5. Restart the application
   ```bash
   docker compose up -d
   ```

#### Scenario 3: Complete System Failure

If the entire database server fails:

1. **Restore the PostgreSQL container**
   ```bash
   # Ensure backups are accessible
   ls -la backups/
   ```

2. **Bring up database services**
   ```bash
   docker compose -f docker/docker-compose.yml up -d db
   ```

3. **Wait for database to be ready**
   ```bash
   docker compose exec db pg_isready -U vamsa
   ```

4. **Restore from backup**
   ```bash
   bun scripts/restore-database.ts ./backups/monthly/backup_20240101.sql.gz
   ```

5. **Bring up full services**
   ```bash
   docker compose up -d
   ```

## Disaster Recovery Checklist

Use this checklist for quarterly disaster recovery testing:

### Monthly: Verify Latest Backup

- [ ] Run `bun scripts/backup-database.ts --status`
- [ ] Confirm latest backup is recent (within 24 hours)
- [ ] Confirm backup file size is reasonable (not suspiciously small)
- [ ] Verify backup integrity: `bun scripts/backup-database.ts --verify`

### Quarterly: Test Restore to Staging

- [ ] Select a recent backup
- [ ] Restore to a staging database: `bun scripts/restore-database.ts --dry-run backup.sql.gz`
- [ ] Execute restore on staging database
- [ ] Verify all tables are present
- [ ] Verify data integrity with spot checks
- [ ] Document any issues
- [ ] Delete restored staging database

### Annually: Document Disaster Recovery Plan

- [ ] Verify all team members know backup location
- [ ] Test restore procedure end-to-end
- [ ] Update this document with lessons learned
- [ ] Review retention policy for compliance needs

## Environment Configuration

### Required Variables

```bash
# Database connection string
DATABASE_URL="postgresql://user:password@localhost:5432/vamsa"

# Backup storage directory
BACKUP_DIR="./backups"
```

### For Docker Compose Backup Service

```bash
# In .env file
DB_PASSWORD=your-secure-password
DB_USER=vamsa
DB_NAME=vamsa
```

### Optional Docker Compose Variables

```bash
# Backup schedule (cron format)
BACKUP_SCHEDULE="@daily"

# Retention periods
BACKUP_KEEP_DAYS=30
BACKUP_KEEP_WEEKS=4
BACKUP_KEEP_MONTHS=6
```

## Storage and Space Requirements

### Backup Sizes

- **Daily backup**: ~100-500 MB (depending on data volume)
- **Compressed**: Typically 20-30% of uncompressed size
- **All backups combined**: ~50-100 GB (for production with full history)

### Directory Structure

```
backups/
├── daily/         # 30 daily backups
├── weekly/        # 12 weekly backups
├── monthly/       # 12 monthly backups
└── safety-backup-* # Automatic backups before restore
```

## Monitoring and Alerts

### Health Checks

The backup service includes health checks:

```bash
# Check backup service health
docker compose exec postgres-backup curl http://localhost:8080/health

# View backup service logs
docker compose logs postgres-backup
```

### Common Issues

#### Backup Size Too Small

```bash
# Verify backup contains data
zcat backups/daily/backup.sql.gz | head -20

# Expected output should start with:
# -- PostgreSQL database dump
```

#### Backup Service Not Running

```bash
# Check service status
docker compose -f docker/docker-compose.backup.yml ps

# View logs for errors
docker compose -f docker/docker-compose.backup.yml logs postgres-backup

# Restart service
docker compose -f docker/docker-compose.backup.yml restart postgres-backup
```

#### Insufficient Disk Space

```bash
# Check available space
df -h backups/

# Remove old backups manually if needed
rm backups/daily/backup_20231101.sql.gz

# Or adjust retention policy in docker-compose.backup.yml
```

## Scripts Reference

### backup-database.ts

```bash
# Full backup
bun scripts/backup-database.ts --type=full

# Full backup with verification
bun scripts/backup-database.ts --type=full --verify

# Pre-migration backup (90-day retention)
bun scripts/backup-database.ts --type=pre-migration

# Show backup status
bun scripts/backup-database.ts --status

# Verify latest backup
bun scripts/backup-database.ts --verify

# Show help
bun scripts/backup-database.ts --help
```

### restore-database.ts

```bash
# List available backups
bun scripts/restore-database.ts --list

# Dry run (preview without changes)
bun scripts/restore-database.ts ./backups/daily/backup.sql.gz --dry-run

# Restore from backup (requires confirmation)
bun scripts/restore-database.ts ./backups/daily/backup.sql.gz

# Show help
bun scripts/restore-database.ts --help
```

### backup-db.sh (Legacy Shell Script)

```bash
# Create full backup
./scripts/backup-db.sh

# Create data-only backup
./scripts/backup-db.sh --data-only

# Verify backup after creation
./scripts/backup-db.sh --verify

# Show backup status
./scripts/backup-db.sh --status
```

### restore-db.sh (Legacy Shell Script)

```bash
# List available backups
./scripts/restore-db.sh --list

# Dry run
./scripts/restore-db.sh backup.sql.gz --dry-run

# Restore from backup
./scripts/restore-db.sh backup.sql.gz
```

## Security Considerations

### Backup Encryption

For production environments, consider encrypting backups:

```bash
# Backup and encrypt
pg_dump $DATABASE_URL | gzip | openssl enc -aes-256-cbc -out backup.sql.gz.enc

# Decrypt and restore
openssl enc -aes-256-cbc -d -in backup.sql.gz.enc | zcat | psql $DATABASE_URL
```

### Access Control

Ensure backups are protected:

```bash
# Restrict backup directory permissions
chmod 700 backups/

# Verify permissions
ls -la backups/
```

### Offsite Backups

For disaster recovery, consider offsite backups:

```bash
# Copy backups to remote server
rsync -av --delete backups/ user@backup-server:/backups/vamsa/

# Or use cloud storage (AWS S3, etc.)
aws s3 sync backups/ s3://vamsa-backups/
```

## Compliance and Archival

### Data Retention

- Backups are kept according to retention policy above
- Monthly backups provide 12-month audit trail
- Compliance requirements should be reviewed annually

### Backup Verification Log

Maintain a log of backup verification:

```bash
# Log backup verification
echo "$(date): Backup verification passed - $(ls -lh backups/daily/ | tail -1)" >> logs/backup-verification.log
```

## Troubleshooting

### Problem: Backup Script Hangs

```bash
# Check if database is responsive
pg_isready -h localhost -U vamsa

# If hung, check for long-running queries
psql $DATABASE_URL -c "SELECT pid, usename, query, query_start FROM pg_stat_activity WHERE state != 'idle';"
```

### Problem: Restore Fails with Authentication Error

```bash
# Verify DATABASE_URL is set correctly
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Problem: Insufficient Disk Space During Backup

```bash
# Check disk usage
df -h

# Temporarily free space by removing old backups
rm backups/daily/backup_oldest.sql.gz

# Monitor backup disk usage
du -sh backups/
```

### Problem: Backup Verification Shows Corrupted File

```bash
# Test gzip integrity
gzip -t backups/daily/backup.sql.gz

# If corrupted, try next backup
bun scripts/restore-database.ts --list
```

## Advanced Topics

### Incremental Backups

For large databases, consider incremental backups:

```bash
# Create incremental backup
bun scripts/backup-database.ts --type=incremental
```

### Database Cloning

Clone production to staging using backups:

```bash
# On staging server
bun scripts/restore-database.ts /path/to/production-backup.sql.gz
```

### Backup Compression Optimization

For large backups, consider alternative compression:

```bash
# Use bzip2 for higher compression (slower)
pg_dump $DATABASE_URL | bzip2 > backup.sql.bz2

# Use xz for maximum compression (very slow)
pg_dump $DATABASE_URL | xz > backup.sql.xz
```

## Support and Contact

For questions or issues with backups:

1. Check this documentation
2. Review backup script logs
3. Consult PostgreSQL documentation
4. Contact the development team

---

**Last Updated**: 2024-01-29
**Backup Strategy Version**: 2.0
**Related Documents**: [DOCKER.md](./DOCKER.md), [Architecture Overview](./README.md)
