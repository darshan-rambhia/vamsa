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

# pnpm is the package manager; bun (from the base image) stays as the runtime.
# The base oven/bun image has no Node.js, so add Node + pnpm for installs.
RUN apk add --no-cache nodejs npm && npm install -g pnpm@11.12.0

WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/ai/package.json ./apps/ai/
COPY apps/mobile/package.json ./apps/mobile/
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
# --node-linker=hoisted: flat node_modules so it copies cleanly across stages
RUN pnpm install --frozen-lockfile --ignore-scripts --node-linker=hoisted

# Copy source code
COPY . .

# Generate Drizzle client
WORKDIR /app/packages/api
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN pnpm db:generate

# Build the web app
WORKDIR /app/apps/web
RUN pnpm build

# Create a self-contained, production-only deployment of the web app.
# `pnpm deploy` copies workspace dependencies (@vamsa/*) in as real files rather
# than symlinks into the .pnpm store, so the result copies to the runtime image
# without dangling links and without devDependencies — much smaller than shipping
# the whole workspace. --legacy: required since pnpm 10 for non-injected
# workspaces; --ignore-scripts: db:generate already ran above, skip husky.
WORKDIR /app
RUN pnpm --filter=@vamsa/web deploy --prod --legacy --ignore-scripts /prod

# =============================================================================
# Stage 2: Production runtime
# =============================================================================
# TARGETPLATFORM is implicit default, no need to specify
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 --ingroup bunuser vamsa

# Copy the self-contained prod deployment (apps/web app files + prod node_modules
# with @vamsa/* workspace deps materialized). The app runs from source via bun.
COPY --from=builder --chown=vamsa:bunuser /prod /app

# Create uploads directory
RUN mkdir -p /app/data/uploads && chown -R vamsa:bunuser /app/data

USER vamsa
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["bun", "run", "server/index.ts"]
