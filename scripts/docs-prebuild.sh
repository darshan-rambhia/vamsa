#!/bin/bash
# Pre-build script for MkDocs
# Copies source documentation into docs/content/ for MkDocs to build
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTENT="$REPO_ROOT/docs/content"

echo "Copying source docs into MkDocs content directory..."

# ADRs live directly in docs/content/architecture/decisions/ (no copy step).

# Copy architecture guides
cp "$REPO_ROOT/docs/guides/architecture.md" "$CONTENT/architecture/overview.md" 2>/dev/null || true
cp "$REPO_ROOT/docs/guides/api.md" "$CONTENT/architecture/api.md" 2>/dev/null || true
cp "$REPO_ROOT/docs/guides/authentication.md" "$CONTENT/architecture/authentication.md" 2>/dev/null || true

# Copy backup guide
cp "$REPO_ROOT/docs/guides/backup-restore.md" "$CONTENT/guides/backup-restore.md" 2>/dev/null || true

echo "Done. Content directory ready for MkDocs build."
