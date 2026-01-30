/**
 * Metrics Server Functions - Framework Wrappers
 *
 * This module contains thin `createServerFn` wrappers that call the business logic
 * functions from metrics.server.ts. These wrappers handle:
 * - Authentication (delegated to server layer via requireAuth)
 * - Calling the corresponding server function
 * - Error handling
 *
 * This layer is excluded from unit test coverage as it's framework integration code.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  getMetricsSnapshotData,
  getPrometheusStatusData,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";
import type { MetricSnapshot } from "@vamsa/lib/server/business";

// Re-export type for use by components
export type { MetricSnapshot };

/**
 * Get a snapshot of current metrics from Prometheus
 *
 * Admin-only endpoint that aggregates key application metrics.
 *
 * Returns metrics for:
 * - HTTP layer (request rate, error rate, p95 latency, active connections)
 * - Database layer (query rate, slow queries, p95 query time)
 * - Application layer (active users, chart views by type, search queries)
 *
 * Requires ADMIN role.
 */
export const getMetricsSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<MetricSnapshot> => {
    await requireAuth("ADMIN");
    return getMetricsSnapshotData();
  }
);

/**
 * Get Prometheus configuration status
 *
 * Checks FamilySettings for custom URLs first, falling back to env vars.
 * Validates that Prometheus is available at the configured URL.
 *
 * Requires ADMIN role.
 */
export const getPrometheusStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    available: boolean;
    url: string;
    grafanaUrl: string;
    usingCustomUrls: boolean;
  }> => {
    await requireAuth("ADMIN");
    return getPrometheusStatusData();
  }
);
