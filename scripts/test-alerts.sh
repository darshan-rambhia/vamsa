#!/bin/bash

# Prometheus Alert Testing Script for Vamsa
# This script helps verify that alerting rules and Alertmanager are working correctly.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
APP_URL="${APP_URL:-http://localhost:3000}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Vamsa Alert Testing Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if a service is running
check_service() {
    local name=$1
    local url=$2
    local health_endpoint=$3

    if curl -s -o /dev/null -w "%{http_code}" "${url}${health_endpoint}" | grep -q "200"; then
        echo -e "  ${GREEN}[OK]${NC} $name is running at $url"
        return 0
    else
        echo -e "  ${RED}[ERROR]${NC} $name is not accessible at $url"
        return 1
    fi
}

# Step 1: Check services are running
echo -e "${YELLOW}Step 1: Checking services...${NC}"
echo ""

prometheus_ok=false
alertmanager_ok=false

if check_service "Prometheus" "$PROMETHEUS_URL" "/-/healthy"; then
    prometheus_ok=true
fi

if check_service "Alertmanager" "$ALERTMANAGER_URL" "/-/healthy"; then
    alertmanager_ok=true
fi

check_service "Application" "$APP_URL" "/api/health" || true

echo ""

if [ "$prometheus_ok" = false ] || [ "$alertmanager_ok" = false ]; then
    echo -e "${RED}Required services are not running. Please start the observability stack:${NC}"
    echo "  ./scripts/start-observability.sh"
    exit 1
fi

# Step 2: Verify alert rules are loaded
echo -e "${YELLOW}Step 2: Checking alert rules are loaded...${NC}"
echo ""

rules_response=$(curl -s "$PROMETHEUS_URL/api/v1/rules")
rule_groups=$(echo "$rules_response" | jq -r '.data.groups[].name' 2>/dev/null || echo "")

if [ -z "$rule_groups" ]; then
    echo -e "  ${RED}[ERROR]${NC} No alert rules found in Prometheus"
    echo "  Check that alerts.yml is mounted correctly in docker-compose"
    exit 1
fi

echo "  Found alert rule groups:"
echo "$rule_groups" | while read -r group; do
    echo -e "    ${GREEN}-${NC} $group"
done
echo ""

# Step 3: Check Alertmanager connectivity from Prometheus
echo -e "${YELLOW}Step 3: Checking Prometheus -> Alertmanager connectivity...${NC}"
echo ""

alertmanager_status=$(curl -s "$PROMETHEUS_URL/api/v1/alertmanagers")
active_alertmanagers=$(echo "$alertmanager_status" | jq -r '.data.activeAlertmanagers | length' 2>/dev/null || echo "0")

if [ "$active_alertmanagers" -gt 0 ]; then
    echo -e "  ${GREEN}[OK]${NC} Prometheus is connected to $active_alertmanagers Alertmanager instance(s)"
else
    echo -e "  ${YELLOW}[WARN]${NC} No active Alertmanager connections found"
    echo "  Alerts may not be routed correctly"
fi
echo ""

# Step 4: List current alerts
echo -e "${YELLOW}Step 4: Current alert status...${NC}"
echo ""

alerts_response=$(curl -s "$PROMETHEUS_URL/api/v1/alerts")
firing_alerts=$(echo "$alerts_response" | jq -r '.data.alerts[] | select(.state == "firing") | .labels.alertname' 2>/dev/null || echo "")
pending_alerts=$(echo "$alerts_response" | jq -r '.data.alerts[] | select(.state == "pending") | .labels.alertname' 2>/dev/null || echo "")

if [ -n "$firing_alerts" ]; then
    echo -e "  ${RED}Firing alerts:${NC}"
    echo "$firing_alerts" | while read -r alert; do
        echo -e "    - $alert"
    done
else
    echo -e "  ${GREEN}No firing alerts${NC}"
fi

if [ -n "$pending_alerts" ]; then
    echo -e "  ${YELLOW}Pending alerts:${NC}"
    echo "$pending_alerts" | while read -r alert; do
        echo -e "    - $alert"
    done
fi
echo ""

# Step 5: Check Alertmanager alerts
echo -e "${YELLOW}Step 5: Alerts in Alertmanager...${NC}"
echo ""

am_alerts=$(curl -s "$ALERTMANAGER_URL/api/v2/alerts")
am_alert_count=$(echo "$am_alerts" | jq 'length' 2>/dev/null || echo "0")

echo "  Active alerts in Alertmanager: $am_alert_count"

if [ "$am_alert_count" -gt 0 ]; then
    echo "  Alert details:"
    echo "$am_alerts" | jq -r '.[] | "    - \(.labels.alertname) [\(.labels.severity)]: \(.annotations.summary)"' 2>/dev/null || true
fi
echo ""

# Step 6: Trigger a test alert (optional)
echo -e "${YELLOW}Step 6: Test alert trigger (optional)${NC}"
echo ""

read -p "Do you want to trigger a test alert? (y/N): " trigger_test

if [ "$trigger_test" = "y" ] || [ "$trigger_test" = "Y" ]; then
    echo ""
    echo "  Sending test alert to Alertmanager..."

    # Send a test alert directly to Alertmanager
    test_alert='[
      {
        "labels": {
          "alertname": "TestAlert",
          "severity": "warning",
          "component": "testing",
          "instance": "test-script"
        },
        "annotations": {
          "summary": "Test alert from test-alerts.sh script",
          "description": "This is a test alert to verify Alertmanager is working correctly."
        },
        "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
        "generatorURL": "http://localhost:9090/graph"
      }
    ]'

    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$test_alert" \
        "$ALERTMANAGER_URL/api/v2/alerts")

    if [ "$response" = "200" ]; then
        echo -e "  ${GREEN}[OK]${NC} Test alert sent successfully!"
        echo ""
        echo "  Check the following for the test alert:"
        echo "    - Alertmanager UI: $ALERTMANAGER_URL/#/alerts"
        echo "    - Slack channel (if configured): #vamsa-alerts"
        echo ""
        echo "  Note: The test alert will auto-resolve in ~5 minutes"
    else
        echo -e "  ${RED}[ERROR]${NC} Failed to send test alert (HTTP $response)"
    fi
else
    echo "  Skipping test alert trigger"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "  Services:"
echo "    Prometheus:    $PROMETHEUS_URL"
echo "    Alertmanager:  $ALERTMANAGER_URL"
echo ""
echo "  Useful URLs:"
echo "    - Prometheus Alerts:  $PROMETHEUS_URL/alerts"
echo "    - Prometheus Rules:   $PROMETHEUS_URL/rules"
echo "    - Alertmanager UI:    $ALERTMANAGER_URL/#/alerts"
echo "    - Grafana Alerts:     http://localhost:3001/alerting/list"
echo ""
echo -e "${GREEN}Alert testing complete!${NC}"
