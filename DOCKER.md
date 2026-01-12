# Docker Production Setup

Vamsa's production Docker setup uses **nginx as a reverse proxy** in front of the TanStack Start application, running on **Bun** with **Hono** middleware. This architecture provides optimal performance and prepares for the future React Native mobile client.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Internet / Mobile Clients / Web Browsers   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  nginx (Port 80)│  ← Static files, reverse proxy
         └────────┬────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
    ▼                           ▼
┌──────────┐              ┌───────────┐
│ Static   │              │    Bun    │
│ Files    │              │  + Hono   │
│ (assets) │              │ (Port 3000)│
└──────────┘              └─────┬─────┘
                                │
                                ▼
                          ┌─────────────┐
                          │  TanStack   │
                          │    Start    │
                          │ fetch handler│
                          └─────┬───────┘
                                │
                                ▼
                          ┌──────────┐
                          │PostgreSQL│
                          │(Port 5432)│
                          └──────────┘
```

## Why nginx?

### Current Benefits
- **Static file serving**: nginx serves assets directly (20-30x faster than Node.js)
- **Gzip compression**: Automatic compression of text assets
- **Caching headers**: Optimal cache control for immutable assets
- **Security headers**: X-Frame-Options, CSP, etc.
- **Connection pooling**: keepalive connections to backend

### Future Mobile Benefits
When you add the React Native client, nginx will:
- **API routing**: Route `/api/*` requests to backend
- **Load balancing**: Distribute mobile traffic across app instances
- **SSL termination**: Handle HTTPS for secure mobile connections
- **Rate limiting**: Protect mobile API endpoints from abuse

## Quick Start

### Development with Docker

```bash
# Start all services (postgres + app + nginx)
docker-compose up

# Access the app
open http://localhost
```

### Production Deployment

```bash
# Build and start in production mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DB_USER=vamsa
DB_PASSWORD=your_secure_password_here
DB_NAME=vamsa
DB_PORT=5432

# Application
SESSION_SECRET=your_session_secret_here
NODE_ENV=production

# nginx
NGINX_PORT=80
```

### nginx Configuration

The nginx configuration (`docker/nginx.conf`) handles:

1. **Static assets** (`/assets/*`):
   - Served directly from disk
   - 1-year cache (immutable, content-hashed filenames)
   - Gzip compressed

2. **API routes** (`/api/*`):
   - Proxied to TanStack Start backend
   - Ready for React Native mobile client
   - 60s timeout for long-running requests

3. **Server functions** (`/_server/*`):
   - TanStack Start server actions
   - Proxied to backend

4. **SSR/SPA routes** (everything else):
   - Try static file first (for index.html, etc.)
   - Fall back to TanStack Start for server-side rendering
   - No caching (dynamic content)

## Runtime Stack

### Bun + Hono

The application runs on **Bun** (your chosen runtime) with **Hono** as the HTTP framework:

- **Bun**: Fast JavaScript runtime (3-4x faster than Node.js)
  - Native TypeScript support (no compilation needed)
  - Built-in HTTP server (Bun.serve)
  - Fast startup times
  - Low memory footprint

- **Hono**: Ultrafast web framework
  - Minimal overhead (~0.5ms per request)
  - Middleware support (logging, CORS, auth)
  - Type-safe request/response handling
  - Perfect for wrapping TanStack Start's fetch handler

### File Structure

```
docker/
├── Dockerfile           # Multi-stage build with Bun runtime
├── Dockerfile.nginx     # nginx container with custom config
├── nginx.conf           # nginx reverse proxy configuration
└── health-check.sh      # Health check script

docker-compose.yml       # Orchestrates all services
apps/web/server/
└── index.ts             # Bun + Hono HTTP server entry point
```

## Services

### 1. PostgreSQL (`db`)
- Image: `postgres:16-alpine`
- Port: 5432 (configurable via `DB_PORT`)
- Volume: `vamsa-postgres-data`
- Health check: `pg_isready`

### 2. TanStack Start App (`app`)
- Runtime: **Bun** with **Hono** framework
- Build: Custom Dockerfile (multi-stage with Bun)
- Port: 3000 (internal, not exposed)
- Depends on: `db` (waits for health check)
- Volume: `vamsa-uploads-data` for file uploads
- Health check: `/health` endpoint
- Entry point: `bun run server/index.ts`

### 3. nginx (`nginx`)
- Build: Custom nginx Dockerfile
- Port: 80 (configurable via `NGINX_PORT`)
- Depends on: `app`
- Mounts: Read-only access to static files
- Health check: `/health` endpoint

## Building for Production

### 1. Build the Docker images

```bash
docker-compose build
```

### 2. Run database migrations

```bash
# Run migrations before starting the app
docker-compose run --rm app pnpm --filter @vamsa/api db:migrate:deploy
```

### 3. Start services

```bash
docker-compose up -d
```

### 4. Verify health

```bash
# Check all services are healthy
docker-compose ps

# Check nginx is serving correctly
curl -I http://localhost/health
```

## Hono Middleware Capabilities

The Hono framework wrapping your TanStack Start app gives you powerful middleware capabilities. Here are some examples:

### Adding Custom Middleware

Edit `apps/web/server/index.ts`:

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { timing } from 'hono/timing'

const app = new Hono()

// Request timing
app.use('*', timing())

// Custom authentication middleware
app.use('/api/*', async (c, next) => {
  const token = c.req.header('Authorization')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  // Verify token...
  await next()
})

// Rate limiting (using Hono rate limiter)
import { rateLimiter } from 'hono-rate-limiter'
app.use('/api/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
}))
```

### Available Hono Middleware

- `logger()` - Request logging
- `cors()` - CORS handling
- `timing()` - Server-Timing header
- `compress()` - Response compression
- `basicAuth()` - Basic authentication
- `bearerAuth()` - Bearer token auth
- `jwt()` - JWT verification
- Custom middleware - Build your own!

## Preparing for React Native

When you're ready to add the React Native mobile client:

### 1. API Routes

Create dedicated API routes for mobile:

```typescript
// apps/web/app/routes/api/mobile/user.ts
import { json } from '@tanstack/react-start'

export const GET = async () => {
  // Mobile-specific user endpoint
  return json({ user: ... })
}
```

nginx will automatically proxy these to the backend.

### 2. Authentication

Consider using JWT tokens for mobile authentication instead of cookies:

```typescript
// apps/web/app/routes/api/auth/login.ts
import { json } from '@tanstack/react-start'

export const POST = async ({ request }) => {
  // Return JWT token for mobile clients
  return json({ token: ... })
}
```

### 3. File Uploads

Mobile file uploads will work through the existing setup:

```typescript
// apps/web/app/routes/api/upload.ts
export const POST = async ({ request }) => {
  const formData = await request.formData()
  const file = formData.get('file')
  // Handle file upload
}
```

### 4. Load Balancing

When traffic increases, scale the app service:

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      replicas: 3
```

nginx will automatically load balance across instances.

## Performance Tuning

### Static File Caching

Static assets are cached for 1 year. When you update assets:
- Vite/TanStack Start automatically content-hashes filenames
- Old clients continue using cached versions
- New clients fetch new versions

### Database Connection Pooling

Adjust Prisma connection pool in `packages/api/src/index.ts`:

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add connection pooling
  pool: {
    min: 2,
    max: 10,
  },
})
```

### nginx Worker Processes

For high-traffic production, adjust nginx workers in `docker/Dockerfile.nginx`:

```dockerfile
# Automatically use number of CPU cores
RUN echo "worker_processes auto;" >> /etc/nginx/nginx.conf
```

## Monitoring

### Health Checks

All services have health checks:

```bash
# Check service health
docker-compose ps

# Watch health status
watch docker-compose ps
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 app
```

### nginx Access Logs

```bash
# Real-time access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# Error logs
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

## Troubleshooting

### nginx can't find static files

Make sure the app is built before starting:

```bash
pnpm build:web
docker-compose up --build
```

### Database connection errors

Check that the database is healthy:

```bash
docker-compose ps db
docker-compose logs db
```

### Port conflicts

Change ports in `.env`:

```env
NGINX_PORT=8080
DB_PORT=5433
```

## Security Recommendations

### Production Checklist

- [ ] Change default database password
- [ ] Set strong `SESSION_SECRET`
- [ ] Enable HTTPS (add SSL certificates to nginx)
- [ ] Set up firewall rules
- [ ] Configure rate limiting in nginx
- [ ] Enable nginx access logs for monitoring
- [ ] Set up automated backups for postgres volume
- [ ] Use secrets management (not `.env` files) in production

### SSL/HTTPS Setup

For production with HTTPS, update `docker/nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # ... rest of config
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    return 301 https://$host$request_uri;
}
```

## Maintenance

### Backup Database

```bash
# Create backup
docker-compose exec db pg_dump -U vamsa vamsa > backup.sql

# Restore backup
docker-compose exec -T db psql -U vamsa vamsa < backup.sql
```

### Update Dependencies

```bash
# Rebuild with latest dependencies
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Clean Up

```bash
# Remove stopped containers and unused volumes
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a
```
