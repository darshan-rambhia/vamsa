# Security Guide

Vamsa is designed to keep your family data private and secure. This page covers how to harden your installation, what protections are built in, and what you should configure.

---

## Is my data safe?

The short answer: **yes, as long as you follow the recommendations on this page.**

Here is what Vamsa does by default:

- **Your data stays on YOUR server.** Vamsa does not phone home or send telemetry to anyone.
- **No cloud dependencies.** Everything runs locally unless you choose to enable cloud AI or cloud backups.
- **No tracking, no analytics.** There are no third-party scripts, trackers, or ad networks.
- **AI crawlers are blocked.** Vamsa automatically rejects requests from known AI training bots (GPTBot, ClaudeBot, etc.) and serves a `robots.txt` that tells all crawlers to stay away.
- **Regular backups protect against hardware failure.** See [Backup & Restore](../guides/backup-restore.md).

!!! tip "The biggest risk is hardware failure, not hackers"
    For most homelab users, the most likely way to lose data is a hard drive dying without a backup. Set up automated backups before worrying about anything else on this page.

---

## HTTPS setup

HTTPS encrypts the connection between your browser and Vamsa. Without it, passwords and family data travel over the network in plain text.

!!! danger "HTTPS is required for production use"
    Authentication cookies and OAuth logins will not work correctly over plain HTTP in production. Always use HTTPS when accessing Vamsa from outside your local network.

### Option 1: Reverse proxy with Let's Encrypt (recommended)

A reverse proxy sits in front of Vamsa and handles HTTPS for you. Here are the most common options:

**Caddy** (easiest -- automatic HTTPS with zero configuration):

```
family.example.com {
    reverse_proxy localhost:80
}
```

Caddy automatically obtains and renews SSL certificates from Let's Encrypt.

**nginx** (most popular):

```nginx
server {
    listen 443 ssl;
    server_name family.example.com;

    ssl_certificate /etc/letsencrypt/live/family.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/family.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Use [Certbot](https://certbot.eff.org/) to obtain and renew certificates.

**Traefik** (good for Docker-heavy setups):

Traefik can automatically discover Docker containers and issue certificates. See the [Traefik documentation](https://doc.traefik.io/traefik/) for setup instructions.

### Option 2: Cloudflare (free SSL termination)

If your domain uses Cloudflare DNS, you can enable their free proxy to get HTTPS without running your own certificate manager:

1. Point your domain's DNS to your server's IP address in Cloudflare
2. Set SSL/TLS mode to "Full" in the Cloudflare dashboard
3. Cloudflare handles the certificate automatically

!!! info "What is a reverse proxy?"
    A reverse proxy is a server that sits between the internet and your application. It receives requests from browsers, forwards them to Vamsa, and sends the responses back. Along the way, it can add HTTPS encryption, cache static files, and block bad traffic.

### Update your app URL

After setting up HTTPS, update your `.env` file:

```ini
BETTER_AUTH_URL="https://family.example.com"
APP_URL="https://family.example.com"
```

Then restart Vamsa.

---

## Rate limiting

Rate limiting prevents abuse by restricting how many requests a single user or IP address can make in a given time window.

!!! info "What does rate limiting do?"
    Imagine someone trying to guess your password by attempting thousands of combinations. Rate limiting stops them after a few failed attempts, forcing them to wait before trying again.

### Default configuration

Vamsa comes with sensible defaults that work for most installations:

| Action | Max attempts | Time window |
|--------|-------------|-------------|
| Sign in | 5 | 1 minute |
| Sign up | 3 | 1 hour |
| Password reset | 3 | 1 hour |
| Profile claim | 10 | 1 hour |
| Search | 30 | 1 minute |
| General API | 100 | 1 minute |

### Customizing rate limits

If the defaults do not fit your needs, you can adjust them in `.env`:

```ini
# Example: Allow 10 login attempts per minute instead of 5
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_LOGIN_WINDOW=60

# Example: Allow 200 API requests per minute for power users
RATE_LIMIT_API_MAX=200
RATE_LIMIT_API_WINDOW=60
```

### Using Redis for rate limiting (optional)

By default, rate limits are tracked in memory. This works fine for a single server, but limits reset when Vamsa restarts. For persistent rate limiting, add Redis:

```ini
REDIS_URL=redis://localhost:6379
```

!!! tip "You probably do not need Redis"
    In-memory rate limiting is fine for most homelab setups. Redis is only needed if you run multiple Vamsa instances behind a load balancer, or if you want rate limits to survive restarts.

---

## Trusted proxies

When Vamsa sits behind a reverse proxy (nginx, Caddy, Cloudflare, etc.), it needs to know which proxy to trust for determining the real client IP address.

!!! info "Why does this matter?"
    Without trusted proxy configuration, an attacker could fake their IP address by sending a forged `X-Forwarded-For` header, potentially bypassing rate limits or appearing as a different user in the logs.

### Configuration

Set `TRUSTED_PROXIES` in your `.env` file:

```ini
# Behind Docker's internal network (default for Docker installs)
TRUSTED_PROXIES="docker"

# Behind Cloudflare
TRUSTED_PROXIES="cloudflare"

# Behind a local nginx reverse proxy
TRUSTED_PROXIES="loopback"

# Multiple proxies (Cloudflare + Docker)
TRUSTED_PROXIES="cloudflare,docker"
```

Available aliases:

| Alias | What it covers |
|-------|---------------|
| `loopback` | `127.0.0.0/8` and `::1` (localhost) |
| `docker` | `172.16.0.0/12`, `10.0.0.0/8`, `192.168.0.0/16` (private networks) |
| `linklocal` | `169.254.0.0/16` and `fe80::/10` |
| `cloudflare` | All Cloudflare IP ranges |

You can also use specific CIDR ranges:

```ini
TRUSTED_PROXIES="10.0.0.0/8,172.16.0.0/12"
```

!!! warning "Empty means trust nothing"
    If `TRUSTED_PROXIES` is empty or not set, Vamsa will not use any proxy headers for IP resolution. This is the safest default but means rate limiting will see the proxy's IP instead of the real client IP.

---

## Database SSL

If your PostgreSQL database is hosted in the cloud (AWS RDS, Supabase, Neon, etc.), you should enable SSL for the database connection.

```ini
# Require SSL but skip certificate validation (minimum for cloud databases)
DB_SSL_MODE=require

# Full validation with a CA certificate (most secure)
DB_SSL_MODE=verify-full
DB_SSL_CA_CERT=/path/to/ca-certificate.pem
```

!!! tip "Local databases do not need SSL"
    If your database runs on the same machine as Vamsa (which is the default Docker setup), you can leave `DB_SSL_MODE=disable`. The connection never leaves your machine.

---

## API documentation

Vamsa includes built-in API documentation (Swagger/OpenAPI) for developers. In production, this is disabled by default to avoid exposing your API structure.

```ini
# Default (disabled in production) -- no action needed
# ENABLE_API_DOCS=false

# Only enable if you need it
ENABLE_API_DOCS=true
```

!!! warning "Disable API docs in production"
    Leaving API documentation enabled in production gives potential attackers a detailed map of every endpoint. Keep it disabled unless you are actively developing against the API.

---

## Metrics endpoint

The `/health/detail`, `/health/cache`, and `/health/telemetry` endpoints expose internal system information. They are protected by a bearer token.

### Setting up the token

```bash
# Generate a token
openssl rand -hex 32
```

You should see:

```
a1b2c3d4e5f6...  (64 characters)
```

Add it to your `.env`:

```ini
METRICS_BEARER_TOKEN=a1b2c3d4e5f6...
```

!!! danger "Always set this in production"
    Without a metrics token, the detailed health endpoints are inaccessible (which is safe). But if you want to use them for monitoring, make sure the token is long and random.

---

## Backup encryption

If you store backups offsite (cloud storage, another server), consider encrypting them to protect the data in transit and at rest.

You can encrypt a backup file with GPG:

```bash
# Encrypt
gpg --symmetric --cipher-algo AES256 backup-2026-02-16.sql.gz

# Decrypt
gpg --decrypt backup-2026-02-16.sql.gz.gpg > backup-2026-02-16.sql.gz
```

!!! tip "Store the encryption password somewhere safe"
    If you forget the encryption password, your backup is unrecoverable. Write it down and store it separately from the backup itself.

---

## Security checklist

Here is a quick checklist for securing your Vamsa installation:

- [ ] Strong, random `DB_PASSWORD` (at least 24 characters)
- [ ] Strong, random `BETTER_AUTH_SECRET` (at least 32 characters)
- [ ] `METRICS_BEARER_TOKEN` set (at least 32 characters)
- [ ] HTTPS enabled (reverse proxy or Cloudflare)
- [ ] `BETTER_AUTH_URL` and `APP_URL` set to your HTTPS URL
- [ ] `TRUSTED_PROXIES` configured for your network setup
- [ ] `ENABLE_API_DOCS` left disabled (the default)
- [ ] Automated backups running
- [ ] Firewall only exposes ports 80 and 443

---

## Next steps

- **[Monitoring](monitoring.md)** -- Keep an eye on your Vamsa instance
- **[Updating Vamsa](updating.md)** -- Stay current with security patches
- **[Backup & Restore](../guides/backup-restore.md)** -- Protect against data loss
