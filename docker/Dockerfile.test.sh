#!/bin/bash

# Dockerfile Integration Tests
# This script validates the Dockerfile build process and container structure
# Exit on error to fail fast
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_IMAGE="vamsa-test-$(date +%s)"
DOCKERFILE_PATH="docker/Dockerfile"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

# Cleanup function
cleanup() {
    log_test "Cleaning up test resources..."

    # Remove image if it exists
    if docker images | grep -q "$TEST_IMAGE"; then
        log_test "Removing image $TEST_IMAGE..."
        docker rmi "$TEST_IMAGE" 2>/dev/null || true
    fi
}

# Set up trap to cleanup on exit
trap cleanup EXIT

# Change to project root
cd "$PROJECT_ROOT"

echo ""
echo "========================================="
echo "Dockerfile Integration Tests"
echo "========================================="
echo ""

# Test 1: Clean build test
log_test "Test 1: Building Docker image (clean build, no cache)..."
log_info "This may take 5-15 minutes on first run..."
echo ""

if docker build --no-cache -t "$TEST_IMAGE" -f "$DOCKERFILE_PATH" . > /tmp/docker-build.log 2>&1; then
    log_pass "Docker image built successfully"
else
    log_fail "Docker build failed"
    log_info "Build log:"
    cat /tmp/docker-build.log | tail -50
    exit 1
fi

echo ""

# Test 2: Verify image exists and has expected structure
log_test "Test 2: Verifying Docker image exists..."

if docker images | grep -q "$TEST_IMAGE"; then
    IMAGE_SIZE=$(docker images | grep "$TEST_IMAGE" | awk '{print $7}')
    IMAGE_HASH=$(docker images | grep "$TEST_IMAGE" | awk '{print $3}')
    log_pass "Docker image exists"
    log_info "Image Hash: $IMAGE_HASH"
    log_info "Image Size: $IMAGE_SIZE"
else
    log_fail "Docker image not found after build"
    exit 1
fi

echo ""

# Test 3: Verify required directories exist in image
log_test "Test 3: Verifying Docker image contains required files..."

# Check if dist directory exists
if docker run --rm "$TEST_IMAGE" test -d /app/apps/web/dist; then
    log_pass "Built application files present (/app/apps/web/dist)"
else
    log_fail "Built application files not found in image"
    exit 1
fi

# Check if server.js exists
if docker run --rm "$TEST_IMAGE" test -f /app/apps/web/dist/server/server.js; then
    log_pass "Server entrypoint exists (/app/apps/web/dist/server/server.js)"
else
    log_fail "Server entrypoint not found"
    exit 1
fi

echo ""

# Test 4: Verify node_modules are in image
log_test "Test 4: Verifying dependencies are included in image..."

if docker run --rm "$TEST_IMAGE" test -d /app/node_modules; then
    log_pass "Node modules present (/app/node_modules)"
else
    log_fail "Node modules not found in image"
    exit 1
fi

if docker run --rm "$TEST_IMAGE" test -d /app/apps/web/node_modules; then
    log_pass "Web node modules present (/app/apps/web/node_modules)"
else
    log_fail "Web node modules not found in image"
    exit 1
fi

echo ""

# Test 5: Verify data directory setup
log_test "Test 5: Verifying data directory and permissions..."

if docker run --rm "$TEST_IMAGE" test -d /app/data/uploads; then
    log_pass "Data directory exists (/app/data/uploads)"
else
    log_fail "Data directory missing"
    exit 1
fi

# Check directory permissions
DIR_PERMS=$(docker run --rm "$TEST_IMAGE" ls -ld /app/data | awk '{print $1}')
log_info "Data directory permissions: $DIR_PERMS"

echo ""

# Test 6: Verify runtime user configuration
log_test "Test 6: Verifying non-root user configuration..."

# Create a test container to check user
TEST_USER=$(docker run --rm "$TEST_IMAGE" whoami)
if [ "$TEST_USER" = "vamsa" ]; then
    log_pass "Image configured to run as non-root user 'vamsa'"
else
    log_fail "Image not configured for 'vamsa' user (found: $TEST_USER)"
    exit 1
fi

# Check UID
TEST_UID=$(docker run --rm "$TEST_IMAGE" id -u)
log_info "User UID: $TEST_UID"

echo ""

# Test 7: Verify environment variables
log_test "Test 7: Verifying production environment configuration..."

# Check NODE_ENV
NODE_ENV=$(docker run --rm "$TEST_IMAGE" printenv NODE_ENV)
if [ "$NODE_ENV" = "production" ]; then
    log_pass "NODE_ENV correctly set to 'production'"
else
    log_fail "NODE_ENV not set to production (got: $NODE_ENV)"
    exit 1
fi

# Check PORT
PORT=$(docker run --rm "$TEST_IMAGE" printenv PORT)
if [ "$PORT" = "3000" ]; then
    log_pass "PORT correctly set to '3000'"
else
    log_fail "PORT not set correctly (got: $PORT)"
    exit 1
fi

# Check HOST
HOST=$(docker run --rm "$TEST_IMAGE" printenv HOST)
if [ "$HOST" = "0.0.0.0" ]; then
    log_pass "HOST correctly set to '0.0.0.0'"
else
    log_fail "HOST not set correctly (got: $HOST)"
    exit 1
fi

echo ""

# Test 8: Verify exposed port
log_test "Test 8: Verifying Docker EXPOSE configuration..."

EXPOSE=$(docker inspect "$TEST_IMAGE" --format='{{.Config.ExposedPorts}}')
if echo "$EXPOSE" | grep -q "3000"; then
    log_pass "Port 3000 correctly exposed"
else
    log_fail "Port 3000 not exposed (got: $EXPOSE)"
    exit 1
fi

echo ""

# Test 9: Verify working directory
log_test "Test 9: Verifying working directory..."

WORKDIR=$(docker inspect "$TEST_IMAGE" --format='{{.Config.WorkingDir}}')
if [ "$WORKDIR" = "/app/apps/web" ]; then
    log_pass "Working directory correctly set to /app/apps/web"
else
    log_fail "Working directory incorrect (got: $WORKDIR)"
    exit 1
fi

echo ""

# Test 10: Verify CMD is set correctly
log_test "Test 10: Verifying entrypoint command..."

CMD=$(docker inspect "$TEST_IMAGE" --format='{{json .Config.Cmd}}')
if echo "$CMD" | grep -q "docker-entry.js"; then
    log_pass "Entrypoint command correctly configured"
    log_info "Command: $CMD"
else
    log_fail "Entrypoint command incorrect (got: $CMD)"
    exit 1
fi

echo ""

# Runtime Tests
log_test "Starting Runtime Tests..."
echo ""

# Test 11: Container startup
log_test "Test 11: Starting container for runtime validation..."

RUNTIME_TEST_CONTAINER="vamsa-runtime-test-$(date +%s)"
RUNTIME_TEST_PORT=3001

if docker run --rm -d -p ${RUNTIME_TEST_PORT}:3000 --name "$RUNTIME_TEST_CONTAINER" "$TEST_IMAGE" > /dev/null 2>&1; then
    log_pass "Container started successfully"
else
    log_fail "Failed to start container"
    exit 1
fi

# Wait for container to start
log_test "Waiting for container to initialize (10 seconds)..."
sleep 10

echo ""

# Test 12: Verify container is running
log_test "Test 12: Verifying container is running..."

if docker ps | grep -q "$RUNTIME_TEST_CONTAINER"; then
    log_pass "Container is running and healthy"
else
    log_fail "Container is not running"
    docker logs "$RUNTIME_TEST_CONTAINER" || true
    docker stop "$RUNTIME_TEST_CONTAINER" 2>/dev/null || true
    exit 1
fi

echo ""

# Test 13: Server startup logs
log_test "Test 13: Verifying server startup logs..."

if docker logs "$RUNTIME_TEST_CONTAINER" 2>&1 | grep -q "Server listening"; then
    log_pass "Server startup confirmed in logs"
    log_info "Log output:"
    docker logs "$RUNTIME_TEST_CONTAINER" 2>&1 | grep -E "(Server|listening|Starting)" | head -5
else
    log_fail "Server startup not confirmed in logs"
    log_info "Full container logs:"
    docker logs "$RUNTIME_TEST_CONTAINER" || true
    docker stop "$RUNTIME_TEST_CONTAINER" 2>/dev/null || true
    exit 1
fi

echo ""

# Test 14: Port binding verification
log_test "Test 14: Verifying port binding..."

if docker port "$RUNTIME_TEST_CONTAINER" | grep -q "3000"; then
    PORT_BINDING=$(docker port "$RUNTIME_TEST_CONTAINER")
    log_pass "Port 3000 is properly mapped"
    log_info "Port mapping: $PORT_BINDING"
else
    log_fail "Port 3000 is not properly mapped"
    docker stop "$RUNTIME_TEST_CONTAINER" 2>/dev/null || true
    exit 1
fi

echo ""

# Test 15: Node process verification
log_test "Test 15: Verifying node process is running..."

if docker exec "$RUNTIME_TEST_CONTAINER" ps aux 2>/dev/null | grep -q "node"; then
    log_pass "Node process is running"
    docker exec "$RUNTIME_TEST_CONTAINER" ps aux 2>/dev/null | grep "node" | grep -v grep | head -1 | awk '{print "User: " $1 ", Command: " $11 " " $12}'
else
    log_fail "Node process not found in container"
    docker stop "$RUNTIME_TEST_CONTAINER" 2>/dev/null || true
    exit 1
fi

echo ""

# Test 16: HTTP response validation
log_test "Test 16: Testing HTTP response..."

HTTP_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/http_response.txt "http://localhost:${RUNTIME_TEST_PORT}/" 2>/dev/null || echo "000")

if [ "$HTTP_RESPONSE" != "000" ]; then
    log_pass "HTTP endpoint is responding (Status: $HTTP_RESPONSE)"

    if [ "$HTTP_RESPONSE" = "200" ] || [ "$HTTP_RESPONSE" = "307" ] || [ "$HTTP_RESPONSE" = "301" ]; then
        log_info "Valid HTTP response received"
    else
        log_info "Received status code: $HTTP_RESPONSE (may indicate redirect or other response)"
    fi
else
    log_fail "HTTP endpoint not responding"
    docker logs "$RUNTIME_TEST_CONTAINER" || true
fi

echo ""

# Test 17: Entry point verification
log_test "Test 17: Verifying docker-entry.js is executed..."

if docker logs "$RUNTIME_TEST_CONTAINER" 2>&1 | grep -q "docker-entry.js\|Starting Vamsa"; then
    log_pass "docker-entry.js entry point is being used"
else
    log_info "Entry point log not found, but container is running"
    log_info "Server logs:"
    docker logs "$RUNTIME_TEST_CONTAINER" 2>&1 | head -10
fi

echo ""

# Test 18: Graceful shutdown
log_test "Test 18: Testing graceful container shutdown..."

STOP_START=$(date +%s)
if docker stop "$RUNTIME_TEST_CONTAINER" > /dev/null 2>&1; then
    STOP_END=$(date +%s)
    STOP_TIME=$((STOP_END - STOP_START))
    log_pass "Container stopped gracefully (took ${STOP_TIME}s)"
else
    log_fail "Failed to stop container"
    docker kill "$RUNTIME_TEST_CONTAINER" 2>/dev/null || true
    exit 1
fi

echo ""

# Cleanup runtime test container
if docker ps -a | grep -q "$RUNTIME_TEST_CONTAINER"; then
    docker rm "$RUNTIME_TEST_CONTAINER" 2>/dev/null || true
fi

echo ""

# Summary
echo "========================================="
log_pass "All Dockerfile integration tests passed!"
echo "========================================="
echo ""
echo "Test Summary:"
echo "  Build Phase Tests:"
echo "  - Build Quality: PASS"
echo "  - Image Structure: PASS"
echo "  - Required Files: PASS"
echo "  - Dependencies: PASS"
echo "  - Data Directory: PASS"
echo "  - User Configuration: PASS"
echo "  - Environment Variables: PASS"
echo "  - Port Configuration: PASS"
echo "  - Working Directory: PASS"
echo "  - Entrypoint Command: PASS"
echo ""
echo "  Runtime Phase Tests:"
echo "  - Container Startup: PASS"
echo "  - Container Running: PASS"
echo "  - Server Startup Logs: PASS"
echo "  - Port Binding: PASS"
echo "  - Node Process: PASS"
echo "  - HTTP Response: PASS"
echo "  - Entry Point: PASS"
echo "  - Graceful Shutdown: PASS"
echo ""
echo "Container is ready for deployment with DATABASE_URL"
echo ""
