# PostgreSQL 18 Upgrade Guide

This document describes the upgrade process from PostgreSQL 16 to PostgreSQL 18 for the Vamsa application.

## Overview

Vamsa has been upgraded to require PostgreSQL 18. This upgrade brings performance improvements and enhanced features.

## Key Changes in PostgreSQL 18

- **Improved Query Planner**: Better optimization for complex queries
- **Enhanced Parallel Execution**: More operations can run in parallel
- **JSONB Performance**: Faster JSONB operations and indexing
- **Full-Text Search**: Improved ranking algorithms
- **UUID Generation**: Native `gen_random_uuid()` function (no extension needed)
- **Memory Management**: Better memory handling for large datasets

## Pre-Upgrade Checklist

Before upgrading, ensure you have:

- [ ] Backed up your existing database
- [ ] Tested the upgrade in a non-production environment
- [ ] Verified Prisma compatibility
- [ ] Reviewed application queries for deprecated features

## Backup Procedure

### Using Docker

```bash
# Export database
docker exec vamsa-db pg_dump -U vamsa -d vamsa > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use compressed format
docker exec vamsa-db pg_dump -U vamsa -d vamsa -Fc > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Using Local PostgreSQL

```bash
pg_dump -U vamsa -d vamsa > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Upgrade Procedure

### Option 1: Fresh Installation (Recommended for Development)

1. Stop existing containers:

   ```bash
   docker compose -f docker/docker-compose.yml down
   ```

2. Remove old data volume (WARNING: This deletes all data):

   ```bash
   docker volume rm vamsa-postgres-data
   ```

3. Start with new PostgreSQL 18:

   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

4. Run migrations:

   ```bash
   bun run db:migrate
   ```

5. Seed initial data:
   ```bash
   bun run db:seed
   ```

### Option 2: Data Migration (Production)

1. Export data from PostgreSQL 16:

   ```bash
   docker exec vamsa-db pg_dump -U vamsa -d vamsa -Fc > vamsa_backup.dump
   ```

2. Stop containers:

   ```bash
   docker compose -f docker/docker-compose.yml down
   ```

3. Rename old data volume (for safety):

   ```bash
   docker volume rm vamsa-postgres-data-pg16-backup 2>/dev/null || true
   docker volume create vamsa-postgres-data-pg16-backup
   docker run --rm -v vamsa-postgres-data:/from -v vamsa-postgres-data-pg16-backup:/to alpine cp -a /from/. /to/
   docker volume rm vamsa-postgres-data
   ```

4. Start PostgreSQL 18 (creates new volume):

   ```bash
   docker compose -f docker/docker-compose.yml up -d db
   ```

5. Wait for database to be ready:

   ```bash
   docker compose -f docker/docker-compose.yml exec db pg_isready -U vamsa
   ```

6. Restore data:

   ```bash
   docker exec -i vamsa-db pg_restore -U vamsa -d vamsa --clean --if-exists < vamsa_backup.dump
   ```

7. Start application:
   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

### Option 3: pg_upgrade (Advanced)

For large databases, `pg_upgrade` provides a faster migration path. This requires direct access to PostgreSQL data directories and is not supported in the Docker setup.

## Post-Upgrade Verification

### 1. Test Connection

Run the connection test script:

```bash
cd packages/api
bun run test-connection.ts
```

This verifies:

- Basic connectivity
- PostgreSQL version (must be 18+)
- Transaction support
- Full-text search
- JSON/JSONB operations
- UUID generation

### 2. Verify Application

- [ ] Application starts without errors
- [ ] Login/authentication works
- [ ] Family tree loads correctly
- [ ] CRUD operations work (create/edit/delete people)
- [ ] Search functionality works
- [ ] Export/import GEDCOM works

### 3. Check Performance

Monitor query performance after upgrade:

```sql
-- Check slow queries
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Rollback Procedure

If issues occur after upgrade:

1. Stop containers:

   ```bash
   docker compose -f docker/docker-compose.yml down
   ```

2. Edit `docker/docker-compose.yml`:

   ```yaml
   image: postgres:16-alpine # Change back to 16
   ```

3. Restore old volume:

   ```bash
   docker volume rm vamsa-postgres-data
   docker volume create vamsa-postgres-data
   docker run --rm -v vamsa-postgres-data-pg16-backup:/from -v vamsa-postgres-data:/to alpine cp -a /from/. /to/
   ```

4. Restart:
   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

## Configuration Changes

The following PostgreSQL configuration has been optimized for PostgreSQL 18:

| Parameter                      | Value | Description                         |
| ------------------------------ | ----- | ----------------------------------- |
| `max_connections`              | 100   | Maximum concurrent connections      |
| `shared_buffers`               | 256MB | Memory for caching data             |
| `effective_cache_size`         | 768MB | Planner estimate of available cache |
| `maintenance_work_mem`         | 64MB  | Memory for maintenance operations   |
| `checkpoint_completion_target` | 0.9   | Spread checkpoint I/O               |
| `wal_buffers`                  | 16MB  | Write-ahead log buffer              |
| `work_mem`                     | 4MB   | Memory per query operation          |
| `min_wal_size`                 | 1GB   | Minimum WAL size                    |
| `max_wal_size`                 | 4GB   | Maximum WAL size                    |

These settings are configured in `docker/docker-compose.yml` and can be adjusted based on your server resources.

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

Solution: Wait for PostgreSQL to fully start, then retry.

### Locale Errors

```
Error: invalid locale name
```

Solution: Ensure your system has UTF-8 locale installed, or modify `POSTGRES_INITDB_ARGS` in docker-compose.yml.

### Permission Denied

```
Error: permission denied for relation
```

Solution: Run migrations to update schema permissions:

```bash
bun run db:migrate
```

### Data Corruption

If data appears corrupted after migration:

1. Stop the database
2. Restore from backup
3. Follow Option 2 migration procedure again

## References

- [PostgreSQL 18 Release Notes](https://www.postgresql.org/docs/18/release-18.html)
- [Prisma PostgreSQL Support](https://www.prisma.io/docs/orm/overview/databases/postgresql)
- [Docker PostgreSQL Image](https://hub.docker.com/_/postgres)
