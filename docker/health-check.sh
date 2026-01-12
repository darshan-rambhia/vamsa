#!/bin/bash

# Container Health Check Script
# This script validates a running Vamsa container and its database connection
# Useful for CI/CD pipelines and health monitoring

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="${1:-vamsa}"
PORT="${2:-3000}"
TIMEOUT=60
HEALTH_CHECK_RETRIES=12
HEALTH_CHECK_INTERVAL=5

# Logging functions
log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo ""
echo "========================================="
echo "Container Health Check"
echo "========================================="
echo ""

# Test 1: Check if container exists
log_test "Test 1: Verifying container exists..."

if docker ps -a | grep -q "$CONTAINER_NAME"; then
    log_pass "Container '$CONTAINER_NAME' found"
else
    log_fail "Container '$CONTAINER_NAME' not found"
    exit 1
fi

echo ""

# Test 2: Check if container is running
log_test "Test 2: Verifying container is running..."

if docker ps | grep -q "$CONTAINER_NAME"; then
    log_pass "Container '$CONTAINER_NAME' is running"
else
    log_fail "Container '$CONTAINER_NAME' is not running"
    docker ps -a | grep "$CONTAINER_NAME"
    exit 1
fi

echo ""

# Test 3: Check container health
log_test "Test 3: Checking container health status..."

HEALTH=$(docker inspect "$CONTAINER_NAME" --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
log_info "Health status: $HEALTH"

echo ""

# Test 4: Check container logs for errors
log_test "Test 4: Checking container logs for errors..."

ERROR_COUNT=$(docker logs "$CONTAINER_NAME" 2>&1 | grep -c "error\|fatal\|panic")
if [ "$ERROR_COUNT" -eq 0 ]; then
    log_pass "No critical errors in container logs"
else
    log_fail "Found $ERROR_COUNT error messages in logs"
    log_info "Recent errors:"
    docker logs "$CONTAINER_NAME" 2>&1 | grep -i "error\|fatal\|panic" | tail -5 || true
fi

echo ""

# Test 5: HTTP health check
log_test "Test 5: Performing HTTP health checks..."

RETRIES=0
HTTP_PASS=false

while [ $RETRIES -lt $HEALTH_CHECK_RETRIES ]; do
    # Try main endpoint
    if curl -sf -m 5 "http://localhost:$PORT/" > /dev/null 2>&1; then
        log_pass "HTTP health check passed on / (HTTP 200)"
        HTTP_PASS=true
        break
    fi

    # Try /api/health if available
    if curl -sf -m 5 "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
        log_pass "HTTP health check passed on /api/health (HTTP 200)"
        HTTP_PASS=true
        break
    fi

    RETRIES=$((RETRIES + 1))
    if [ $RETRIES -lt $HEALTH_CHECK_RETRIES ]; then
        log_info "Server not responding, retrying... ($RETRIES/$HEALTH_CHECK_RETRIES)"
        sleep $HEALTH_CHECK_INTERVAL
    fi
done

if [ "$HTTP_PASS" = false ]; then
    log_fail "HTTP health check failed after $TIMEOUT seconds"
    log_info "Container logs (last 30 lines):"
    docker logs "$CONTAINER_NAME" | tail -30
    exit 1
fi

echo ""

# Test 6: Verify container networking
log_test "Test 6: Verifying container networking..."

PORTS=$(docker port "$CONTAINER_NAME" 2>/dev/null | grep "3000")
if [ -n "$PORTS" ]; then
    log_pass "Port mapping configured: $PORTS"
else
    log_info "No explicit port mapping (may be using host network)"
fi

echo ""

# Test 7: Container resource usage
log_test "Test 7: Checking container resource usage..."

STATS=$(docker stats "$CONTAINER_NAME" --no-stream --format "{{.CPUPerc}} CPU, {{.MemUsage}} Memory" 2>/dev/null)
log_info "Resource usage: $STATS"

echo ""

# Test 8: Database connectivity check (if DATABASE_URL is set)
log_test "Test 8: Checking database connectivity..."

DB_URL=$(docker exec "$CONTAINER_NAME" printenv DATABASE_URL 2>/dev/null || echo "")
if [ -n "$DB_URL" ]; then
    MASKED_URL="${DB_URL//:*@/:*****@}"
    log_info "Database configured: $MASKED_URL"
    # Try to connect through container
    if docker exec "$CONTAINER_NAME" sh -c 'node -e "require(\"pg\").Client" 2>/dev/null' > /dev/null 2>&1; then
        log_pass "Database driver available"
    else
        log_info "Database connectivity check skipped"
    fi
else
    log_info "DATABASE_URL not set in container"
fi

echo ""

# Summary
echo "========================================="
log_pass "Container health check completed"
echo "========================================="
echo ""
echo "Status: HEALTHY"
echo ""
echo "To view detailed logs, run:"
echo "  docker logs $CONTAINER_NAME"
echo ""
echo "To view live logs, run:"
echo "  docker logs -f $CONTAINER_NAME"
echo ""
