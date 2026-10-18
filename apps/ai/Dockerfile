# syntax=docker/dockerfile:1
# Vamsa AI sidecar (Hono + ai-sdk). Build from the repo root:
#   docker build -f apps/ai/Dockerfile -t vamsa-ai .
#
# Mirrors docker/Dockerfile: pnpm installs against the committed pnpm-lock.yaml
# and `pnpm deploy` produces a self-contained prod tree for the runtime stage.

# =============================================================================
# Stage 1: Install and deploy
# =============================================================================
FROM oven/bun:1-alpine AS builder

RUN apk add --no-cache nodejs npm && npm install -g pnpm@12.4.1

WORKDIR /app

# Workspace manifests first, for layer caching
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

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

# Production-only tree for @vamsa/ai (workspace deps materialized as real files)
RUN pnpm --filter=@vamsa/ai deploy --prod --legacy --ignore-scripts /prod

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM oven/bun:1-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 --ingroup bunuser vamsa

COPY --from=builder --chown=vamsa:bunuser /prod /app

USER vamsa
EXPOSE 3100

ENV NODE_ENV=production
ENV AI_PORT=3100
ENV AI_HOST=0.0.0.0

CMD ["bun", "run", "src/index.ts"]
