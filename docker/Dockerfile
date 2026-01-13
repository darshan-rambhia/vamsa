# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install pnpm (still using pnpm for monorepo management)
RUN apk add --no-cache curl
RUN curl -fsSL https://get.pnpm.io/install.sh | ENV="$HOME/.shrc" SHELL="$(which sh)" sh -
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

# Copy all source code and configuration files
COPY . .

# Install dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile --prod=false

# Generate Prisma client (with dummy DATABASE_URL since it's only needed for build)
WORKDIR /app/packages/api
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN bunx prisma generate || true

# Build the web app
WORKDIR /app/apps/web
RUN pnpm run build
ENV NODE_ENV=production

# Production stage
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Install pnpm for production
RUN apk add --no-cache curl
RUN curl -fsSL https://get.pnpm.io/install.sh | ENV="$HOME/.shrc" SHELL="$(which sh)" sh -
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

# Create non-root user
RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 --ingroup bunuser vamsa

# Copy built application
COPY --from=builder --chown=vamsa:bunuser /app/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=vamsa:bunuser /app/apps/web/server ./apps/web/server
COPY --from=builder --chown=vamsa:bunuser /app/node_modules ./node_modules
COPY --from=builder --chown=vamsa:bunuser /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder --chown=vamsa:bunuser /app/packages ./packages

# Copy workspace configuration for runtime
COPY --from=builder --chown=vamsa:bunuser /app/package.json ./
COPY --from=builder --chown=vamsa:bunuser /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=vamsa:bunuser /app/apps/web/package.json ./apps/web/

# Create data directory for uploads
RUN mkdir -p /app/data/uploads && chown -R vamsa:bunuser /app/data

USER vamsa

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app/apps/web

CMD ["bun", "run", "server/index.ts"]
