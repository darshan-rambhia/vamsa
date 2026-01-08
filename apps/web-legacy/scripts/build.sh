#!/bin/bash
set -eo pipefail

SERVICE_NAME=vamsa
VARIANT=${1:-postgres}

case $VARIANT in
  postgres|pg)
    DOCKERFILE=docker/Dockerfile
    TAG="$SERVICE_NAME:latest"
    ;;
  sqlite)
    DOCKERFILE=docker/Dockerfile.sqlite
    TAG="$SERVICE_NAME:sqlite"
    ;;
  *)
    echo "Usage: $0 [postgres|sqlite]"
    exit 1
    ;;
esac

echo "Building $TAG..."

docker build -t "$TAG" \
  --pull \
  -f "$DOCKERFILE" \
  --build-arg NODE_TLS_REJECT_UNAUTHORIZED=0 \
  .

echo "Built $TAG"
