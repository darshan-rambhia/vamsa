# Monitoring & Observability

Vamsa provides built-in tools to help you check whether your instance is healthy, read logs, and optionally set up dashboards for deeper visibility. Most home users only need the basics -- check the health endpoint now and then, and look at logs if something seems off.

---

## Health check endpoints

Vamsa exposes several HTTP endpoints you can use to check on the application.

### /health -- Basic health check

This is the main endpoint for checking whether Vamsa is running and can reach the database. It is public and does not require authentication.

```bash
curl http://localhost/health
```

You should see:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-16T12:00:00.000Z",
  "db": { "connected": true }
}
```

If the database is unreachable, the response will look like:

```json
{
  "status": "unhealthy",
  "timestamp": "2026-02-16T12:00:00.000Z",
  "db": { "connected": false }
}
```

The HTTP status code will be `503` (Service Unavailable) when unhealthy.

!!! tip "Automated monitoring"
    You can point an uptime monitoring tool (like [Uptime Kuma](https://github.com/louislam/uptime-kuma), [Healthchecks.io](https://healthchecks.io), or your router's built-in monitor) at `http://your-vamsa-address/health` to get notified if Vamsa goes down.

### /health/detail -- Detailed system information

This endpoint returns memory usage, uptime, runtime version, and environment details. It is protected by a bearer token.

```bash
curl -H "Authorization: Bearer YOUR_METRICS_TOKEN" http://localhost/health/detail
```

You should see:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-16T12:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "runtime": "bun 1.2.0",
  "environment": "production",
  "memory": {
    "rss": 52428800,
    "heapTotal": 33554432,
    "heapUsed": 25165824,
    "external": 1048576
  }
}
```

### /health/cache -- Cache statistics

Shows how effective the built-in HTTP caching is. Protected by bearer token.

```bash
curl -H "Authorization: Bearer YOUR_METRICS_TOKEN" http://localhost/health/cache
```

### /health/telemetry -- Telemetry status

Shows the current OpenTelemetry configuration (whether it is enabled, where traces are being sent). Protected by bearer token.

```bash
curl -H "Authorization: Bearer YOUR_METRICS_TOKEN" http://localhost/health/telemetry
```

!!! info "What is METRICS_BEARER_TOKEN?"
    The protected endpoints require a secret token to prevent unauthorized access to your system's internal details. You set this token in your `.env` file. Generate one with:

    ```bash
    openssl rand -hex 32
    ```

    Then add it to your `.env`:

    ```ini
    METRICS_BEARER_TOKEN=your_generated_token_here
    ```

---

## Reading logs

Vamsa logs are structured JSON -- each log line is a machine-readable record with a timestamp, log level, message, and additional context. This makes them easy to search and filter.

### Docker logs

View live logs from the app container:

```bash
docker compose --env-file .env -f docker/docker-compose.yml logs -f app
```

You should see lines like:

```json
{"level":"info","time":"2026-02-16T12:00:00.000Z","msg":"Server listening","url":"http://0.0.0.0:3000"}
{"level":"info","time":"2026-02-16T12:01:23.456Z","msg":"User logged in","userId":"abc123"}
```

Press `Ctrl+C` to stop watching.

To see only the last 50 lines:

```bash
docker compose --env-file .env -f docker/docker-compose.yml logs --tail 50 app
```

To save logs to a file (useful when asking for help):

```bash
docker compose --env-file .env -f docker/docker-compose.yml logs app > vamsa-logs.txt 2>&1
```

### Bare metal logs

When running without Docker, logs go to stdout (your terminal) in JSON format. If you run Vamsa with a process manager like systemd, check its journal:

```bash
journalctl -u vamsa --since "1 hour ago"
```

### Log levels

Vamsa uses four log levels, from most to least verbose:

| Level | What it shows | When to use |
|-------|---------------|-------------|
| `debug` | Everything, including internal details | Troubleshooting a specific problem |
| `info` | Normal operations (startup, logins, requests) | Day-to-day monitoring (default) |
| `warn` | Things that might be a problem | Worth investigating when you see them |
| `error` | Things that went wrong | Always investigate these |

Each level includes all levels above it. Setting `debug` shows everything. Setting `error` shows only errors.

### Changing the log level

Set the `LOG_LEVEL` variable in your `.env` file:

```ini
LOG_LEVEL=info
```

Then restart Vamsa:

```bash
# Docker
docker compose --env-file .env -f docker/docker-compose.yml restart app

# Bare metal
# Restart your Vamsa process
```

!!! tip "Use debug temporarily"
    If something is not working, set `LOG_LEVEL=debug` to get detailed output. Switch it back to `info` once you have found the problem -- debug mode produces a lot of output and can fill up disk space over time.

---

## Request tracing with X-Request-ID

Every request that Vamsa processes gets a unique identifier. This identifier appears in the logs, making it easy to trace a single request through the system.

If you include an `X-Request-ID` header in your request, Vamsa will use that value. Otherwise, it generates one automatically.

```bash
curl -H "X-Request-ID: my-test-123" http://localhost/health
```

In the logs, you will see the request ID attached to related entries:

```json
{"level":"info","time":"...","msg":"Request completed","requestId":"my-test-123","status":200}
```

!!! info "When is this useful?"
    Request IDs are helpful when you are trying to find what happened during a specific page load or API call. If a user reports an error, you can search the logs for their request ID to find exactly what went wrong.

---

## Setting up Grafana dashboards (optional)

Vamsa includes an optional observability stack with Grafana (dashboards) and Prometheus (metrics collection). This gives you graphs and charts showing request rates, response times, memory usage, and more.

!!! info "Do I need this?"
    For most home users with a small family, the answer is no. The `/health` endpoint and container logs are enough. Consider setting up Grafana if you are running Vamsa for a larger family (50+ users), want historical performance data, or just enjoy having dashboards.

### Step 1 -- Set a Grafana password

Add this to your `.env` file:

```ini
GRAFANA_PASSWORD=choose_a_strong_password
```

### Step 2 -- Start the observability stack

```bash
bun run observability
```

You should see:

```
[+] Running 3/3
 ✔ Container vamsa-prometheus   Started
 ✔ Container vamsa-grafana      Started
```

### Step 3 -- Access Grafana

Open your browser and go to **http://localhost:3001**.

Log in with:

- **Username**: `admin`
- **Password**: The value you set for `GRAFANA_PASSWORD` in your `.env` file

### Step 4 -- Explore the dashboards

Vamsa ships with pre-configured dashboards. You should see panels showing:

- Request rate (requests per second)
- Response time distribution
- Error rate
- Memory and CPU usage
- Database connection pool status

### Stopping the observability stack

```bash
bun run observability:down
```

This stops Grafana and Prometheus but does not affect your Vamsa application.

---

## OpenTelemetry (optional)

!!! info "What is OpenTelemetry?"
    OpenTelemetry (often called "OTel") is a standard for collecting detailed information about what happens inside your application. Think of it as a way to see exactly what happens during each request -- which database queries ran, how long each step took, and where time was spent. This is called "distributed tracing."

Vamsa can send trace data to any OpenTelemetry-compatible backend (like Grafana Tempo, Jaeger, or Honeycomb).

### Enabling OpenTelemetry

Add these to your `.env` file:

```ini
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=vamsa-web
```

Then restart Vamsa.

!!! tip "The built-in Grafana stack includes trace collection"
    If you started the observability stack with `bun run observability`, trace collection is already configured. You do not need to set up a separate backend.

---

## When should I care about monitoring?

Here is a simple guide:

| Your situation | What to do |
|----------------|------------|
| Small family, few users | Check `/health` occasionally, read logs if something breaks |
| Medium family, 10-30 users | Set up an uptime monitor pointing at `/health` |
| Large family, 50+ users | Set up Grafana dashboards and uptime monitoring |
| Running for an organization | Full observability: Grafana + OpenTelemetry + alerting |

For most home users, Vamsa is a "set it and forget it" application. Check in on it once a month, keep backups running, and update when new versions come out.

---

## Next steps

- **[Security](security.md)** -- Protect your Vamsa instance with HTTPS and rate limiting
- **[Troubleshooting](troubleshooting.md)** -- Solutions for common problems
- **[Updating Vamsa](updating.md)** -- Keep your instance current
