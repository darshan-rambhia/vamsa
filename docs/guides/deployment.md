# Deployment Guide

This guide covers deploying Vamsa to production. For Docker-based deployments, see [DOCKER.md](../../DOCKER.md). This guide focuses on bare-metal / VPS deployment and general production concerns.

## Prerequisites

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| **Bun** | 1.0+ | JavaScript runtime (non-negotiable) |
| **PostgreSQL** | 18+ | Primary database |
| **nginx** | 1.24+ | Reverse proxy (recommended, not required) |
| **Redis** | 7+ | Rate limiting persistence (optional) |
| **Node.js** | 20+ | Only needed if Bun is unavailable for a specific step |

## Docker Deployment

For the simplest production deployment, use Docker Compose. See [DOCKER.md](../../DOCKER.md) for full instructions.

```bash
cp .env.example .env
# Edit .env with production values (see Environment Variables below)
docker compose -f docker/docker-compose.yml up -d
```

The Docker stack runs PostgreSQL, the Vamsa application (Bun + Hono), and optionally an AI sidecar service. The app container listens on port 3000 and is exposed on the host via `APP_PORT` (default 80).

## Bare-Metal / VPS Deployment

### 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or restart your shell
bun --version
```

### 2. Clone and Install

```bash
git clone https://github.com/your-org/vamsa.git
cd vamsa
bun install
```

### 3. Set Up PostgreSQL

Install PostgreSQL 18 and create the database:

```bash
sudo -u postgres psql <<SQL
CREATE USER vamsa WITH PASSWORD 'your-strong-password';
CREATE DATABASE vamsa OWNER vamsa;
GRANT ALL PRIVILEGES ON DATABASE vamsa TO vamsa;
SQL
```

For production PostgreSQL tuning, consider these settings (from the Docker Compose config):

```
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 64MB
work_mem = 4MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
random_page_cost = 1.1
effective_io_concurrency = 200
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with production values. At minimum, set these critical variables:

```bash
# Database
DATABASE_URL="postgresql://vamsa:your-strong-password@localhost:5432/vamsa"

# Authentication (REQUIRED - server refuses to start without these)
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
BETTER_AUTH_URL="https://your-domain.com"
APP_URL="https://your-domain.com"

# Admin account (for first run)
ADMIN_EMAIL="admin@your-domain.com"
ADMIN_PASSWORD=""  # Leave empty to auto-generate

# Monitoring (recommended)
METRICS_BEARER_TOKEN="$(openssl rand -hex 32)"
LOG_LEVEL="info"
```

See the [Environment Variables](#environment-variables) section for the full reference.

### 5. Run Database Migrations

```bash
bun run db:migrate
```

To seed the initial admin account:

```bash
bun run db:seed
```

### 6. Build

```bash
bun run build
```

This builds all packages (`packages/*`) and the web application (`apps/web`). The output goes to `apps/web/dist/` with `client/` (static assets) and `server/` (SSR bundle).

### 7. Start the Server

```bash
bun run start:prod
```

This starts the Bun + Hono production server on port 3000 (configurable via `PORT`). The server:

- Validates security credentials on startup (exits if insecure in production)
- Initializes OpenTelemetry (if configured)
- Sets up rate limiting (in-memory or Redis-backed)
- Serves the TanStack Start application with all middleware

### 8. nginx Reverse Proxy (Recommended)

Use nginx for SSL termination, static file serving, and request buffering.

Sample `/etc/nginx/sites-available/vamsa`:

```nginx
upstream vamsa_app {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL (use certbot or your certificate provider)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS (the app also sets this header, but nginx can set it earlier)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Static assets (immutable, long cache)
    location /assets/ {
        alias /path/to/vamsa/apps/web/dist/client/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Health check (no logging)
    location /health {
        proxy_pass http://vamsa_app;
        access_log off;
    }

    # Everything else proxied to the app
    location / {
        proxy_pass http://vamsa_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 8k;
        proxy_buffers 8 8k;
    }

    # Request size limit (for GEDCOM uploads, media)
    client_max_body_size 50M;
}
```

Enable the site and reload nginx:

```bash
sudo ln -s /etc/nginx/sites-available/vamsa /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

When using nginx as a reverse proxy, configure `TRUSTED_PROXIES` so the app correctly resolves client IPs:

```bash
TRUSTED_PROXIES="loopback"  # Trust localhost (nginx on same machine)
```

### 9. systemd Service Unit

Create `/etc/systemd/system/vamsa.service`:

```ini
[Unit]
Description=Vamsa Family Genealogy App
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=vamsa
Group=vamsa
WorkingDirectory=/path/to/vamsa/apps/web
Environment=NODE_ENV=production
EnvironmentFile=/path/to/vamsa/.env
ExecStart=/home/vamsa/.bun/bin/bun run start:prod
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vamsa

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/path/to/vamsa/apps/web/data
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vamsa
sudo systemctl start vamsa
sudo journalctl -u vamsa -f  # watch logs
```

## Environment Variables

All environment variables are documented in `.env.example`. The table below highlights the most important ones for production.

### Required

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `DATABASE_URL` | PostgreSQL connection string | Manual |
| `BETTER_AUTH_SECRET` | Auth token signing key (32+ chars) | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Public URL of the app | Manual |
| `APP_URL` | Public URL for OAuth callbacks | Manual |

### Strongly Recommended

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `METRICS_BEARER_TOKEN` | Protects `/health/detail`, `/health/cache`, `/health/telemetry` | `openssl rand -hex 32` |
| `TRUSTED_PROXIES` | IP ranges to trust for proxy headers | See `.env.example` |
| `LOG_LEVEL` | Pino log level (`debug`, `info`, `warn`, `error`) | Manual |

### Optional Services

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis for persistent rate limiting across restarts |
| `OTEL_ENABLED` | Enable OpenTelemetry traces and metrics |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `OIDC_DISCOVERY_URL` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` | Self-hosted OIDC (Authentik, Keycloak) |
| `RESEND_API_KEY` | Transactional email via Resend |
| `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Cloud backup (S3, R2, B2) |
| `LLM_PROVIDER` / `LLM_URL` / `LLM_MODEL` | AI service (opt-in) |

### Database SSL

For remote databases (AWS RDS, Supabase, etc.), configure SSL:

| Variable | Values |
|----------|--------|
| `DB_SSL_MODE` | `disable` (default), `require`, `verify-ca`, `verify-full` |
| `DB_SSL_CA_CERT` | Path to CA certificate file |

See `.env.example` and [DOCKER.md](../../DOCKER.md) for detailed SSL setup.

## Health Checks

The production server exposes several health endpoints.

### Public Endpoints (no authentication)

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health` | Liveness check for Docker/K8s | `{"status": "healthy", "timestamp": "...", "db": {"connected": true}}` |
| `GET /readyz` | Readiness check (runs `SELECT 1` against DB) | `{"status": "ready"}` |

Both return HTTP 503 when unhealthy/not ready.

### Protected Endpoints (require `METRICS_BEARER_TOKEN`)

These endpoints require a `Bearer` token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer $METRICS_BEARER_TOKEN" https://your-domain.com/health/detail
```

| Endpoint | Purpose | Response Includes |
|----------|---------|-------------------|
| `GET /health/detail` | Detailed system info | Uptime, version, runtime, memory usage |
| `GET /health/cache` | ETag cache metrics | Hit/miss rates, cache efficiency |
| `GET /health/telemetry` | Telemetry status | OpenTelemetry configuration |

## Production Checklist

### Security

- [ ] `BETTER_AUTH_SECRET` is a unique, randomly generated 32+ character string
- [ ] `DATABASE_URL` uses a strong password (not `password`, `admin`, etc.)
- [ ] `METRICS_BEARER_TOKEN` is set for monitoring endpoint protection
- [ ] SSL/TLS configured (via nginx or load balancer)
- [ ] `TRUSTED_PROXIES` configured to match your proxy setup
- [ ] OAuth secrets are set if using social login
- [ ] `APP_URL` matches your actual production domain

### Infrastructure

- [ ] PostgreSQL tuned for production (see Docker Compose settings above)
- [ ] Database backups configured (`BACKUP_SCHEDULE`, `BACKUP_KEEP_DAYS`)
- [ ] Log rotation configured (systemd journal or external)
- [ ] Monitoring in place (health check polling at minimum)
- [ ] Firewall rules restrict database access to the app server only

### Observability (Recommended)

- [ ] OpenTelemetry enabled (`OTEL_ENABLED=true`) with a collector
- [ ] Grafana dashboards configured (see `docker/observability/`)
- [ ] Alert rules configured (see [alerts-runbook.md](./alerts-runbook.md))
- [ ] Web Vitals collection enabled (automatic via `/api/v1/vitals`)

### Backups

Database backups can be automated with the built-in backup tooling:

```bash
# Manual backup
bun run db:backup

# Pre-migration backup with verification
bun run db:backup:pre-migration

# Check backup status
bun run db:backup:status

# Docker-based scheduled backups
bun run docker:backup
```

Configure retention via environment:

```bash
BACKUP_SCHEDULE="@daily"
BACKUP_KEEP_DAYS=30
BACKUP_KEEP_WEEKS=4
BACKUP_KEEP_MONTHS=6
```

For cloud backup (S3, R2, B2), set the `S3_*` variables in `.env`.

## Updating

To deploy a new version:

```bash
cd /path/to/vamsa
git pull origin main
bun install
bun run db:migrate       # Run any new migrations
bun run build
sudo systemctl restart vamsa
```

For zero-downtime deployments, consider running two instances behind a load balancer and draining connections before restart.

## Related Documentation

- [DOCKER.md](../../DOCKER.md) -- Docker Compose deployment
- [Authentication Guide](./authentication.md) -- OAuth and SSO setup
- [API Documentation](./api.md) -- REST API reference
- [Alerts Runbook](./alerts-runbook.md) -- Monitoring alert response procedures
