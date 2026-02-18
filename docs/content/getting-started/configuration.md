# Configuration Reference

Vamsa is configured through a single `.env` file in the project root. This page explains every setting in plain language so you know what each one does and whether you need to change it.

!!! tip "You do not need to configure everything"
    Most settings have sensible defaults. For a basic home setup, you only need to set `DB_PASSWORD` and `BETTER_AUTH_SECRET`. Everything else is optional.

!!! info "How to edit your configuration"
    Open the `.env` file in any text editor. After making changes:

    === "Docker"

        Restart the containers to pick up the new values:

        ```bash
        docker compose --env-file .env -f docker/docker-compose.yml up -d
        ```

    === "Bare Metal"

        Stop and restart the server:

        ```bash
        # Press Ctrl+C to stop, then:
        bun run start
        ```

---

## Database

These settings control how Vamsa connects to PostgreSQL, the database where all your family tree data is stored.

### `DATABASE_URL`

The connection string for your PostgreSQL database.

=== "Docker"

    You do **not** need to set this. Docker Compose builds it automatically from `DB_USER`, `DB_PASSWORD`, and `DB_NAME` (see [Docker Settings](#docker-settings) below).

=== "Bare Metal"

    Set this to point to your PostgreSQL instance:

    ```ini
    DATABASE_URL="postgresql://vamsa:your_password@localhost:5432/vamsa"
    ```

!!! info "What is a connection string?"
    It is an address that tells Vamsa where to find the database. The format is:

    ```
    postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
    ```

### Connection pool settings

These control how many simultaneous database connections Vamsa keeps open. The defaults work well for most home setups.

| Setting | Default | What it does |
|---------|---------|--------------|
| `DB_POOL_MAX` | `10` | Maximum number of connections open at once |
| `DB_POOL_MIN` | `2` | Minimum connections kept ready |
| `DB_POOL_IDLE_TIMEOUT` | `30000` | Close unused connections after this many milliseconds (30 seconds) |
| `DB_POOL_CONNECTION_TIMEOUT` | `10000` | Give up connecting after this many milliseconds (10 seconds) |

!!! tip "When to change these"
    If you have fewer than 10 family members using Vamsa at the same time, the defaults are fine. Leave them as-is unless you are troubleshooting connection errors.

### Database SSL

SSL encrypts the connection between Vamsa and the database. You only need this if your database is hosted remotely (for example, on AWS RDS or Supabase).

| Setting | Default | What it does |
|---------|---------|--------------|
| `DB_SSL_MODE` | `disable` | How strictly to enforce encryption. Options: `disable`, `require`, `verify-ca`, `verify-full` |
| `DB_SSL_CA_CERT` | _(empty)_ | Path to a certificate file. Required for `verify-ca` and `verify-full` modes |

=== "Docker (same machine)"

    Leave `DB_SSL_MODE` as `disable`. The database and app run on the same private network inside Docker, so encryption is not needed.

=== "Cloud database"

    Set `DB_SSL_MODE` to `require` at minimum:

    ```ini
    DB_SSL_MODE=require
    ```

    For maximum security with services like AWS RDS:

    ```ini
    DB_SSL_MODE=verify-full
    DB_SSL_CA_CERT=/path/to/ca-certificate.pem
    ```

---

## Authentication

These settings control how users log in to Vamsa.

### `BETTER_AUTH_SECRET`

**Required.** A random string that keeps login sessions secure. Think of it like the master key for your app's locks.

```ini
BETTER_AUTH_SECRET="your-random-string-here"
```

Generate one with:

```bash
openssl rand -base64 32
```

You should see a random string like:

```
xR7kM3nQ9pB2wY5tL8vJ1hF4dA6cG0eS+zU=
```

!!! warning "Keep this secret"
    Anyone who knows this value can forge login sessions. Never share it publicly. If you suspect it has been leaked, generate a new one and restart Vamsa -- all users will need to log in again.

### `BETTER_AUTH_URL`

The URL where your app is running. Used internally by the authentication system.

=== "Docker"

    ```ini
    BETTER_AUTH_URL="http://localhost:3000"
    ```

    This is the internal container URL. You do not need to change it even if you access Vamsa on a different port.

=== "Bare Metal"

    ```ini
    BETTER_AUTH_URL="http://localhost:3000"
    ```

=== "Cloud / Custom Domain"

    ```ini
    BETTER_AUTH_URL="https://family.example.com"
    ```

### `ADMIN_EMAIL`

The email address for the first admin account, created when you seed the database.

```ini
ADMIN_EMAIL="you@example.com"
```

### `ADMIN_PASSWORD`

The password for the first admin account. Leave it empty to auto-generate a secure one.

```ini
ADMIN_PASSWORD=""
```

!!! tip "Finding the auto-generated password"
    If you leave this empty, Vamsa prints the generated password to the server logs on first startup:

    ```bash
    docker logs vamsa-app 2>&1 | grep -i password
    ```

---

## OAuth Providers (Optional)

OAuth lets users sign in with their existing Google, Microsoft, or GitHub accounts instead of creating a separate password. This is entirely optional -- email/password login always works.

!!! info "What is OAuth?"
    OAuth is a standard that lets you "Sign in with Google" (or Microsoft, GitHub, etc.) instead of creating a new username and password. Your password is never shared with Vamsa -- the provider just confirms your identity.

### Google

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Set the authorized redirect URI to `{your_app_url}/api/auth/callback/google`
4. Copy the Client ID and Client Secret into your `.env`:

```ini
GOOGLE_CLIENT_ID="123456789.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abcdefg"
```

### Microsoft

1. Go to the [Azure App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
2. Register a new application
3. Add a redirect URI: `{your_app_url}/api/auth/callback/microsoft`
4. Copy the values:

```ini
MICROSOFT_CLIENT_ID="your-client-id"
MICROSOFT_CLIENT_SECRET="your-client-secret"
MICROSOFT_TENANT_ID="common"
```

!!! info "Tenant ID"
    Use `common` to allow any Microsoft account. Use your organization's tenant ID to restrict to your organization only.

### GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set the callback URL to `{your_app_url}/api/auth/callback/github`
4. Copy the values:

```ini
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"
```

### Self-hosted OIDC (Advanced)

If you run your own identity provider like **Authentik** or **Keycloak**, you can connect it using OpenID Connect (OIDC).

```ini
OIDC_DISCOVERY_URL="https://auth.example.com/.well-known/openid-configuration"
OIDC_CLIENT_ID="vamsa"
OIDC_CLIENT_SECRET="your-oidc-secret"
```

!!! info "What is OIDC?"
    OpenID Connect is a standard protocol for identity verification. If you run a self-hosted identity system (like Authentik or Keycloak) for your homelab, you can use it as a single sign-on provider for Vamsa and all your other apps.

### `APP_URL`

The public URL of your Vamsa instance. OAuth providers redirect users back to this URL after they sign in.

```ini
APP_URL="http://localhost:3000"
```

For production with a custom domain:

```ini
APP_URL="https://family.yourlastname.com"
```

---

## Email

Vamsa uses [Resend](https://resend.com) to send emails for invitations, password resets, and notifications.

### `RESEND_API_KEY`

Your Resend API key. Sign up at [resend.com](https://resend.com) (free tier allows 3,000 emails per month).

```ini
RESEND_API_KEY="re_1234567890abcdef"
```

### `EMAIL_FROM`

The "from" address on emails Vamsa sends.

```ini
EMAIL_FROM="noreply@vamsa.family"
```

!!! info "What happens without email configured?"
    Vamsa works fine without email. The main difference is:

    - **Invitations**: Instead of sending an email, Vamsa shows you a shareable link to copy and send manually
    - **Password resets**: Users will need an admin to reset their password manually

---

## Cloud Storage (Optional)

Cloud storage lets Vamsa store backup files on a remote service for safekeeping. This is completely optional -- backups are always saved locally first.

Vamsa works with any S3-compatible storage service:

- **AWS S3** -- Amazon's cloud storage
- **Cloudflare R2** -- S3-compatible, no egress fees
- **Backblaze B2** -- Affordable, S3-compatible

| Setting | What it does | Example |
|---------|-------------|---------|
| `S3_ENDPOINT` | Service URL. Leave empty for AWS S3 | `https://abc123.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | Your access key | `AKIA...` |
| `S3_SECRET_ACCESS_KEY` | Your secret key | `wJalr...` |
| `S3_REGION` | Storage region | `us-east-1` or `auto` for R2 |

=== "AWS S3"

    ```ini
    S3_ENDPOINT=""
    S3_ACCESS_KEY_ID="AKIA..."
    S3_SECRET_ACCESS_KEY="wJalr..."
    S3_REGION="us-east-1"
    ```

=== "Cloudflare R2"

    ```ini
    S3_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
    S3_ACCESS_KEY_ID="your-r2-access-key"
    S3_SECRET_ACCESS_KEY="your-r2-secret-key"
    S3_REGION="auto"
    ```

=== "Backblaze B2"

    ```ini
    S3_ENDPOINT="https://s3.us-west-004.backblazeb2.com"
    S3_ACCESS_KEY_ID="your-b2-key-id"
    S3_SECRET_ACCESS_KEY="your-b2-application-key"
    S3_REGION="us-west-004"
    ```

!!! tip "When to set this up"
    Set up cloud storage if you want an off-site copy of your backups -- for example, in case your server's hard drive fails. For most home users, the automated local backups (see [Backups](#backups)) are sufficient to start.

---

## Observability (Optional)

These settings control logging, metrics, and monitoring. Most home users do not need to change anything here.

### `LOG_LEVEL`

Controls how much detail Vamsa writes to its logs.

```ini
LOG_LEVEL="info"
```

| Level | What it shows | When to use |
|-------|--------------|-------------|
| `error` | Only errors | Production, if logs are too noisy |
| `warn` | Errors + warnings | Production default |
| `info` | Errors + warnings + general activity | **Recommended default** |
| `debug` | Everything, including detailed internals | Troubleshooting problems |

!!! tip "Checking the logs"
    === "Docker"

        ```bash
        docker logs vamsa-app
        ```

        Follow logs in real-time:

        ```bash
        docker logs -f vamsa-app
        ```

    === "Bare Metal"

        Logs print directly to your terminal. Use `LOG_LEVEL=debug` to see more detail:

        ```bash
        LOG_LEVEL=debug bun run start
        ```

### OpenTelemetry

OpenTelemetry collects detailed performance data from Vamsa -- how long requests take, where time is spent, and so on.

| Setting | Default | What it does |
|---------|---------|--------------|
| `OTEL_ENABLED` | `false` | Turn on/off telemetry collection |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Where to send telemetry data |
| `OTEL_SERVICE_NAME` | `vamsa-web` | Label for this service in dashboards |

!!! info "When to care about this"
    Most home users do not need OpenTelemetry. It is useful if you are running multiple services and want a unified monitoring dashboard, or if you are troubleshooting performance issues.

### Grafana and Prometheus

Grafana provides visual dashboards. Prometheus collects and stores metrics. Together, they give you graphs showing things like request rates, response times, and database performance.

| Setting | Default | What it does |
|---------|---------|--------------|
| `PROMETHEUS_URL` | `http://localhost:9090` | Prometheus server address |
| `GRAFANA_URL` | `http://localhost:3001` | Grafana dashboard address |
| `GRAFANA_PASSWORD` | `admin` | Grafana admin password |

Vamsa includes a pre-configured observability stack. To start it:

```bash
docker compose -f docker/observability/docker-compose.yml up -d
```

!!! warning "Change the Grafana password"
    If you enable the observability stack, change `GRAFANA_PASSWORD` from the default `admin` to something secure.

### `METRICS_BEARER_TOKEN`

Protects the `/health/cache` and `/health/telemetry` endpoints so only authorized monitoring tools can access them.

```bash
# Generate a token
openssl rand -hex 32
```

```ini
METRICS_BEARER_TOKEN="your-generated-token-here"
```

!!! info "When to set this"
    Only needed if you expose Vamsa to the internet and want to protect the metrics endpoints from public access.

---

## Trusted Proxies

Controls which proxy headers Vamsa trusts for determining a user's real IP address. This is important for rate limiting to work correctly.

```ini
# TRUSTED_PROXIES=""
```

| Value | What it means |
|-------|---------------|
| _(empty)_ | Trust nothing -- safest default. No proxy headers are used |
| `loopback` | Trust requests from localhost (`127.0.0.1`) |
| `docker` | Trust Docker's internal network ranges |
| `loopback,docker` | Trust both localhost and Docker networks |
| `cloudflare` | Trust Cloudflare's IP ranges (if using Cloudflare as a CDN) |

=== "Docker"

    Docker Compose sets this to `docker` automatically. You do not need to change it.

=== "Behind Cloudflare"

    ```ini
    TRUSTED_PROXIES="cloudflare"
    ```

=== "Behind nginx or another reverse proxy"

    ```ini
    TRUSTED_PROXIES="127.0.0.1"
    ```

!!! info "Why does this matter?"
    When Vamsa sits behind a proxy (like nginx or Cloudflare), the proxy forwards requests on behalf of users. The proxy adds headers like `X-Forwarded-For` to indicate the user's real IP. Without trusted proxy settings, Vamsa might see all traffic as coming from the proxy's IP, which would break rate limiting.

---

## Rate Limiting

Rate limiting prevents abuse by restricting how many requests someone can make in a given time period. This protects your instance from brute-force attacks and accidental overload.

!!! tip "The defaults are fine for most users"
    Vamsa ships with sensible rate limits. You only need to change these if you are getting false positives (legitimate users being blocked) or want tighter security.

### How it works

Vamsa limits different actions separately:

| Action | Default Limit | What it protects |
|--------|--------------|------------------|
| Login | 5 attempts per minute | Prevents password guessing |
| Register | 3 attempts per hour | Prevents account spam |
| Password Reset | 3 attempts per hour | Prevents email flooding |
| Profile Claim | 10 attempts per hour | Prevents abuse |
| Search | 30 searches per minute | Prevents overloading |
| General API | 100 requests per minute | Overall protection |

To customize any limit, uncomment and change the values in `.env`:

```ini
# Example: Allow 10 login attempts per 2 minutes
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_LOGIN_WINDOW=120
```

### Redis (Optional)

By default, rate limit counters are stored in memory. This means they reset when Vamsa restarts. For persistent rate limiting (survives restarts) or if you run multiple Vamsa instances, use Redis.

```ini
REDIS_URL="redis://localhost:6379"
```

!!! info "When to use Redis"
    Only needed if you run multiple Vamsa app instances behind a load balancer. For a single instance (which is the case for most home setups), in-memory rate limiting works perfectly.

---

## Backups

Vamsa can automatically back up your database on a schedule.

### `BACKUP_DIR`

Where backup files are stored on disk.

```ini
BACKUP_DIR="./backups"
```

### `BACKUP_SCHEDULE`

How often to create backups, using a simple schedule keyword or cron expression.

```ini
BACKUP_SCHEDULE="@daily"
```

| Value | When backups run |
|-------|-----------------|
| `@hourly` | Every hour |
| `@daily` | Once a day at midnight UTC |
| `@weekly` | Once a week on Sunday at midnight UTC |
| `@monthly` | Once a month on the 1st at midnight UTC |
| `0 2 * * *` | Custom: daily at 2:00 AM UTC (cron format) |

!!! info "What is cron format?"
    Cron is a way to express schedules using five fields: `minute hour day-of-month month day-of-week`. For example, `0 2 * * *` means "at minute 0, hour 2, every day, every month, every day of the week." For most people, the `@daily` or `@weekly` shortcuts are easiest.

### Retention settings

These control how long backups are kept before being automatically deleted.

| Setting | Default | What it does |
|---------|---------|--------------|
| `BACKUP_KEEP_DAYS` | `30` | Keep daily backups for 30 days |
| `BACKUP_KEEP_WEEKS` | `4` | Keep one weekly backup (Sunday) for 4 weeks |
| `BACKUP_KEEP_MONTHS` | `6` | Keep one monthly backup (1st of month) for 6 months |

!!! tip "Storage math"
    A Vamsa database with 1,000 people and photos is typically under 100 MB. With daily backups and 30-day retention, that is about 3 GB of backup storage. Adjust retention if disk space is tight.

To enable automated backups with Docker:

```bash
docker compose --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.backup.yml \
  up -d
```

---

## AI Features (Optional)

Vamsa has optional AI features that can help with tasks like suggesting relationships, summarizing family stories, and more. AI is completely opt-in and disabled by default.

### Master switch

```ini
VAMSA_AI_ENABLED=false
```

Set to `true` to enable AI features in the Vamsa interface. You also need an AI provider running (see below).

### Choosing a provider

| Provider | Cost | Privacy | Setup |
|----------|------|---------|-------|
| **Ollama** (local) | Free | Data stays on your machine | Install Ollama, download a model |
| **OpenAI** | Paid per use | Data sent to OpenAI servers | Get an API key |
| **Groq** | Free tier available | Data sent to Groq servers | Get an API key |

### `LLM_PROVIDER`

Which AI backend to use.

```ini
LLM_PROVIDER="ollama"
```

| Value | Service |
|-------|---------|
| `ollama` | Local AI via Ollama (free, private) |
| `openai` | OpenAI API (GPT-4o, etc.) |
| `openai-compatible` | Any OpenAI-compatible API (Groq, etc.) |

### `LLM_URL`

Where to reach the AI service.

=== "Ollama (local)"

    ```ini
    LLM_URL="http://localhost:11434/v1"
    ```

=== "OpenAI"

    ```ini
    LLM_URL="https://api.openai.com/v1"
    ```

=== "Groq"

    ```ini
    LLM_URL="https://api.groq.com/openai/v1"
    ```

### `LLM_MODEL`

Which AI model to use. Smaller models are faster but less capable.

=== "Ollama (local)"

    ```ini
    # Small and fast (recommended for Raspberry Pi):
    LLM_MODEL="qwen2.5:1.5b"

    # Medium (good balance):
    LLM_MODEL="llama3.2:3b"

    # Large (best quality, needs 8 GB+ RAM):
    LLM_MODEL="mistral:7b"
    ```

=== "OpenAI"

    ```ini
    # Fast and affordable:
    LLM_MODEL="gpt-4o-mini"

    # Most capable:
    LLM_MODEL="gpt-4o"
    ```

### `LLM_API_KEY`

API key for cloud providers. Not needed for Ollama.

```ini
LLM_API_KEY="sk-..."
```

### `AI_API_KEY`

Optional key to protect the AI service endpoint.

```bash
# Generate one:
openssl rand -hex 32
```

```ini
AI_API_KEY="your-generated-key"
```

### `VAMSA_AI_URL`

URL of the AI sidecar service (used by the main Vamsa app to communicate with the AI service).

```ini
VAMSA_AI_URL="http://localhost:3100"
```

### Setting up Ollama locally

[Ollama](https://ollama.com) runs AI models on your own machine. Your data never leaves your network.

1. Install Ollama from [ollama.com/download](https://ollama.com/download)
2. Download a model:

    ```bash
    ollama pull qwen2.5:1.5b
    ```

    You should see:

    ```
    pulling manifest
    pulling 8de95...  100% |████████████████| 1.0 GB
    success
    ```

3. Set the values in `.env`:

    ```ini
    LLM_PROVIDER="ollama"
    LLM_URL="http://localhost:11434/v1"
    LLM_MODEL="qwen2.5:1.5b"
    VAMSA_AI_ENABLED=true
    ```

4. Start the AI service alongside Vamsa:

    ```bash
    docker compose --env-file .env -f docker/docker-compose.yml --profile ai up -d
    ```

---

## API Documentation

```ini
# ENABLE_API_DOCS=true
```

Vamsa includes OpenAPI/Swagger documentation for its API. This is always available in development mode. To enable it in production, uncomment and set:

```ini
ENABLE_API_DOCS=true
```

!!! info "When to enable this"
    Only needed if you are developing integrations with Vamsa's API or want to explore the available endpoints. Most users do not need this.

---

## Docker Settings

These settings are only used when running Vamsa with Docker Compose.

### `DB_PASSWORD`

**Required.** The password for the PostgreSQL database running inside Docker.

```bash
# Generate a strong password:
openssl rand -base64 24
```

```ini
DB_PASSWORD="your-generated-password"
```

!!! warning "This is required"
    Docker Compose will refuse to start if `DB_PASSWORD` is empty. Always generate a unique, random password.

### `DB_USER`

The PostgreSQL username. Defaults to `vamsa`.

```ini
DB_USER=vamsa
```

### `DB_NAME`

The PostgreSQL database name. Defaults to `vamsa`.

```ini
DB_NAME=vamsa
```

### `APP_PORT`

The port on your machine where you access Vamsa. Defaults to `80`.

```ini
APP_PORT=80
```

To use a different port (for example, if port 80 is already in use):

```ini
APP_PORT=8080
```

Then access Vamsa at `http://localhost:8080`.

!!! info "Why port 80?"
    Port 80 is the default for web traffic. Using it means you can access Vamsa at `http://localhost` without specifying a port number. If you already run a web server (like nginx or Apache) on port 80, change this to another port.

### `SKIP_SSL_VERIFY`

Skip SSL certificate verification during the Docker build. Only needed in corporate environments that use proxy servers (like Zscaler) that intercept HTTPS traffic.

```ini
# SKIP_SSL_VERIFY=true
```

!!! warning "Security note"
    Only enable this if you know your network uses an SSL-intercepting proxy. In all other cases, leave it commented out.

---

## Quick reference: Required vs. optional

| Setting | Required? | Default |
|---------|-----------|---------|
| `DB_PASSWORD` | **Yes** (Docker) | _(none)_ |
| `BETTER_AUTH_SECRET` | **Yes** | _(none)_ |
| `DATABASE_URL` | **Yes** (Bare Metal) | _(none)_ |
| `ADMIN_EMAIL` | Recommended | `admin@vamsa.local` |
| `ADMIN_PASSWORD` | No | Auto-generated |
| `APP_PORT` | No | `80` |
| `LOG_LEVEL` | No | `info` |
| Everything else | No | See defaults above |
