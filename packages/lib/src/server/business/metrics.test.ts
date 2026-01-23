/**
 * Unit tests for metrics server business logic
 *
 * Tests cover:
 * - Querying single metrics from Prometheus
 * - Querying vector metrics from Prometheus
 * - Checking Prometheus availability at default and custom URLs
 * - Getting metrics snapshot data with health status
 * - Getting Prometheus configuration status
 * - Error handling and fallback values
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { MetricsDb } from "@vamsa/lib/server/business";

// Mock logger for this test file
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../testing/shared-mocks";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

// Create mock database client
function createMockDb(): MetricsDb {
  return {
    familySettings: {
      findFirst: mock(() => Promise.resolve(null)),
    },
  } as unknown as MetricsDb;
}

// Helper to create mock fetch response
function createMockFetchResponse(body: unknown, ok: boolean = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  } as Response);
}

// Import the functions to test
import {
  queryPrometheus,
  queryPrometheusVector,
  isPrometheusAvailable,
  isPrometheusAvailableAt,
  getMetricsSnapshotData,
  getPrometheusStatusData,
} from "@vamsa/lib/server/business";

describe("Metrics Server Functions", () => {
  let mockDb: MetricsDb;
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.warn.mockClear();
    mockFetch = mock((_url: string) =>
      createMockFetchResponse({
        status: "error",
        data: { result: [] },
      })
    );

    // Mock the global fetch
    (global as any).fetch = mockFetch;
  });

  describe("queryPrometheus", () => {
    it("should return 0 when query fails", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse(
          {
            status: "error",
            data: { result: [] },
          },
          false
        )
      );

      const result = await queryPrometheus("test_metric");

      expect(result).toBe(0);
    });

    it("should return numeric value from successful query", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse({
          status: "success",
          data: {
            result: [
              {
                metric: { __name__: "test_metric" },
                value: [1234567890, "42.5"],
              },
            ],
          },
        })
      );

      const result = await queryPrometheus("test_metric");

      expect(result).toBe(42.5);
    });

    it("should return 0 for invalid numeric value", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse({
          status: "success",
          data: {
            result: [
              {
                metric: { __name__: "test_metric" },
                value: [1234567890, "not-a-number"],
              },
            ],
          },
        })
      );

      const result = await queryPrometheus("test_metric");

      expect(result).toBe(0);
    });

    it("should return 0 when no results", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse({
          status: "success",
          data: { result: [] },
        })
      );

      const result = await queryPrometheus("test_metric");

      expect(result).toBe(0);
    });

    it("should return 0 on network error", async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error("Network timeout"))
      );

      const result = await queryPrometheus("test_metric");

      expect(result).toBe(0);
    });

    it("should encode query parameter", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse({
          status: "success",
          data: { result: [] },
        })
      );

      await queryPrometheus("sum(rate(metric[5m]))");

      const call = mockFetch.mock.calls[0];
      expect(call?.[0]).toContain("query=");
      expect(call?.[0]).toContain("sum");
    });

    it("should log warning on query failure", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse(
          { status: "error", data: { result: [] } },
          false
        )
      );

      await queryPrometheus("test_metric");

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe("queryPrometheusVector", () => {
    it("should return empty object on network error", async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error("Network error"))
      );

      const result = await queryPrometheusVector("vector_metric");

      expect(result).toEqual({});
    });

    it("should return empty object when response not ok", async () => {
      mockFetch.mockImplementation(() => createMockFetchResponse({}, false));

      const result = await queryPrometheusVector("vector_metric");

      expect(result).toEqual({});
    });

    it("should map vector results by label", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse({
          status: "success",
          data: {
            result: [
              {
                metric: { chart_type: "pedigree", __name__: "chart_views" },
                value: [1234567890, "100"],
              },
              {
                metric: { chart_type: "timeline", __name__: "chart_views" },
                value: [1234567890, "50"],
              },
            ],
          },
        })
      );

      const result = await queryPrometheusVector("chart_views", "chart_type");

      expect(result.pedigree).toBe(100);
      expect(result.timeline).toBe(50);
    });

    it("should use default label name", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse({
          status: "success",
          data: {
            result: [
              {
                metric: { chart_type: "pedigree" },
                value: [1234567890, "100"],
              },
            ],
          },
        })
      );

      const result = await queryPrometheusVector("vector_metric");

      expect(result.pedigree).toBe(100);
    });

    it("should map unknown label to 'unknown'", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse({
          status: "success",
          data: {
            result: [
              {
                metric: { other_label: "value" },
                value: [1234567890, "100"],
              },
            ],
          },
        })
      );

      const result = await queryPrometheusVector("vector_metric", "chart_type");

      expect(result.unknown).toBe(100);
    });

    it("should return 0 for invalid numeric values", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse({
          status: "success",
          data: {
            result: [
              {
                metric: { chart_type: "pedigree" },
                value: [1234567890, "invalid"],
              },
            ],
          },
        })
      );

      const result = await queryPrometheusVector("vector_metric", "chart_type");

      expect(result.pedigree).toBe(0);
    });

    it("should log warning on query failure", async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error("Network error"))
      );

      await queryPrometheusVector("vector_metric");

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe("isPrometheusAvailable", () => {
    it("should return true when Prometheus is available", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse({ status: "ok" }, true)
      );

      const result = await isPrometheusAvailable();

      expect(result).toBe(true);
    });

    it("should return false when Prometheus is unavailable", async () => {
      mockFetch.mockImplementation(() => createMockFetchResponse({}, false));

      const result = await isPrometheusAvailable();

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error("Connection refused"))
      );

      const result = await isPrometheusAvailable();

      expect(result).toBe(false);
    });

    it("should use default URL", async () => {
      mockFetch.mockImplementation(() => createMockFetchResponse({}, true));

      await isPrometheusAvailable();

      const call = mockFetch.mock.calls[0];
      expect(call?.[0]).toContain("/-/healthy");
    });
  });

  describe("isPrometheusAvailableAt", () => {
    it("should check availability at custom URL", async () => {
      mockFetch.mockImplementation(() => createMockFetchResponse({}, true));

      const result = await isPrometheusAvailableAt(
        "http://custom.prometheus:9090"
      );

      expect(result).toBe(true);
      const call = mockFetch.mock.calls[0];
      expect(call?.[0]).toContain("custom.prometheus");
    });

    it("should return false for unavailable custom URL", async () => {
      mockFetch.mockImplementation(() => createMockFetchResponse({}, false));

      const result = await isPrometheusAvailableAt(
        "http://unavailable.prometheus:9090"
      );

      expect(result).toBe(false);
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error("Timeout")));

      const result = await isPrometheusAvailableAt("http://localhost:9090");

      expect(result).toBe(false);
    });
  });

  describe("getMetricsSnapshotData", () => {
    it("should return unavailable status when Prometheus is down", async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error("Connection refused"))
      );

      const result = await getMetricsSnapshotData(mockDb);

      expect(result.status).toBe("unavailable");
      expect(result.http.requestRate).toBe(0);
      expect(result.database.queryRate).toBe(0);
      expect(result.application.activeUsers).toBe(0);
    });

    it("should return healthy status with valid metrics", async () => {
      let _callCount = 0;
      mockFetch.mockImplementation(() => {
        _callCount++;
        // Return low values to avoid degraded status (errorRate > 0.5 or p95Latency > 1000)
        // Error rate is the 3rd metric query result, so at callCount=3
        return createMockFetchResponse({
          status: "success",
          data: {
            result: [
              {
                metric: { __name__: "metric" },
                value: [1234567890, "0.1"], // Low values for healthy status
              },
            ],
          },
        });
      });

      const result = await getMetricsSnapshotData(mockDb);

      expect(result.status).toBe("healthy");
      expect(result.timestamp).toBeDefined();
      expect(typeof result.http.requestRate).toBe("number");
    });

    it("should return degraded status when error rate is high", async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        // Error rate is returned as a high value in certain positions
        // We need this to be at the position where error rate is queried
        if (callCount > 1 && callCount <= 11) {
          // This is a query call (not the health check)
          if (callCount === 4) {
            // Error rate query position
            return createMockFetchResponse({
              status: "success",
              data: {
                result: [
                  {
                    metric: { __name__: "error_rate" },
                    value: [1234567890, "0.6"],
                  },
                ],
              },
            });
          }
        }
        return createMockFetchResponse({
          status: "success",
          data: {
            result: [
              {
                metric: { __name__: "metric" },
                value: [1234567890, "10"],
              },
            ],
          },
        });
      });

      const result = await getMetricsSnapshotData(mockDb);

      expect(result.status).toBe("degraded");
    });

    it("should return degraded status when latency is high", async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        // p95 latency query is at position 4 (0-indexed: 3)
        if (callCount === 5) {
          return createMockFetchResponse({
            status: "success",
            data: {
              result: [
                {
                  metric: { __name__: "latency" },
                  value: [1234567890, "1500"],
                },
              ],
            },
          });
        }
        return createMockFetchResponse({
          status: "success",
          data: {
            result: [
              {
                metric: { __name__: "metric" },
                value: [1234567890, "10"],
              },
            ],
          },
        });
      });

      const result = await getMetricsSnapshotData(mockDb);

      expect(result.status).toBe("degraded");
    });

    it("should include all required metric fields", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse({
          status: "success",
          data: {
            result: [
              {
                metric: { __name__: "metric" },
                value: [1234567890, "10"],
              },
            ],
          },
        })
      );

      const result = await getMetricsSnapshotData(mockDb);

      expect(result.http).toBeDefined();
      expect(result.http.requestRate).toBeDefined();
      expect(result.http.errorRate).toBeDefined();
      expect(result.http.p95Latency).toBeDefined();
      expect(result.http.activeConnections).toBeDefined();

      expect(result.database).toBeDefined();
      expect(result.database.queryRate).toBeDefined();
      expect(result.database.slowQueryCount).toBeDefined();
      expect(result.database.p95QueryTime).toBeDefined();

      expect(result.application).toBeDefined();
      expect(result.application.activeUsers).toBeDefined();
      expect(result.application.chartViews).toBeDefined();
      expect(result.application.searchQueries).toBeDefined();
    });

    it("should have timestamp in ISO format", async () => {
      mockFetch.mockImplementation(() =>
        createMockFetchResponse({
          status: "success",
          data: {
            result: [
              {
                metric: { __name__: "metric" },
                value: [1234567890, "10"],
              },
            ],
          },
        })
      );

      const result = await getMetricsSnapshotData(mockDb);

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("getPrometheusStatusData", () => {
    it("should return defaults when no settings found", async () => {
      mockFetch.mockImplementation(() => createMockFetchResponse({}, true));
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      const result = await getPrometheusStatusData(mockDb);

      expect(result.available).toBe(true);
      expect(result.url).toContain("localhost:9090");
      expect(result.grafanaUrl).toContain("localhost:3001");
      expect(result.usingCustomUrls).toBe(false);
    });

    it("should use custom URLs from settings", async () => {
      mockFetch.mockImplementation(() => createMockFetchResponse({}, true));
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValue({
        metricsApiUrl: "http://custom-api:9090",
        metricsDashboardUrl: "http://custom-grafana:3001",
      });

      const result = await getPrometheusStatusData(mockDb);

      expect(result.url).toBe("http://custom-api:9090");
      expect(result.grafanaUrl).toBe("http://custom-grafana:3001");
      expect(result.usingCustomUrls).toBe(true);
    });

    it("should check availability at configured URL", async () => {
      mockFetch.mockImplementation(() => createMockFetchResponse({}, false));
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValue({
        metricsApiUrl: "http://custom-api:9090",
        metricsDashboardUrl: "http://custom-grafana:3001",
      });

      const result = await getPrometheusStatusData(mockDb);

      expect(result.available).toBe(false);
    });

    it("should use only metrics API URL as custom", async () => {
      mockFetch.mockImplementation(() => createMockFetchResponse({}, true));
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValue({
        metricsApiUrl: "http://custom-api:9090",
        metricsDashboardUrl: null,
      });

      const result = await getPrometheusStatusData(mockDb);

      expect(result.url).toBe("http://custom-api:9090");
      expect(result.usingCustomUrls).toBe(true);
    });

    it("should use only metrics dashboard URL as custom", async () => {
      mockFetch.mockImplementation(() => createMockFetchResponse({}, true));
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValue({
        metricsApiUrl: null,
        metricsDashboardUrl: "http://custom-grafana:3001",
      });

      const result = await getPrometheusStatusData(mockDb);

      expect(result.usingCustomUrls).toBe(true);
    });

    it("should fall back to default localhost URLs when nothing configured", async () => {
      mockFetch.mockImplementation(() => createMockFetchResponse({}, true));
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      const result = await getPrometheusStatusData(mockDb);

      expect(result.url).toContain("localhost");
      expect(result.grafanaUrl).toContain("localhost");
    });

    it("should handle database errors gracefully", async () => {
      const error = new Error("Database error");
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockRejectedValue(error);

      try {
        await getPrometheusStatusData(mockDb);
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });
});
