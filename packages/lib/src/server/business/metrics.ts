/**
 * Metrics Server Functions - Business Logic for Metrics/Observability
 *
 * This module contains the business logic for all metrics operations. Each function:
 * - Performs database queries for configuration
 * - Calls external Prometheus API
 * - Handles error cases gracefully with fallback values
 * - Records metrics for monitoring
 *
 * Exported Functions:
 * - queryPrometheus: Query a single scalar metric from Prometheus
 * - queryPrometheusVector: Query a vector metric (multiple label values) from Prometheus
 * - isPrometheusAvailable: Check if Prometheus is available at default URL
 * - isPrometheusAvailableAt: Check if Prometheus is available at specific URL
 * - getMetricsSnapshotData: Fetch aggregated metrics snapshot
 * - getPrometheusStatusData: Get Prometheus configuration and availability status
 */

import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { logger } from "@vamsa/lib/logger";

/**
 * Prometheus API response structure
 */
interface PrometheusResponse {
  status: string;
  data: {
    result: Array<{
      metric: Record<string, string>;
      value: [number, string];
    }>;
  };
}

/**
 * Metrics snapshot containing aggregated system metrics
 */
export interface MetricSnapshot {
  timestamp: string;
  http: {
    requestRate: number;
    errorRate: number;
    p95Latency: number;
    activeConnections: number;
  };
  database: {
    queryRate: number;
    slowQueryCount: number;
    p95QueryTime: number;
  };
  application: {
    activeUsers: number;
    chartViews: Record<string, number>;
    searchQueries: number;
  };
  status: "healthy" | "degraded" | "unavailable";
}


const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://localhost:9090";

/**
 * Query a single metric from Prometheus
 *
 * Executes a PromQL query against Prometheus and returns a numeric value.
 * Handles network errors and invalid responses gracefully by returning 0.
 *
 * @param query - PromQL query string
 * @returns Numeric metric value or 0 if query fails
 */
export async function queryPrometheus(query: string): Promise<number> {
  try {
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, query },
        "Prometheus query failed"
      );
      return 0;
    }

    const data = (await response.json()) as PrometheusResponse;

    if (data.status === "success" && data.data.result.length > 0) {
      const value = parseFloat(data.data.result[0].value[1]);
      return isNaN(value) ? 0 : value;
    }

    return 0;
  } catch (error) {
    logger.warn({ error, query }, "Failed to query Prometheus");
    return 0;
  }
}

/**
 * Query a vector metric from Prometheus
 *
 * Executes a PromQL query that returns multiple label values and their corresponding metrics.
 * Useful for aggregating metrics by a specific label (e.g., chart_type, endpoint).
 *
 * @param query - PromQL query string that returns a vector (multiple results)
 * @param labelName - Label name to extract from metric metadata (default: "chart_type")
 * @returns Record mapping label values to numeric metrics
 */
export async function queryPrometheusVector(
  query: string,
  labelName: string = "chart_type"
): Promise<Record<string, number>> {
  try {
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {};
    }

    const data = (await response.json()) as PrometheusResponse;
    const result: Record<string, number> = {};

    if (data.status === "success") {
      for (const item of data.data.result) {
        const label = item.metric[labelName] || "unknown";
        const value = parseFloat(item.value[1]);
        result[label] = isNaN(value) ? 0 : value;
      }
    }

    return result;
  } catch (error) {
    logger.warn({ error, query }, "Failed to query Prometheus vector");
    return {};
  }
}

/**
 * Check if Prometheus is available at the default URL
 *
 * Tests connectivity to Prometheus using the health check endpoint.
 * Uses timeout to prevent hanging on unresponsive servers.
 *
 * @returns true if Prometheus responds successfully, false otherwise
 */
export async function isPrometheusAvailable(): Promise<boolean> {
  return isPrometheusAvailableAt(PROMETHEUS_URL);
}

/**
 * Check if Prometheus is available at a specific URL
 *
 * Tests connectivity to Prometheus at the provided URL using the health check endpoint.
 * Useful for validating custom Prometheus URLs from settings.
 *
 * @param url - Prometheus server URL to check
 * @returns true if Prometheus responds successfully at the URL, false otherwise
 */
export async function isPrometheusAvailableAt(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/-/healthy`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get a snapshot of current metrics from Prometheus
 *
 * Aggregates key application metrics including HTTP, database, and application metrics.
 * Queries Prometheus in parallel for performance. Returns a status indicating system health.
 *
 * If Prometheus is unavailable, returns a default snapshot with status="unavailable".
 *
 * @returns MetricSnapshot with HTTP, database, and application metrics
 */
export async function getMetricsSnapshotData(): Promise<MetricSnapshot> {
  // Check Prometheus availability first
  const prometheusAvailable = await isPrometheusAvailable();

  if (!prometheusAvailable) {
    logger.warn("Prometheus is not available");
    return {
      timestamp: new Date().toISOString(),
      http: {
        requestRate: 0,
        errorRate: 0,
        p95Latency: 0,
        activeConnections: 0,
      },
      database: {
        queryRate: 0,
        slowQueryCount: 0,
        p95QueryTime: 0,
      },
      application: {
        activeUsers: 0,
        chartViews: {},
        searchQueries: 0,
      },
      status: "unavailable" as const,
    };
  }

  // Query all metrics in parallel
  const [
    requestRate,
    errorRate,
    p95Latency,
    activeConnections,
    queryRate,
    slowQueryCount,
    p95QueryTime,
    activeUsers,
    chartViews,
    searchQueries,
  ] = await Promise.all([
    // HTTP metrics
    queryPrometheus("sum(rate(vamsa_http_request_count[1m]))"),
    queryPrometheus(
      'sum(rate(vamsa_http_request_count{status_code=~"5.."}[1m]))'
    ),
    queryPrometheus(
      "histogram_quantile(0.95, sum(rate(vamsa_http_request_duration_ms_bucket[1m])) by (le))"
    ),
    queryPrometheus("vamsa_http_active_connections"),

    // Database metrics
    queryPrometheus("sum(rate(vamsa_prisma_query_count[1m]))"),
    queryPrometheus("sum(vamsa_prisma_slow_query_count)"),
    queryPrometheus(
      "histogram_quantile(0.95, sum(rate(vamsa_prisma_query_duration_ms_bucket[1m])) by (le))"
    ),

    // Application metrics
    queryPrometheus("vamsa_active_users"),
    queryPrometheusVector(
      "sum(rate(vamsa_chart_view_count[5m])) by (chart_type)",
      "chart_type"
    ),
    queryPrometheus("sum(rate(vamsa_search_query_duration_ms_count[5m]))"),
  ]);

  // Determine health status
  let status: "healthy" | "degraded" | "unavailable" = "healthy";
  if (errorRate > 0.5 || p95Latency > 1000) {
    status = "degraded";
  }

  const metrics: MetricSnapshot = {
    timestamp: new Date().toISOString(),
    http: {
      requestRate,
      errorRate,
      p95Latency,
      activeConnections,
    },
    database: {
      queryRate,
      slowQueryCount,
      p95QueryTime,
    },
    application: {
      activeUsers,
      chartViews,
      searchQueries,
    },
    status,
  };

  return metrics;
}

/**
 * Get Prometheus configuration status
 *
 * Returns Prometheus API and Grafana dashboard URLs, checking FamilySettings
 * for custom URLs first and falling back to environment variables.
 *
 * Validates that Prometheus is available at the configured URL.
 *
 * @returns Status object with availability, URLs, and custom URL flag
 */
export async function getPrometheusStatusData(): Promise<{
  available: boolean;
  url: string;
  grafanaUrl: string;
  usingCustomUrls: boolean;
}> {
  // Check FamilySettings for custom URLs
  const settings = await drizzleDb.query.familySettings.findFirst({
    columns: {
      metricsDashboardUrl: true,
      metricsApiUrl: true,
    },
  });

  // Use custom URLs from settings, fallback to env vars
  const metricsApiUrl = settings?.metricsApiUrl || PROMETHEUS_URL;
  const grafanaUrl =
    settings?.metricsDashboardUrl ||
    process.env.GRAFANA_URL ||
    "http://localhost:3001";

  // Check availability using the configured API URL
  const available = await isPrometheusAvailableAt(metricsApiUrl);

  return {
    available,
    url: metricsApiUrl,
    grafanaUrl,
    // Indicate if using custom URLs
    usingCustomUrls: !!(
      settings?.metricsDashboardUrl || settings?.metricsApiUrl
    ),
  };
}
