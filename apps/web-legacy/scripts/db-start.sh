#!/bin/bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if postgres container is already running
if docker compose -f "$PROJECT_ROOT/docker/docker-compose.dev.yml" ps --status running 2>/dev/null | grep -q "db"; then
  echo "PostgreSQL is already running"
  exit 0
fi

echo "Starting PostgreSQL..."
docker compose -f "$PROJECT_ROOT/docker/docker-compose.dev.yml" up -d --wait

echo "PostgreSQL is ready on localhost:5432"
