# syntax=docker/dockerfile:1
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
# Use BUILDPLATFORM to run builder natively (avoids slow QEMU emulation)
FROM --platform=$BUILDPLATFORM oven/bun:1-alpine AS builder

# Build arg to skip SSL verification (for corporate proxies)
ARG SKIP_SSL_VERIFY
ENV NODE_TLS_REJECT_UNAUTHORIZED=${SKIP_SSL_VERIFY:+0}

WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lock bunfig.toml ./
COPY apps/ai/package.json ./apps/ai/
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/client/package.json ./packages/client/
COPY packages/lib/package.json ./packages/lib/
COPY packages/query-hooks/package.json ./packages/query-hooks/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies
# --frozen-lockfile: faster, skips dependency resolution
# --ignore-scripts: skips prepare/postinstall (husky not needed in Docker)
RUN bun install --frozen-lockfile --ignore-scripts

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
# Use BUILDPLATFORM for native speed during dependency installation
FROM --platform=$BUILDPLATFORM oven/bun:1-alpine AS prod-deps

# Build arg to skip SSL verification (for corporate proxies)
ARG SKIP_SSL_VERIFY
ENV NODE_TLS_REJECT_UNAUTHORIZED=${SKIP_SSL_VERIFY:+0}

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY apps/ai/package.json ./apps/ai/
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/client/package.json ./packages/client/
COPY packages/lib/package.json ./packages/lib/
COPY packages/query-hooks/package.json ./packages/query-hooks/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/ui/package.json ./packages/ui/

# Production dependencies only (excludes devDependencies)
# --frozen-lockfile: faster, skips dependency resolution
# --ignore-scripts: skips lifecycle scripts like prepare (husky)
RUN bun install --production --frozen-lockfile --ignore-scripts

# =============================================================================
# Stage 3: Production runtime
# =============================================================================
# TARGETPLATFORM is implicit default, no need to specify
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
