# Database Migrations

When Vamsa gets new features, the database sometimes needs to change -- a new table might be added, or a column might be renamed. These changes are handled through "migrations," which are safe, tracked updates to your database structure.

---

## What is a migration?

!!! info "Migrations in plain language"
    Think of a migration as a set of instructions for updating your database. Instead of someone manually changing tables and columns (which is error-prone), migrations are scripts that apply changes in a controlled, repeatable way. Each migration has a number, so Vamsa knows which ones have already been applied and which ones are new.

Vamsa uses [Drizzle ORM](https://orm.drizzle.team/) to manage migrations. Drizzle generates migration files that describe exactly what changes to make, and applies them in order.

---

## When do migrations happen?

### Docker installations

**Migrations run automatically when the Vamsa container starts.** You do not need to do anything. When you update Vamsa and restart the container, any new migrations are applied before the application begins serving requests.

### Bare metal installations

**You run migrations manually after pulling new code.** This is part of the standard update process:

```bash
git pull
bun install
bun run db:migrate
bun run build
# Restart Vamsa
```

---

## Are migrations safe?

Yes. Here is why:

- **Migrations are incremental.** Each one makes a small, specific change. Vamsa does not try to rebuild your entire database at once.
- **Migrations are tracked.** Drizzle keeps a record of which migrations have been applied. It will never run the same migration twice.
- **Migrations are tested.** Every migration is tested before a release to make sure it works correctly.

!!! tip "Always back up before updating"
    Even though migrations are safe, having a backup gives you a safety net. If anything goes wrong, you can restore your database to exactly how it was before the update. See [Backup & Restore](../guides/backup-restore.md).

---

## Previewing migrations (dry run)

If you want to see what a migration will do before applying it, use the dry-run command:

```bash
bun run db:migrate:dry-run
```

You should see output like:

```
Pending migrations:
  0042_add_media_tags.sql
    - CREATE TABLE "media_tags" (...)
    - ALTER TABLE "media" ADD COLUMN "tag_id" ...

No changes were applied. Run 'bun run db:migrate' to apply.
```

If there are no pending migrations:

```
No pending migrations. Database is up to date.
```

!!! tip "Good habit before bare metal updates"
    Running a dry run before applying migrations lets you understand what is changing. This is especially useful if you are cautious about database changes.

---

## Running migrations manually

If you need to apply migrations yourself (bare metal installations):

```bash
bun run db:migrate
```

You should see:

```
Running migrations...
Applied: 0042_add_media_tags.sql
Migration complete.
```

If the database is already up to date:

```
No pending migrations.
```

---

## What if a migration fails?

Migration failures are rare, but they can happen -- usually due to a corrupted database state or a bug in a specific migration. Here is what to do:

### Step 1 -- Do not panic

A failed migration does not destroy your data. It typically means one specific change could not be applied.

### Step 2 -- Read the error message

The error message will tell you what went wrong. Common causes:

| Error | Likely cause |
|-------|-------------|
| `relation already exists` | The migration was partially applied before (perhaps after a crash) |
| `column does not exist` | A previous migration was skipped or failed silently |
| `permission denied` | The database user does not have enough permissions |
| `disk full` | The server ran out of storage space |

### Step 3 -- Restore from backup

If you cannot resolve the error, restore your database from the backup you made before updating:

For Docker:

```bash
# Stop the app
docker compose --env-file .env -f docker/docker-compose.yml stop app

# Restore the backup (see Backup & Restore guide for full instructions)
docker exec -i vamsa-db pg_restore -U vamsa -d vamsa < your-backup-file.dump

# Roll back the code to the previous version
git checkout HEAD~1

# Rebuild and restart
docker compose --env-file .env -f docker/docker-compose.yml build
docker compose --env-file .env -f docker/docker-compose.yml up -d
```

For bare metal:

```bash
# Restore the database from backup
pg_restore -U vamsa -d vamsa your-backup-file.dump

# Roll back the code
git checkout HEAD~1

# Rebuild
bun install
bun run build
# Restart Vamsa
```

### Step 4 -- Report the issue

If a migration fails, it is likely a bug. Please report it:

1. Go to [GitHub Issues](https://github.com/darshan-rambhia/vamsa/issues)
2. Include:
    - The full error message
    - Your Vamsa version (the Git commit hash from `git rev-parse HEAD`)
    - Your PostgreSQL version (`psql --version`)
    - Your operating system

---

## How migrations work under the hood

!!! info "Technical details (optional reading)"
    You do not need to understand this section to use Vamsa. It is here for the curious.

    Migrations live in the `packages/api/drizzle/` directory as numbered SQL files. Each file contains the SQL statements needed to make a specific change.

    When Vamsa starts (or when you run `bun run db:migrate`), Drizzle checks a special table in the database called `__drizzle_migrations`. This table records which migration files have already been applied. Drizzle compares this list against the migration files on disk and runs any that are new.

    The process looks like this:

    1. Read the list of applied migrations from `__drizzle_migrations`
    2. Scan the migration files on disk
    3. Find any files that have not been applied yet
    4. Apply them in order, one at a time
    5. Record each successful migration in `__drizzle_migrations`

---

## Next steps

- **[Updating Vamsa](updating.md)** -- The full update process (which includes migrations)
- **[Backup & Restore](../guides/backup-restore.md)** -- Always back up before updating
- **[Troubleshooting](troubleshooting.md)** -- Help with common problems
