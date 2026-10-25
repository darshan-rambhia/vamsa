#!/usr/bin/env bash
# Smoke-test the web app from a prod-only install, mirroring docker/Dockerfile:
# `pnpm deploy --prod` drops devDependencies, so a runtime import that is only
# a devDependency (e.g. fflate) crashes here instead of in production.
# Expects `pnpm build` to have run already.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROD="$(mktemp -d)"
PORT="${SMOKE_PORT:-3123}"
LOG="$PROD/server.log"

cd "$ROOT"
pnpm --filter=@vamsa/web deploy --prod --legacy --ignore-scripts "$PROD/app" >/dev/null
# Same layout as the image: migrations copied in explicitly
mkdir -p "$PROD/app/migrations" "$PROD/data"
cp -r packages/api/drizzle "$PROD/app/migrations/postgres"
cp -r packages/api/drizzle-sqlite "$PROD/app/migrations/sqlite"
[ -d "$PROD/app/dist/server" ] || { echo "dist missing from deploy"; exit 1; }

cd "$PROD/app"
NODE_ENV=production PORT="$PORT" HOST=127.0.0.1 \
  DATABASE_URL="$PROD/data/vamsa.db" MIGRATIONS_DIR="$PROD/app/migrations" \
  MEDIA_STORAGE_PATH="$PROD/data/media" BACKUP_DIR="$PROD/data/backups" \
  OTEL_ENABLED=false BETTER_AUTH_SECRET=ci-smoke-secret-0123456789abcdef0123456789 \
  BETTER_AUTH_URL="http://127.0.0.1:$PORT" APP_URL="http://127.0.0.1:$PORT" \
  bun run server/index.ts >"$LOG" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT

fail() { echo "FAIL: $1"; echo "--- server log ---"; cat "$LOG"; exit 1; }

for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$PORT/health" >/dev/null && break
  kill -0 $PID 2>/dev/null || fail "server exited"
  sleep 1
done
curl -sf "http://127.0.0.1:$PORT/health" >/dev/null || fail "/health not ok"
code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/login")
[ "$code" = 200 ] || fail "/login returned $code"

# Import every server chunk so lazily-loaded deps are resolved too
bun -e '
const { readdirSync } = require("fs"); const { join } = require("path");
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(join(d, e.name)) : /\.m?js$/.test(e.name) ? [join(d, e.name)] : []);
let bad = 0;
for (const f of walk(join(process.cwd(), "dist/server"))) {
  try { await import(f); } catch (e) {
    if (/Cannot find (package|module)/.test(String(e))) { console.error(f, String(e)); bad++; }
  }
}
process.exit(bad ? 1 : 0);
' || fail "server chunk has unresolved import"

grep -q "Cannot find package\|Cannot find module" "$LOG" && fail "missing package in log"
echo "prod-install smoke OK"
