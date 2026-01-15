/**
 * Metrics API endpoint for querying Prometheus metrics
 *
 * Provides aggregated metrics for the in-app admin dashboard.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./middleware/require-auth";
import { logger } from "@vamsa/lib/logger";
import { prisma } from "./db";

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
 */
async function queryPrometheus(query: string): Promise<number> {
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

    const data = await response.json();

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
 * Query a vector metric from Prometheus (returns multiple label values)
 */
async function queryPrometheusVector(
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

    const data = await response.json();
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
 */
async function isPrometheusAvailable(): Promise<boolean> {
  return isPrometheusAvailableAt(PROMETHEUS_URL);
}

/**
 * Check if Prometheus is available at a specific URL
 */
async function isPrometheusAvailableAt(url: string): Promise<boolean> {
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
 * Admin-only endpoint that aggregates key application metrics.
 */
export const getMetricsSnapshot = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAuth("ADMIN");

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
);

/**
 * Get Prometheus configuration status
 *
 * Checks FamilySettings for custom URLs first, falling back to env vars.
 */
export const getPrometheusStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAuth("ADMIN");

    // Check FamilySettings for custom URLs
    const settings = await prisma.familySettings.findFirst({
      select: {
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
);
