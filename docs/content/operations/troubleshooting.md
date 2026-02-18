# Troubleshooting

This page covers common problems and how to fix them. Start with the symptom that matches your situation.

---

## "I can't access the app"

The most common reasons Vamsa is unreachable are: containers not running, port conflicts, or firewall rules.

### Check if containers are running

```bash
docker ps
```

You should see:

```
CONTAINER ID   IMAGE              STATUS                   PORTS                NAMES
a1b2c3d4e5f6   vamsa-app          Up 2 minutes (healthy)   0.0.0.0:80->3000     vamsa-app
f6e5d4c3b2a1   postgres:18-alpine Up 3 minutes (healthy)   5432/tcp             vamsa-db
```

If you do not see both containers, or their status is not "healthy," start them:

```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d
```

### Check for port conflicts

Another service might already be using port 80:

```bash
lsof -i :80
```

You should see either nothing (port is free) or Vamsa's process. If another service appears, either stop that service or change Vamsa's port in `.env`:

```ini
APP_PORT=8080
```

Then restart Vamsa and access it at `http://localhost:8080`.

### Check the firewall

If you are accessing Vamsa from another device on your network, make sure the port is open:

```bash
# Linux (ufw)
sudo ufw allow 80/tcp

# Linux (firewalld)
sudo firewall-cmd --add-port=80/tcp --permanent
sudo firewall-cmd --reload
```

### Check the application logs

```bash
docker compose --env-file .env -f docker/docker-compose.yml logs app
```

Look for error messages near the bottom. Common issues include missing environment variables or database connection failures.

---

## "Login isn't working"

### Check BETTER_AUTH_URL

This variable must match the URL you use to access Vamsa in your browser. If you access it at `https://family.example.com`, your `.env` must have:

```ini
BETTER_AUTH_URL="https://family.example.com"
```

A mismatch (for example, `http://` instead of `https://`, or `localhost` instead of your domain) will cause login to fail silently.

### Check HTTPS and cookies

In production, authentication cookies require HTTPS. If you are using plain HTTP, login will appear to work but cookies will not be saved, and you will be redirected back to the login page.

Solution: Set up HTTPS. See [Security > HTTPS setup](security.md#https-setup).

!!! warning "Local network exception"
    If you are only accessing Vamsa on your local network via `http://192.168.x.x`, you may need to set:

    ```ini
    BETTER_AUTH_URL="http://192.168.1.42"
    ```

    Make sure this matches exactly what you type in the browser address bar.

### Check OAuth configuration

If you are using Google, Microsoft, GitHub, or OIDC login:

1. Verify the client ID and client secret in your `.env` match what is in the provider's dashboard
2. Verify the redirect URI in the provider's dashboard matches your Vamsa URL:
    - Google: `https://family.example.com/api/auth/callback/google`
    - GitHub: `https://family.example.com/api/auth/callback/github`
    - Microsoft: `https://family.example.com/api/auth/callback/microsoft`
3. Check logs for specific OAuth errors:

```bash
docker compose --env-file .env -f docker/docker-compose.yml logs app | grep -i "auth\|oauth"
```

---

## "Photos aren't loading"

### Check storage permissions

Vamsa stores uploaded photos in a Docker volume. Verify the volume exists:

```bash
docker volume ls | grep uploads
```

You should see:

```
local     vamsa-uploads-data
```

### Check file size limits

If large photos fail to upload, check your reverse proxy's file size limit. For nginx:

```nginx
client_max_body_size 50M;
```

### Check browser console

Open your browser's developer tools (usually F12) and look at the Console and Network tabs for errors. Red entries related to `/media/` indicate the issue.

---

## "The app is slow"

### Check database connection

```bash
docker compose --env-file .env -f docker/docker-compose.yml exec db pg_isready -U vamsa
```

You should see:

```
/var/run/postgresql:5432 - accepting connections
```

If the database is not accepting connections, check its logs:

```bash
docker compose --env-file .env -f docker/docker-compose.yml logs db
```

### Check memory usage

```bash
docker stats --no-stream
```

You should see:

```
CONTAINER ID   NAME         CPU %   MEM USAGE / LIMIT     MEM %
a1b2c3d4e5f6   vamsa-app    1.2%    256MiB / 4GiB         6.25%
f6e5d4c3b2a1   vamsa-db     0.5%    128MiB / 4GiB         3.13%
```

If memory usage is above 80%, your server may need more RAM.

### Performance tips

| Problem | Solution |
|---------|----------|
| Slow page loads | Make sure you are using an SSD, not an SD card |
| Slow search | Large family trees (5,000+ people) benefit from more RAM |
| Slow photo loading | Check network speed between your device and server |
| Everything is slow | Check `docker stats` -- if CPU is consistently high, consider a more powerful machine |

---

## "Email invitations aren't sending"

### Check the Resend API key

```bash
# Verify RESEND_API_KEY is set in your .env
grep RESEND_API_KEY .env
```

You should see:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
```

If it is empty, sign up at [Resend](https://resend.com) and get an API key.

### Check the sender domain

The domain in `EMAIL_FROM` must be verified in your Resend dashboard:

```ini
EMAIL_FROM="noreply@vamsa.family"
```

If you have not verified the domain, Resend will reject the emails.

### Check logs for email errors

```bash
docker compose --env-file .env -f docker/docker-compose.yml logs app | grep -i "email\|resend"
```

Common errors:

| Error | Solution |
|-------|----------|
| `Invalid API key` | Double-check your `RESEND_API_KEY` |
| `Domain not verified` | Verify the domain in the Resend dashboard |
| `Rate limit exceeded` | You are sending too many emails -- wait and try again |

---

## "Docker container won't start"

### Check required environment variables

Vamsa will refuse to start if critical variables are missing:

```bash
docker compose --env-file .env -f docker/docker-compose.yml logs app
```

Look for messages like:

```
DB_PASSWORD is required - see .env.example
BETTER_AUTH_SECRET is required
```

Make sure your `.env` file has all required values. Compare it against `.env.example`:

```bash
diff <(grep -oP '^[A-Z_]+=' .env.example | sort) <(grep -oP '^[A-Z_]+=' .env | sort)
```

### Check port conflicts

```bash
lsof -i :80
```

If another service is using port 80, either stop it or change `APP_PORT` in your `.env`.

### Check disk space

```bash
df -h
```

You should see your main disk with available space. If usage is above 90%, free up space or add a larger disk.

Docker images and volumes can consume significant space. Clean up unused resources:

```bash
docker system prune
```

!!! warning "Be careful with prune"
    `docker system prune` removes unused containers, networks, and images. It does NOT remove named volumes (where your data lives), so your Vamsa data is safe. But if you have other Docker projects, their unused resources may be removed too.

### View full container logs

```bash
docker compose --env-file .env -f docker/docker-compose.yml logs
```

This shows logs from all containers. Look for the first error message -- it usually explains the root cause.

---

## "Database migration failed"

### Preview the migration

```bash
bun run db:migrate:dry-run
```

This shows what the migration would do without actually applying it.

### Restore from backup

If a migration left your database in a bad state, restore from your pre-update backup. See [Database Migrations > What if a migration fails?](database-migrations.md#what-if-a-migration-fails) for step-by-step instructions.

### Report the issue

Migration failures are usually bugs. Please report them on GitHub with the full error message. See the "Getting help" section below.

---

## "The app started but pages show errors"

### Check the health endpoint

```bash
curl http://localhost/health
```

If this returns `{"status":"healthy"}`, the server is running but something else is wrong. Check browser developer tools (F12) for JavaScript errors.

### Clear your browser cache

Sometimes an update changes the client-side code, but your browser caches the old version. Hard-refresh with:

- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

Or clear the browser cache entirely.

### Rebuild the app

If pages show errors after an update, try a full rebuild:

```bash
# Docker
docker compose --env-file .env -f docker/docker-compose.yml build --no-cache
docker compose --env-file .env -f docker/docker-compose.yml up -d

# Bare metal
bun run build
# Restart Vamsa
```

---

## Getting help

If you cannot solve the problem yourself, here is how to get help:

### 1. Collect your information

Before reaching out, gather:

- **Vamsa version**: `git rev-parse --short HEAD`
- **Operating system**: `uname -a`
- **Docker version** (if applicable): `docker --version`
- **Error logs**: See below

### 2. Save your logs

```bash
# Docker logs (last 200 lines)
docker compose --env-file .env -f docker/docker-compose.yml logs --tail 200 > vamsa-logs.txt 2>&1

# Include database logs too
docker compose --env-file .env -f docker/docker-compose.yml logs --tail 200 db >> vamsa-logs.txt 2>&1
```

!!! warning "Review logs before sharing"
    Logs may contain email addresses or other personal information. Review `vamsa-logs.txt` and redact anything sensitive before posting publicly.

### 3. Open a GitHub issue

Go to [GitHub Issues](https://github.com/darshan-rambhia/vamsa/issues) and create a new issue with:

1. A clear title describing the problem
2. Steps to reproduce the issue
3. What you expected to happen
4. What actually happened
5. Your Vamsa version, OS, and Docker version
6. Relevant log excerpts

---

## Next steps

- **[Monitoring](monitoring.md)** -- Set up health checks to catch problems early
- **[Security](security.md)** -- Make sure your instance is properly secured
- **[Updating Vamsa](updating.md)** -- Updates often fix known issues
