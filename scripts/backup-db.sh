#!/bin/bash
#
# Database Backup Script for Vamsa
#
# Creates a compressed PostgreSQL backup and manages retention.
#
# Usage:
#   ./scripts/backup-db.sh [--full|--data-only] [--verify]
#
# Environment:
#   DATABASE_URL  - PostgreSQL connection string (required)
#   BACKUP_DIR    - Directory to store backups (default: ./backups)
#
# Retention:
#   - Daily backups: 30 days
#   - Weekly backups: 12 weeks (Sundays)
#   - Monthly backups: 12 months (1st of month)

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)

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

    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump is not installed"
        exit 1
    fi

    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/daily"
    mkdir -p "$BACKUP_DIR/weekly"
    mkdir -p "$BACKUP_DIR/monthly"
}

# Create backup
create_backup() {
    local backup_type="${1:-full}"
    local backup_file
    local dump_args=""

    # Determine backup file name and location
    if [[ "$DAY_OF_MONTH" == "01" ]]; then
        backup_file="$BACKUP_DIR/monthly/backup_${TIMESTAMP}.sql.gz"
        log_info "Creating monthly backup..."
    elif [[ "$DAY_OF_WEEK" == "7" ]]; then
        backup_file="$BACKUP_DIR/weekly/backup_${TIMESTAMP}.sql.gz"
        log_info "Creating weekly backup..."
    else
        backup_file="$BACKUP_DIR/daily/backup_${TIMESTAMP}.sql.gz"
        log_info "Creating daily backup..."
    fi

    # Set pg_dump options
    if [[ "$backup_type" == "data-only" ]]; then
        dump_args="--data-only"
    fi

    # Create backup
    log_info "Backing up database to $backup_file..."
    pg_dump $dump_args "$DATABASE_URL" | gzip > "$backup_file"

    # Get backup size
    local size=$(du -h "$backup_file" | cut -f1)
    log_info "Backup complete: $size"

    echo "$backup_file"
}

# Verify backup
verify_backup() {
    local backup_file="$1"

    log_info "Verifying backup integrity..."

    # Check if file exists and is not empty
    if [[ ! -s "$backup_file" ]]; then
        log_error "Backup file is empty or missing"
        return 1
    fi

    # Verify gzip integrity
    if ! gzip -t "$backup_file" 2>/dev/null; then
        log_error "Backup file is corrupted (gzip test failed)"
        return 1
    fi

    # Check if it contains SQL
    if ! zcat "$backup_file" | head -1 | grep -q "PostgreSQL\|pg_dump"; then
        log_warn "Backup may not be valid PostgreSQL dump"
    fi

    log_info "Backup verification passed"
    return 0
}

# Rotate old backups
rotate_backups() {
    log_info "Rotating old backups..."

    # Daily: keep last 30 days
    find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +30 -delete 2>/dev/null || true
    local daily_count=$(find "$BACKUP_DIR/daily" -name "*.sql.gz" | wc -l)
    log_info "  Daily backups: $daily_count"

    # Weekly: keep last 12 weeks
    find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +84 -delete 2>/dev/null || true
    local weekly_count=$(find "$BACKUP_DIR/weekly" -name "*.sql.gz" | wc -l)
    log_info "  Weekly backups: $weekly_count"

    # Monthly: keep last 12 months
    find "$BACKUP_DIR/monthly" -name "*.sql.gz" -mtime +365 -delete 2>/dev/null || true
    local monthly_count=$(find "$BACKUP_DIR/monthly" -name "*.sql.gz" | wc -l)
    log_info "  Monthly backups: $monthly_count"
}

# Show backup status
show_status() {
    log_info "Backup Status:"

    # Latest backup
    local latest=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -print0 | xargs -0 ls -t 2>/dev/null | head -1)
    if [[ -n "$latest" ]]; then
        local age=$(( ($(date +%s) - $(stat -f%m "$latest" 2>/dev/null || stat -c%Y "$latest" 2>/dev/null)) / 3600 ))
        log_info "  Latest backup: $latest (${age}h ago)"

        # Warn if backup is old
        if [[ $age -gt 24 ]]; then
            log_warn "  WARNING: Latest backup is more than 24 hours old!"
        fi
    else
        log_warn "  No backups found"
    fi

    # Total size
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    log_info "  Total backup size: $total_size"
}

# Main
main() {
    local backup_type="full"
    local do_verify=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --full)
                backup_type="full"
                shift
                ;;
            --data-only)
                backup_type="data-only"
                shift
                ;;
            --verify)
                do_verify=true
                shift
                ;;
            --status)
                check_prerequisites
                show_status
                exit 0
                ;;
            --help)
                echo "Usage: $0 [--full|--data-only] [--verify] [--status]"
                echo ""
                echo "Options:"
                echo "  --full       Full database backup (schema + data) [default]"
                echo "  --data-only  Data-only backup (no schema)"
                echo "  --verify     Verify backup integrity after creation"
                echo "  --status     Show backup status"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log_info "Starting database backup..."

    check_prerequisites

    local backup_file
    backup_file=$(create_backup "$backup_type")

    if $do_verify; then
        if ! verify_backup "$backup_file"; then
            log_error "Backup verification failed!"
            exit 1
        fi
    fi

    rotate_backups
    show_status

    log_info "Backup completed successfully!"
}

main "$@"
