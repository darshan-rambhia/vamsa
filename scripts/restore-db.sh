#!/bin/bash
#
# Database Restore Script for Vamsa
#
# Restores a PostgreSQL backup created by backup-db.sh.
#
# Usage:
#   ./scripts/restore-db.sh <backup_file.sql.gz> [--dry-run]
#
# Environment:
#   DATABASE_URL  - PostgreSQL connection string (required)
#
# WARNING: This will DROP and recreate the database!

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "DATABASE_URL environment variable is required"
        exit 1
    fi

    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed"
        exit 1
    fi
}

# Extract database name from DATABASE_URL
get_db_name() {
    echo "$DATABASE_URL" | sed -E 's/.*\/([^?]+).*/\1/'
}

# Confirm restore
confirm_restore() {
    local backup_file="$1"
    local db_name=$(get_db_name)

    log_warn "This will restore $backup_file to database: $db_name"
    log_warn "All existing data will be LOST!"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

    if [[ "$confirm" != "yes" ]]; then
        log_info "Restore cancelled"
        exit 0
    fi
}

# Restore backup
restore_backup() {
    local backup_file="$1"
    local dry_run="${2:-false}"

    # Verify backup file exists
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi

    # Verify backup integrity
    log_info "Verifying backup integrity..."
    if ! gzip -t "$backup_file" 2>/dev/null; then
        log_error "Backup file is corrupted"
        exit 1
    fi

    if $dry_run; then
        log_info "[DRY RUN] Would restore: $backup_file"
        log_info "[DRY RUN] Backup size: $(du -h "$backup_file" | cut -f1)"
        log_info "[DRY RUN] No changes made"
        return 0
    fi

    log_info "Restoring database from $backup_file..."

    # Decompress and restore
    zcat "$backup_file" | psql "$DATABASE_URL" --quiet

    log_info "Restore complete!"
}

# List available backups
list_backups() {
    local backup_dir="${BACKUP_DIR:-./backups}"

    log_info "Available backups:"
    echo ""

    if [[ -d "$backup_dir" ]]; then
        find "$backup_dir" -name "*.sql.gz" -type f -print0 | \
            xargs -0 ls -lht 2>/dev/null | \
            head -20 || echo "  No backups found"
    else
        echo "  Backup directory not found: $backup_dir"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 <backup_file.sql.gz> [--dry-run]"
    echo ""
    echo "Options:"
    echo "  --dry-run    Show what would be done without making changes"
    echo "  --list       List available backups"
    echo "  --help       Show this help message"
    echo ""
    echo "Environment:"
    echo "  DATABASE_URL  PostgreSQL connection string (required)"
    echo "  BACKUP_DIR    Directory containing backups (default: ./backups)"
}

# Main
main() {
    local backup_file=""
    local dry_run=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dry-run)
                dry_run=true
                shift
                ;;
            --list)
                list_backups
                exit 0
                ;;
            --help)
                usage
                exit 0
                ;;
            -*)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                backup_file="$1"
                shift
                ;;
        esac
    done

    if [[ -z "$backup_file" ]]; then
        log_error "Backup file is required"
        usage
        exit 1
    fi

    check_prerequisites

    if ! $dry_run; then
        confirm_restore "$backup_file"
    fi

    restore_backup "$backup_file" $dry_run
}

main "$@"
