#!/bin/bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Stopping PostgreSQL..."
docker compose -f "$PROJECT_ROOT/docker/docker-compose.dev.yml" down

echo "PostgreSQL stopped"
