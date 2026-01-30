# Database Backup System Index

Complete reference to all backup and restore documentation and tools for Vamsa.

## Quick Navigation

### For Quick Operations
Start here for common daily tasks:
- **[BACKUP_QUICK_REFERENCE.md](./BACKUP_QUICK_REFERENCE.md)** - Fast lookup for:
  - Creating backups
  - Restoring from backups
  - Emergency procedures
  - Common commands

### For Complete Information
For detailed understanding and advanced topics:
- **[BACKUP.md](./BACKUP.md)** - Comprehensive guide covering:
  - Backup strategy overview
  - All backup types and schedules
  - Detailed restore procedures
  - Disaster recovery scenarios
  - Troubleshooting guide
  - Security considerations

### For Implementation Details
Technical reference for the implementation:
- **[BACKUP_IMPLEMENTATION.md](./BACKUP_IMPLEMENTATION.md)** - Contains:
  - What was implemented and why
  - File manifest and structure
  - Configuration changes
  - Testing and validation results
  - Integration details

## Command Quick Links

### Create Backups
```bash
bun run db:backup                    # Create full backup
bun run db:backup:pre-migration      # Before migrations (verified)
bun run db:backup:status             # Check backup status
bun run db:backup:verify             # Verify latest backup
```

### Restore from Backup
```bash
bun run db:restore:list              # List available backups
bun scripts/restore-database.ts --dry-run backup.sql.gz  # Preview restore
bun run db:restore backup.sql.gz     # Restore from backup
```

### TypeScript Scripts
```bash
bun scripts/backup-database.ts --help     # Backup script help
bun scripts/restore-database.ts --help    # Restore script help
```

### Docker Automated Backups
```bash
# Start services with automated backups
docker compose -f docker/docker-compose.yml \
               -f docker/docker-compose.backup.yml up -d

# View backup service logs
docker compose logs -f postgres-backup
```

## Files and Locations

### Scripts
| File | Purpose | Lines | Size |
|------|---------|-------|------|
| `scripts/backup-database.ts` | Create backups | 450 | 11 KB |
| `scripts/restore-database.ts` | Restore from backups | 420 | 10 KB |
| `scripts/backup-db.sh` | Legacy backup script | 230 | 6 KB |
| `scripts/restore-db.sh` | Legacy restore script | 180 | 4 KB |

### Configuration
| File | Purpose |
|------|---------|
| `docker/docker-compose.backup.yml` | Automated backup service |
| `.env.example` | Backup environment variables |
| `.gitignore` | Backup directory exclusions |

### Documentation
| File | Focus | Size |
|------|-------|------|
| `BACKUP_INDEX.md` | This file - navigation |  |
| `BACKUP.md` | Complete reference | 14 KB |
| `BACKUP_QUICK_REFERENCE.md` | Quick lookup | 6 KB |
| `BACKUP_IMPLEMENTATION.md` | Implementation details | 11 KB |

### Data
| Directory | Purpose |
|-----------|---------|
| `backups/daily/` | 30 daily backups |
| `backups/weekly/` | 12 weekly backups |
| `backups/monthly/` | 12 monthly backups |

## Backup Strategy at a Glance

```
Daily Backup (30 days retention)
Every day at 00:00 UTC
├─ Full schema + data
├─ Compressed with gzip
├─ ~30 backups total
└─ Ideal for recent recovery

Weekly Backup (84 days retention)
Every Sunday at 00:00 UTC
├─ Full schema + data
├─ Compressed with gzip
├─ ~12 backups total
└─ For weekly retention

Monthly Backup (365 days retention)
1st of each month at 00:00 UTC
├─ Full schema + data
├─ Compressed with gzip
├─ ~12 backups total
└─ For long-term archival

Pre-Migration Backup (90 days retention)
Manual, before schema changes
├─ Full schema + data
├─ Compressed with gzip
├─ Includes verification
└─ Safety before migrations
```

## Common Workflows

### Workflow 1: Daily Backup Creation
```bash
# 1. Create backup
bun run db:backup

# 2. Verify it worked
bun run db:backup:status

# Result: Latest backup should be recent (< 1 hour old)
```

### Workflow 2: Before Database Migration
```bash
# 1. Create pre-migration backup (with verification)
bun run db:backup:pre-migration

# 2. Run your migrations
bun run db:migrate

# 3. If something goes wrong, restore:
bun run db:restore:list
bun scripts/restore-database.ts backup.sql.gz
```

### Workflow 3: Emergency Data Recovery
```bash
# 1. Stop the application
docker compose down

# 2. Find the backup you need
bun run db:restore:list

# 3. Preview restore (dry-run)
bun scripts/restore-database.ts backup.sql.gz --dry-run

# 4. Execute restore
bun scripts/restore-database.ts backup.sql.gz

# 5. Verify data is restored
bun run db:studio

# 6. Restart application
docker compose up -d
```

### Workflow 4: Test Restore on Staging
```bash
# 1. Copy backup to staging environment
scp backup.sql.gz staging-server:/tmp/

# 2. On staging, list available backups
bun run db:restore:list

# 3. Preview restore
bun scripts/restore-database.ts /tmp/backup.sql.gz --dry-run

# 4. Execute restore
bun scripts/restore-database.ts /tmp/backup.sql.gz

# 5. Test staging application
# ... run tests ...

# 6. Document results
```

## Decision Tree: Which Document to Read?

```
START HERE
    |
    v
Need quick command? ──> BACKUP_QUICK_REFERENCE.md
    |
    NO
    v
Need complete guide? ──> BACKUP.md
    |
    NO
    v
Need implementation details? ──> BACKUP_IMPLEMENTATION.md
    |
    NO
    v
Need specific help?
    |
    ├─ "How do I create a backup?" ──> BACKUP_QUICK_REFERENCE.md → Search "Create"
    |
    ├─ "What's the retention policy?" ──> BACKUP.md → Search "Retention"
    |
    ├─ "How do I recover data?" ──> BACKUP.md → "Restore Procedure"
    |
    ├─ "What files were created?" ──> BACKUP_IMPLEMENTATION.md → "File Manifest"
    |
    └─ "What if X happens?" ──> BACKUP.md → "Troubleshooting"
```

## Environment Setup

### Minimum Required
```bash
# .env file must have:
DATABASE_URL="postgresql://user:password@host:5432/database"
```

### Recommended for Production
```bash
# .env file should also have:
BACKUP_DIR="./backups"
BACKUP_SCHEDULE="@daily"
BACKUP_KEEP_DAYS=30
BACKUP_KEEP_WEEKS=4
BACKUP_KEEP_MONTHS=6
```

## npm Scripts Reference

### Backup Scripts
| Script | Command | Purpose |
|--------|---------|---------|
| `db:backup` | `bun run db:backup` | Create full backup |
| `db:backup:pre-migration` | `bun run db:backup:pre-migration` | Create and verify backup for migrations |
| `db:backup:status` | `bun run db:backup:status` | Show backup status and statistics |
| `db:backup:verify` | `bun run db:backup:verify` | Verify latest backup integrity |

### Restore Scripts
| Script | Command | Purpose |
|--------|---------|---------|
| `db:restore` | `bun run db:restore` | Interactive restore (requires file path) |
| `db:restore:list` | `bun run db:restore:list` | List available backups |

## Verification Checklist

### Monthly Verification
- [ ] Check backup status: `bun run db:backup:status`
- [ ] Latest backup should be recent (< 24 hours)
- [ ] Backup file size should be reasonable
- [ ] Verify backup: `bun run db:backup:verify`

### Quarterly Verification
- [ ] List backups: `bun run db:restore:list`
- [ ] Select a backup older than 7 days
- [ ] Dry-run restore: `bun scripts/restore-database.ts backup.sql.gz --dry-run`
- [ ] Document results

### Annual Verification
- [ ] Test complete restore procedure
- [ ] Test restore to staging environment
- [ ] Verify all tables present
- [ ] Verify data integrity with spot checks
- [ ] Update this documentation

## Emergency Contact

If you encounter issues:

1. **Check documentation first**
   - BACKUP_QUICK_REFERENCE.md for common issues
   - BACKUP.md for detailed troubleshooting

2. **Verify environment**
   ```bash
   echo $DATABASE_URL
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Check logs**
   ```bash
   docker compose logs postgres-backup  # If using automated backups
   ```

4. **Review backup script errors**
   ```bash
   bun scripts/backup-database.ts --help
   ```

## Key Facts

- **Backup retention**: 30 days daily, 12 weeks weekly, 12 months monthly
- **Compression**: Gzip (20-30% of original size)
- **Safety**: Automatic safety backup before restore
- **Verification**: Gzip integrity + PostgreSQL marker checks
- **Automation**: Docker service available for scheduled backups
- **Scripts**: Both TypeScript (Bun) and legacy shell scripts available
- **Database**: PostgreSQL 18-alpine (production standard)
- **Storage**: Backups directory (gitignored, not in version control)

## Related Documentation

- [DOCKER.md](./DOCKER.md) - Docker deployment guide
- [README.md](../README.md) - Project overview
- [CLAUDE.md](../CLAUDE.md) - Development guidelines

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2024-01-29 | 1.0 | Initial implementation complete |

---

**Last Updated**: 2024-01-29
**Status**: Complete and Production Ready
**Bead ID**: vamsa-keux

For most operations, use [BACKUP_QUICK_REFERENCE.md](./BACKUP_QUICK_REFERENCE.md).
For detailed information, use [BACKUP.md](./BACKUP.md).
