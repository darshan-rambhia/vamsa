# Vamsa AI Service Dockerfile
# Uses Bun runtime for TypeScript execution

FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock* ./
COPY apps/ai/package.json apps/ai/
COPY packages/lib/package.json packages/lib/
COPY packages/schemas/package.json packages/schemas/
COPY packages/api/package.json packages/api/
RUN bun install --frozen-lockfile --production

# Copy source
FROM base AS release
COPY --from=install /app/node_modules node_modules
COPY --from=install /app/apps/ai/node_modules apps/ai/node_modules
COPY apps/ai/ apps/ai/
COPY packages/lib/ packages/lib/
COPY packages/schemas/ packages/schemas/
COPY packages/api/ packages/api/

WORKDIR /app/apps/ai
EXPOSE 3100

ENV NODE_ENV=production
ENV AI_PORT=3100
ENV AI_HOST=0.0.0.0

CMD ["bun", "run", "src/index.ts"]
