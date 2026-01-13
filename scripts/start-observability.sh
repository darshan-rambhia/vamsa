#!/bin/bash

set -e

echo "Starting Vamsa Observability Stack..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/docker"

# Load environment variables if .env exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Start services
docker-compose -f "$DOCKER_DIR/docker-compose.observability.yml" up -d

echo ""
echo "Waiting for services to be healthy..."

# Wait for services to be healthy
timeout=90
elapsed=0
while [ $elapsed -lt $timeout ]; do
    healthy_count=$(docker-compose -f "$DOCKER_DIR/docker-compose.observability.yml" ps 2>/dev/null | grep -c "(healthy)" || true)
    healthy_count=${healthy_count:-0}

    if [ "$healthy_count" -ge 3 ]; then
        break
    fi

    sleep 2
    elapsed=$((elapsed + 2))
    echo "  Waiting... ($elapsed seconds, $healthy_count/3 healthy)"
done

echo ""
echo "Observability Stack Started!"
echo ""
echo "Services:"
echo "  Grafana:         http://localhost:3001 (admin/${GRAFANA_PASSWORD:-admin})"
echo "  Prometheus:      http://localhost:9090"
echo "  Alertmanager:    http://localhost:9093"
echo "  OTEL Collector:  http://localhost:4318 (HTTP) / localhost:4317 (gRPC)"
echo ""
echo "Commands:"
echo "  Check status:    docker-compose -f docker/docker-compose.observability.yml ps"
echo "  View logs:       docker-compose -f docker/docker-compose.observability.yml logs -f"
echo "  Stop stack:      docker-compose -f docker/docker-compose.observability.yml down"
echo "  Test alerts:     ./scripts/test-alerts.sh"
echo ""
echo "To connect your app, set:"
echo "  OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318"
echo ""
echo "Alert Configuration:"
echo "  For Slack alerts, set SLACK_WEBHOOK_URL in .env"
echo "  See docs/runbooks/alerts.md for alert response procedures"
echo ""
