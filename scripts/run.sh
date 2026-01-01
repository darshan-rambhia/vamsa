#!/bin/bash
set -eo pipefail

SERVICE_NAME=vamsa
VARIANT=${1:-postgres}

case $VARIANT in
  postgres|pg)
    TAG="$SERVICE_NAME:latest"
    ;;
  sqlite)
    TAG="$SERVICE_NAME:sqlite"
    ;;
  *)
    echo "Usage: $0 [postgres|sqlite]"
    exit 1
    ;;
esac

echo "Running $TAG..."

docker run \
  --rm \
  --publish 3000:3000 \
  --env PORT=3000 \
  --env NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-dev-secret-change-in-prod}" \
  --env NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}" \
  --env DATABASE_URL="${DATABASE_URL}" \
  --name "$SERVICE_NAME" \
  "$TAG"
