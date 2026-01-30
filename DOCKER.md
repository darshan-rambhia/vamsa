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

| File                            | Purpose                | Credentials                   |
| ------------------------------- | ---------------------- | ----------------------------- |
| `docker/docker-compose.dev.yml` | Local development only | Hardcoded defaults (insecure) |
| `docker/docker-compose.yml`     | Production deployment  | Required via `.env` file      |

**Never use `docker-compose.dev.yml` in production!** It contains default credentials for convenience during local development.

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
| `db`    | 5432            | PostgreSQL 18 database |
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

For local development, use the dev compose file:

```bash
# Start PostgreSQL only for local development
docker compose -f docker/docker-compose.dev.yml up -d

# Then run the app locally
bun run dev
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
