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

| Variable             | Description            | How to Generate           |
| -------------------- | ---------------------- | ------------------------- |
| `DB_PASSWORD`        | PostgreSQL password    | `openssl rand -base64 24` |
| `SESSION_SECRET`     | Session encryption key | `openssl rand -base64 32` |
| `BETTER_AUTH_SECRET` | Auth token signing key | `openssl rand -base64 32` |

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
bun run dev

# Or start PostgreSQL + app together (test production builds locally)
docker compose -f docker/docker-compose.local.yml --profile dev-app up -d
```

## Health Checks

All services include health checks:

- **App**: `GET /health` returns `{"status": "healthy"}`
- **Nginx**: Proxies to app health check
- **Database**: Uses `pg_isready`

## Volumes

Data is persisted in Docker volumes:

| Volume                | Purpose        |
| --------------------- | -------------- |
| `vamsa-postgres-data` | Database files |
| `vamsa-uploads-data`  | User uploads   |

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
