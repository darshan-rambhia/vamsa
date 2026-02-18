# Updating Vamsa

Keeping Vamsa up to date gives you new features, bug fixes, and security patches. This page walks you through the update process for both Docker and bare metal installations.

!!! warning "Always back up before updating"
    Before any update, create a backup of your database. If something goes wrong, you can restore it and try again. See [Backup & Restore](../guides/backup-restore.md) for instructions.

---

## Check what changed

Before updating, review the changelog to see what is new and whether there are any breaking changes:

```bash
cd vamsa
git fetch
git log --oneline HEAD..origin/main | head -20
```

You should see a list of recent commits:

```
a1b2c3d feat: add new chart view for descendants
d4e5f6a fix: correct date parsing for European formats
g7h8i9j security: update authentication library
```

!!! tip "Release notes"
    Major changes are documented in the [GitHub releases page](https://github.com/darshan-rambhia/vamsa/releases). Check there for upgrade notes that may require extra steps.

---

## Docker update

This is the standard update process for Docker installations.

### Step 1 -- Pull the latest code

```bash
cd vamsa
git pull
```

You should see:

```
Updating a1b2c3d..d4e5f6a
Fast-forward
 apps/web/src/...
 packages/api/...
 12 files changed, 200 insertions(+), 50 deletions(-)
```

### Step 2 -- Rebuild the containers

```bash
docker compose --env-file .env -f docker/docker-compose.yml build
```

You should see:

```
[+] Building 45.2s (12/12) FINISHED
 => [app] ...
```

!!! info "Build time"
    Rebuilding takes 1-5 minutes depending on your hardware. The first build after a major update may take longer if dependencies changed.

### Step 3 -- Restart with the new version

```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d
```

You should see:

```
[+] Running 2/2
 ✔ Container vamsa-db   Running
 ✔ Container vamsa-app  Started
```

### Step 4 -- Verify the update

```bash
docker compose --env-file .env -f docker/docker-compose.yml ps
```

You should see both containers with a healthy status:

```
NAME         IMAGE       STATUS                   PORTS
vamsa-db     postgres    Up 5 minutes (healthy)   5432/tcp
vamsa-app    vamsa-app   Up 30 seconds (healthy)  0.0.0.0:80->3000/tcp
```

Then check the health endpoint:

```bash
curl http://localhost/health
```

```json
{"status":"healthy","timestamp":"2026-02-16T12:00:00.000Z","db":{"connected":true}}
```

!!! info "Database migrations run automatically"
    When the Vamsa container starts, it automatically checks for pending database migrations and applies them. You do not need to run migrations manually with Docker. See [Database Migrations](database-migrations.md) for more details.

---

## Bare metal update

If you installed Vamsa without Docker, follow these steps.

### Step 1 -- Pull the latest code

```bash
cd vamsa
git pull
```

### Step 2 -- Install updated dependencies

```bash
bun install
```

You should see:

```
bun install v1.x.x
...
Done in X.XXs
```

### Step 3 -- Run database migrations

```bash
bun run db:migrate
```

You should see:

```
Running migrations...
Migration complete.
```

!!! tip "Preview before applying"
    If you want to see what the migration will change before applying it, run `bun run db:migrate:dry-run` first. See [Database Migrations](database-migrations.md) for details.

### Step 4 -- Rebuild and restart

```bash
bun run build
```

You should see:

```
Building packages...
Build complete.
```

Then restart your Vamsa process. How you do this depends on how you run it:

- **If you use systemd**: `sudo systemctl restart vamsa`
- **If you use pm2**: `pm2 restart vamsa`
- **If you run it manually**: Stop the current process (Ctrl+C) and run `bun run start`

### Step 5 -- Verify

```bash
curl http://localhost:3000/health
```

```json
{"status":"healthy","timestamp":"2026-02-16T12:00:00.000Z","db":{"connected":true}}
```

---

## Version pinning

If you want to stay on a specific version instead of always pulling the latest code, you can pin to a Git tag or commit.

### Pin to a release tag

```bash
cd vamsa
git fetch --tags
git checkout v1.2.0
```

You should see:

```
HEAD is now at a1b2c3d v1.2.0
```

### Pin to a specific commit

```bash
git checkout a1b2c3d
```

!!! warning "Pinned versions do not receive updates"
    When you pin to a version, you will not get security patches or bug fixes until you update. Check the releases page periodically and update when important fixes are available.

### Return to the latest version

```bash
git checkout main
git pull
```

---

## Rollback if something goes wrong

If an update causes problems, you can go back to the previous version.

### Step 1 -- Find the previous version

```bash
git reflog | head -5
```

You should see:

```
d4e5f6a HEAD@{0}: pull: Fast-forward
a1b2c3d HEAD@{1}: checkout: moving from ...
```

The second line shows where you were before the update.

### Step 2 -- Roll back the code

```bash
git checkout a1b2c3d
```

### Step 3 -- Restore your backup

If the update included database migrations, you need to restore your pre-update backup. See [Backup & Restore](../guides/backup-restore.md) for restore instructions.

!!! danger "Do not skip the database restore"
    If migrations ran during the failed update, your database structure may have changed. Rolling back the code without restoring the database can leave things in a broken state.

### Step 4 -- Rebuild and restart

For Docker:

```bash
docker compose --env-file .env -f docker/docker-compose.yml build
docker compose --env-file .env -f docker/docker-compose.yml up -d
```

For bare metal:

```bash
bun install
bun run build
# Restart your Vamsa process
```

---

## Next steps

- **[Monitoring](monitoring.md)** -- Set up health checks to know when something needs attention
- **[Database Migrations](database-migrations.md)** -- Understand how database changes work
- **[Backup & Restore](../guides/backup-restore.md)** -- Make sure your backups are working before you need them
