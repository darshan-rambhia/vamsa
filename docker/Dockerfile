# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy package.json files for all workspace packages
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/lib/package.json ./packages/lib/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client (with dummy DATABASE_URL since it's only needed for build)
WORKDIR /app/packages/api
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN pnpm run db:generate || true

# Build the web app
WORKDIR /app
ENV NODE_ENV=production
RUN pnpm --filter @vamsa/web build

# Production stage
FROM node:22-alpine AS runner

# Install pnpm for running the app
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs vamsa

# Copy built application
COPY --from=builder --chown=vamsa:nodejs /app/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=vamsa:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=vamsa:nodejs /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder --chown=vamsa:nodejs /app/packages ./packages

# Copy workspace configuration for runtime
COPY --from=builder --chown=vamsa:nodejs /app/package.json ./
COPY --from=builder --chown=vamsa:nodejs /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=vamsa:nodejs /app/apps/web/package.json ./apps/web/

# Create data directory for uploads
RUN mkdir -p /app/data/uploads && chown -R vamsa:nodejs /app/data

USER vamsa

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app/apps/web

CMD ["node", "dist/server/server.js"]
