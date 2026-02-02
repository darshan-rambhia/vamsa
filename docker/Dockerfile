# Multi-stage Dockerfile for Vamsa
#
# Build args:
#   SKIP_SSL_VERIFY=true  - Skip SSL verification (for corporate proxies like Zscaler)
#
# Example:
#   docker build --build-arg SKIP_SSL_VERIFY=true -f docker/Dockerfile -t vamsa .

# =============================================================================
# Stage 1: Build
# =============================================================================
FROM oven/bun:1-alpine AS builder

# Build arg to skip SSL verification (for corporate proxies)
ARG SKIP_SSL_VERIFY
ENV NODE_TLS_REJECT_UNAUTHORIZED=${SKIP_SSL_VERIFY:+0}

WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lock* bunfig.toml ./
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/lib/package.json ./packages/lib/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies
RUN bun install

# Copy source code
COPY . .

# Generate Drizzle client
WORKDIR /app/packages/api
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN bun run db:generate

# Build the web app
WORKDIR /app/apps/web
RUN bun run build

# =============================================================================
# Stage 2: Production dependencies
# =============================================================================
FROM oven/bun:1-alpine AS prod-deps

# Build arg to skip SSL verification (for corporate proxies)
ARG SKIP_SSL_VERIFY
ENV NODE_TLS_REJECT_UNAUTHORIZED=${SKIP_SSL_VERIFY:+0}

WORKDIR /app

COPY package.json bun.lock* bunfig.toml ./
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/lib/package.json ./packages/lib/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/ui/package.json ./packages/ui/

# Production dependencies only (excludes devDependencies)
RUN bun install --production

# =============================================================================
# Stage 3: Production runtime
# =============================================================================
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 --ingroup bunuser vamsa

# Copy production node_modules
COPY --from=prod-deps --chown=vamsa:bunuser /app/node_modules ./node_modules
COPY --from=builder --chown=vamsa:bunuser /app/apps/web/node_modules ./apps/web/node_modules

# Copy built application
COPY --from=builder --chown=vamsa:bunuser /app/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=vamsa:bunuser /app/apps/web/server ./apps/web/server
COPY --from=builder --chown=vamsa:bunuser /app/apps/web/src ./apps/web/src
COPY --from=builder --chown=vamsa:bunuser /app/packages ./packages

# Copy config files
COPY --from=builder --chown=vamsa:bunuser /app/package.json ./
COPY --from=builder --chown=vamsa:bunuser /app/apps/web/package.json ./apps/web/

# Create uploads directory
RUN mkdir -p /app/data/uploads && chown -R vamsa:bunuser /app/data

USER vamsa
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app/apps/web
CMD ["bun", "run", "server/index.ts"]
