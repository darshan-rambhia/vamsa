#!/bin/bash
set -eo pipefail

VARIANT=${1:-postgres}

case $VARIANT in
  postgres|pg)
    COMPOSE_FILE=docker/docker-compose.yml
    ;;
  sqlite)
    COMPOSE_FILE=docker/docker-compose.sqlite.yml
    ;;
  *)
    echo "Usage: $0 [postgres|sqlite]"
    exit 1
    ;;
esac

docker compose -f "$COMPOSE_FILE" down
