# Docker Deployment Guide

This guide covers deploying Vamsa using Docker.

## Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Generate secure credentials
# On macOS/Linux:
echo "DB_PASSWORD=$(openssl rand -base64 24)" >> .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env

# 3. Start the application
docker compose -f docker/docker-compose.yml up -d
```

## Single Container (SQLite, homelab)

The image `ghcr.io/darshan-rambhia/vamsa` runs the whole app in one container with an embedded SQLite database. No Postgres needed.

```bash
docker volume create vamsa-data

docker run -d --name vamsa --restart unless-stopped \
  -p 8080:3000 \
  -v vamsa-data:/app/data \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -e BETTER_AUTH_URL="https://vamsa.example.com" \
  -e APP_URL="https://vamsa.example.com" \
  -e TRUSTED_PROXIES="10.100.2.200" \
  -e ADMIN_EMAIL="you@example.com" \
  -e OIDC_DISCOVERY_URL="https://auth.example.com/application/o/vamsa/.well-known/openid-configuration" \
  -e OIDC_CLIENT_ID="vamsa" \
  -e OIDC_CLIENT_SECRET="..." \
  ghcr.io/darshan-rambhia/vamsa:main
```

What happens on start:

1. Env validation. Missing `BETTER_AUTH_URL`, `APP_URL` or `BETTER_AUTH_SECRET` (or OIDC without its client credentials) exits the process with a logged error.
2. Migrations. Pending SQLite migrations are applied from `/app/migrations/sqlite`. Re-runs are no-ops.
3. First admin. If no ADMIN exists and `ADMIN_EMAIL` is set, that email becomes ADMIN (see below).
4. The HTTP server starts. `/health` only answers after steps 1-3 succeed.

### Persistent data (`/app/data`)

| Path                      | Contents                               |
| ------------------------- | -------------------------------------- |
| `/app/data/vamsa.db`      | SQLite database (plus `-wal` / `-shm`) |
| `/app/data/uploads/media` | Media uploads                          |
| `/app/data/backups`       | Local database backups                 |

Mount one volume at `/app/data`. Back up the whole volume (stop the container first, or use `sqlite3 .backup`, for a consistent copy of the database).

The container runs as non-root user `vamsa` (uid 1001). If you bind-mount a host directory, `chown -R 1001:1001` it first.

### First admin

Vamsa has no public admin signup. The first admin is created from env at startup:

- Set `ADMIN_EMAIL` to your email. If no ADMIN user exists, startup creates a passwordless, email-verified account with that email and role ADMIN.
- Sign in through the configured OIDC provider with the same email. Better Auth links the OIDC identity to that account.
- Once any ADMIN exists, `ADMIN_EMAIL` is ignored. Changing it later does nothing.
- If a user with that email already exists, startup promotes that user to ADMIN.
- Requires OIDC configured. Without it there is no way to claim the account.
- No demo data is ever created in production. `ADMIN_PASSWORD` is only used by the dev seed scripts.

### Production environment variables

Read by the container (`docker/Dockerfile` sets the defaults marked _image_):

| Variable                                                                      | Required         | Example                                                         | Notes                                                                                          |
| ----------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                                                          | Yes              | `openssl rand -base64 32`                                       | Min 32 chars. Signs sessions. Changing it logs everyone out.                                   |
| `BETTER_AUTH_URL`                                                             | Yes              | `https://vamsa.example.com`                                     | Public URL, no trailing slash. Used for cookies and OIDC callbacks.                            |
| `APP_URL`                                                                     | Yes              | `https://vamsa.example.com`                                     | Public URL. CORS/CSRF origin check, links in emails.                                           |
| `ADMIN_EMAIL`                                                                 | Recommended      | `you@example.com`                                               | First-admin bootstrap (above).                                                                 |
| `OIDC_DISCOVERY_URL`                                                          | For OIDC login   | `https://auth.example.com/.../.well-known/openid-configuration` | Generic OIDC (Authentik, Keycloak, ...). Set with the two below.                               |
| `OIDC_CLIENT_ID`                                                              | With OIDC        | `vamsa`                                                         |                                                                                                |
| `OIDC_CLIENT_SECRET`                                                          | With OIDC        | `...`                                                           | Secret, do not commit.                                                                         |
| `TRUSTED_PROXIES`                                                             | Behind a proxy   | `10.100.2.200`                                                  | Default `docker`. See "Reverse proxy" below.                                                   |
| `DB_DRIVER`                                                                   | No               | `sqlite` / `postgres`                                           | Optional. Inferred from `DATABASE_URL` (`postgresql://` means postgres, anything else sqlite). |
| `DATABASE_URL`                                                                | No (_image_)     | `/app/data/vamsa.db` or `postgresql://u:p@host:5432/vamsa`      | _Image:_ `/app/data/vamsa.db`. Required for postgres.                                          |
| `DB_SSL_MODE`                                                                 | Postgres, remote | `require` / `verify-full`                                       | Default `disable` in compose. See "Database SSL".                                              |
| `DB_SSL_CA_CERT`                                                              | verify-ca/-full  | `/app/ca.pem`                                                   | Path to CA certificate.                                                                        |
| `MIGRATE_ON_START`                                                            | No               | `false`                                                         | Default on in production. Set `false` if the schema is managed externally.                     |
| `MIGRATIONS_DIR`                                                              | No (_image_)     | `/app/migrations`                                               | Folder with `postgres/` and `sqlite/` migration sets.                                          |
| `MEDIA_STORAGE_PATH`                                                          | No (_image_)     | `/app/data/uploads/media`                                       | Media uploads.                                                                                 |
| `BACKUP_DIR`                                                                  | No (_image_)     | `/app/data/backups`                                             | Local backups.                                                                                 |
| `PORT` / `HOST`                                                               | No (_image_)     | `3000` / `0.0.0.0`                                              | Port inside the container.                                                                     |
| `METRICS_BEARER_TOKEN`                                                        | Recommended      | `openssl rand -hex 32`                                          | Protects `/health/detail`, `/health/cache`, `/health/telemetry`. Warns when unset.             |
| `LOG_LEVEL`                                                                   | No               | `info`                                                          | `debug` / `info` / `warn` / `error`.                                                           |
| `RESEND_API_KEY`, `EMAIL_FROM`                                                | No               | `re_...`, `noreply@example.com`                                 | Transactional email (verification, password reset). Without it, emails are not sent.           |
| `REDIS_URL`                                                                   | No               | `redis://redis:6379`                                            | Shared rate limit store. Default in-memory.                                                    |
| `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` / `MICROSOFT_CLIENT_ID` (+ `_SECRET`) | No               |                                                                 | Built-in social logins. Each enabled only when its client ID is set.                           |
| `OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`            | No               | `true`, `http://otel:4318`, `vamsa`                             | OpenTelemetry export. _Image:_ `OTEL_ENABLED=false`.                                           |
| `S3_*`                                                                        | No               |                                                                 | S3-compatible cloud backup. See `.env.example`.                                                |

`APP_VERSION` (optional) is reported by `/health/detail`.

### Reverse proxy (Traefik on another host)

`TRUSTED_PROXIES` decides whether `X-Forwarded-For` is honored for rate limiting and client IP logging. Only proxy headers from listed sources are used. Accepted values: single IPs, CIDR ranges, and the aliases `loopback`, `docker`, `linklocal`, `cloudflare`. Mixed lists are comma-separated.

- Traefik on `10.100.2.200` (another host, published port reached directly): `TRUSTED_PROXIES=10.100.2.200`. A raw IP is fine; it is treated as `/32`. Traefik sets `X-Forwarded-For` by default.
- Traefik in the same Docker network on the same host: use `TRUSTED_PROXIES=docker`, or the container's IP.
- Unset or empty: no proxy headers trusted. Every request appears to come from Traefik's IP.

Point Traefik at the container's published port (`-p 8080:3000` above). Terminate TLS at Traefik. `BETTER_AUTH_URL` and `APP_URL` must be the `https://` public URL.

### Image tags

Published by `.github/workflows/docker-publish.yml` for `linux/amd64`:

| Trigger          | Tags                               |
| ---------------- | ---------------------------------- |
| push to `main`   | `main`, `sha-<short>`              |
| push of `v1.2.3` | `1.2.3`, `1.2`, `1`, `sha-<short>` |

Pin a version tag in production. `main` moves on every merge.

## Environment Files

### Development vs Production

| File                              | Purpose                  | Credentials                   |
| --------------------------------- | ------------------------ | ----------------------------- |
| `docker/docker-compose.local.yml` | Local dev, test, and E2E | Hardcoded defaults (insecure) |
| `docker/docker-compose.yml`       | Production deployment    | Required via `.env` file      |

**Never use `docker-compose.local.yml` in production!** It contains default credentials for convenience during local development.

The local compose file uses profiles to separate concerns:

| Profile   | Services       | Use Case                   |
| --------- | -------------- | -------------------------- |
| `dev`     | `db`           | Dev database on port 5432  |
| `dev-app` | `db` + `app`   | Dev database + app server  |
| `test`    | `test-db`      | Test database on port 5433 |
| `e2e`     | Full E2E stack | Docker-based E2E testing   |

## Required Environment Variables

The production `docker-compose.yml` requires these variables. The application will fail to start without them:

| Variable             | Description                | How to Generate                  |
| -------------------- | -------------------------- | -------------------------------- |
| `DB_PASSWORD`        | PostgreSQL password        | `openssl rand -base64 24`        |
| `SESSION_SECRET`     | Session encryption key     | `openssl rand -base64 32`        |
| `BETTER_AUTH_SECRET` | Auth token signing key     | `openssl rand -base64 32`        |
| `BETTER_AUTH_URL`    | Public app URL             | e.g. `https://vamsa.example.com` |
| `APP_URL`            | Public app URL (CORS/CSRF) | e.g. `https://vamsa.example.com` |

### Security Requirements

- `BETTER_AUTH_SECRET` must be at least 32 characters
- `DB_PASSWORD` should not be common defaults (password, admin, etc.)
- In production, the server validates credentials and exits if insecure

## Services

The production stack includes:

| Service | Port            | Description            |
| ------- | --------------- | ---------------------- |
| `db`    | internal only   | PostgreSQL 18 database |
| `app`   | 3000 (internal) | Vamsa application      |
| `nginx` | 80              | Reverse proxy          |

## Commands

```bash
# Start all services
docker compose -f docker/docker-compose.yml up -d

# View logs
docker compose -f docker/docker-compose.yml logs -f

# Stop services
docker compose -f docker/docker-compose.yml down

# Rebuild after code changes
docker compose -f docker/docker-compose.yml up -d --build

# Reset database (WARNING: destroys data)
docker compose -f docker/docker-compose.yml down -v
```

## Development Setup

For local development, use the local compose file with the `dev` profile:

```bash
# Start PostgreSQL only for local development
docker compose -f docker/docker-compose.local.yml --profile dev up -d

# Then run the app locally
pnpm dev

# Or start PostgreSQL + app together (test production builds locally)
docker compose -f docker/docker-compose.local.yml --profile dev-app up -d
```

## Health Checks

- **App**: `GET /health` returns `{"status": "healthy"}` (200). It does not query the database. `GET /readyz` runs `SELECT 1` and returns 503 if the DB is unreachable.
- **Image**: `HEALTHCHECK` runs `bun -e fetch(.../health)` every 30s. No curl or wget needed. `docker inspect --format '{{.State.Health.Status}}' vamsa` shows `healthy` once the server is up.
- **Nginx**: Proxies to app health check
- **Database**: Uses `pg_isready`

## Volumes

Data is persisted in Docker volumes:

| Volume                | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `vamsa-postgres-data` | Database files (PostgreSQL compose)                      |
| `vamsa-uploads-data`  | Mounted at `/app/data`: uploads, local backups (compose) |

Single-container SQLite: mount a volume at `/app/data` (see "Single Container" above).

## Troubleshooting

### Container won't start

Check logs for credential validation errors:

```bash
docker compose -f docker/docker-compose.yml logs app
```

Common issues:

- Missing required environment variables
- Weak credentials in production mode
- Database not ready (check db health)

### Reset everything

```bash
# Stop and remove all containers and volumes
docker compose -f docker/docker-compose.yml down -v

# Rebuild from scratch
docker compose -f docker/docker-compose.yml up -d --build
```

## Security Notes

1. **Never commit `.env` files** - They contain secrets
2. **Rotate credentials regularly** - Especially `BETTER_AUTH_SECRET`
3. **Use strong passwords** - Generated with `openssl rand`
4. **Report vulnerabilities** - See [SECURITY.md](./SECURITY.md)

### Database SSL

For Docker same-host deployments (default):

- Database connections use `DB_SSL_MODE: disable` (no SSL required)
- PostgreSQL is not exposed to the host machine
- Traffic remains within the Docker network (`vamsa-network`)

For remote database connections (AWS RDS, Supabase, etc.):

1. Set `DB_SSL_MODE` to one of:
   - `require`: SSL required, no certificate validation
   - `verify-ca`: SSL + CA certificate validation (recommended)
   - `verify-full`: SSL + hostname validation (most secure)

2. If using `verify-ca` or `verify-full`, download and provide the CA certificate:
   - AWS RDS: https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
   - Supabase: Available in project dashboard
   - Azure: Available via Azure portal

3. Mount the certificate in `docker-compose.yml`:
   ```yaml
   volumes:
     - /path/to/ca-cert.pem:/app/ca-cert.pem
   environment:
     DB_SSL_MODE: verify-ca
     DB_SSL_CA_CERT: /app/ca-cert.pem
   ```

### Database Access

In production, PostgreSQL is **not exposed** to the host machine. The database is only reachable by other containers on the Docker network (`vamsa-network`).

To access the database for maintenance:

```bash
# Interactive psql shell
docker exec -it vamsa-db psql -U vamsa

# Run a single query
docker exec -it vamsa-db psql -U vamsa -c "SELECT version();"
```

For local development, use `docker-compose.local.yml` which exposes PostgreSQL on port 5432 for Drizzle Studio and other database tools.
