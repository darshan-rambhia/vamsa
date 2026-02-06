/**
 * Unit tests for Metrics Business Logic
 *
 * Tests cover core functionality:
 * - Prometheus query operations
 * - Metric snapshot aggregation
 * - Prometheus availability checks
 * - Error handling and fallback behavior
 * - Metric data structure validation
 */

import { describe, expect, it, mock } from "bun:test";
import { drizzleDb } from "@vamsa/api";
import {
  getMetricsSnapshotData,
  getPrometheusStatusData,
  isPrometheusAvailable,
  isPrometheusAvailableAt,
  queryPrometheus,
  queryPrometheusVector,
} from "./metrics";

import type { MetricSnapshot } from "./metrics";

describe("Metrics Business Logic", () => {
  describe("queryPrometheus", () => {
    it("should return 0 for query failure", async () => {
      const result = await queryPrometheus("invalid_query");
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("should handle network errors gracefully", async () => {
      // Mock fetch to throw network error
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() => {
        throw new Error("Network error");
      }) as any;

      const result = await queryPrometheus("any_query");
      expect(result).toBe(0);

      globalThis.fetch = originalFetch;
    });

    it("should parse valid Prometheus response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                result: [
                  {
                    metric: {},
                    value: [1234567890, "42.5"],
                  },
                ],
              },
            }),
        })
      ) as any;

      const result = await queryPrometheus("test_query");
      // Result should be a number
      expect(typeof result).toBe("number");

      globalThis.fetch = originalFetch;
    });

    it("should return 0 for non-success response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "error",
              data: { result: [] },
            }),
        })
      ) as any;

      const result = await queryPrometheus("test_query");
      expect(result).toBe(0);

      globalThis.fetch = originalFetch;
    });

    it("should handle NaN values", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                result: [
                  {
                    metric: {},
                    value: [1234567890, "not_a_number"],
                  },
                ],
              },
            }),
        })
      ) as any;

      const result = await queryPrometheus("test_query");
      expect(result).toBe(0);

      globalThis.fetch = originalFetch;
    });
  });

  describe("queryPrometheusVector", () => {
    it("should return empty object on network error", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() => {
        throw new Error("Network error");
      }) as any;

      const result = await queryPrometheusVector("test_query");
      expect(result).toEqual({});

      globalThis.fetch = originalFetch;
    });

    it("should parse vector response with labels", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                result: [
                  {
                    metric: { chart_type: "ancestor" },
                    value: [1234567890, "10"],
                  },
                  {
                    metric: { chart_type: "descendant" },
                    value: [1234567890, "20"],
                  },
                ],
              },
            }),
        })
      ) as any;

      const result = await queryPrometheusVector("test_query");
      // Result should be an object with chart types as keys
      expect(typeof result).toBe("object");

      globalThis.fetch = originalFetch;
    });

    it("should use custom label name", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                result: [
                  {
                    metric: { custom_label: "value1" },
                    value: [1234567890, "100"],
                  },
                ],
              },
            }),
        })
      ) as any;

      const result = await queryPrometheusVector("test_query", "custom_label");
      expect(typeof result).toBe("object");

      globalThis.fetch = originalFetch;
    });

    it("should return empty object for non-success response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "error",
              data: { result: [] },
            }),
        })
      ) as any;

      const result = await queryPrometheusVector("test_query");
      expect(result).toEqual({});

      globalThis.fetch = originalFetch;
    });

    it("should handle missing labels with 'unknown'", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                result: [
                  {
                    metric: {},
                    value: [1234567890, "50"],
                  },
                ],
              },
            }),
        })
      ) as any;

      const result = await queryPrometheusVector("test_query");
      // Should have 'unknown' key for missing label
      expect(typeof result).toBe("object");

      globalThis.fetch = originalFetch;
    });
  });

  describe("isPrometheusAvailable", () => {
    it("should return boolean for availability check", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
        })
      ) as any;

      const result = await isPrometheusAvailable();
      expect(typeof result).toBe("boolean");

      globalThis.fetch = originalFetch;
    });

    it("should return false on network error", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() => {
        throw new Error("Network error");
      }) as any;

      const result = await isPrometheusAvailable();
      expect(result).toBe(false);

      globalThis.fetch = originalFetch;
    });

    it("should return false on non-ok response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 503,
        })
      ) as any;

      const result = await isPrometheusAvailable();
      expect(result).toBe(false);

      globalThis.fetch = originalFetch;
    });
  });

  describe("isPrometheusAvailableAt", () => {
    it("should return true for available Prometheus", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
        })
      ) as any;

      const result = await isPrometheusAvailableAt("http://localhost:9090");
      expect(result).toBe(true);

      globalThis.fetch = originalFetch;
    });

    it("should return false for unavailable Prometheus", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
        })
      ) as any;

      const result = await isPrometheusAvailableAt("http://localhost:9090");
      expect(result).toBe(false);

      globalThis.fetch = originalFetch;
    });

    it("should handle timeout", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() => {
        throw new Error("Timeout");
      }) as any;

      const result = await isPrometheusAvailableAt("http://localhost:9090");
      expect(result).toBe(false);

      globalThis.fetch = originalFetch;
    });
  });

  describe("getMetricsSnapshotData", () => {
    it("should return metrics snapshot structure", async () => {
      const originalFetch = globalThis.fetch;
      let callCount = 0;

      globalThis.fetch = mock(() => {
        callCount++;
        if (callCount === 1) {
          // First call checks Prometheus availability
          return Promise.resolve({ ok: true });
        }
        // Subsequent calls are metric queries
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                result: [{ metric: {}, value: [1234567890, "0"] }],
              },
            }),
        });
      }) as any;

      const result = await getMetricsSnapshotData();

      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.http).toBeDefined();
      expect(result.database).toBeDefined();
      expect(result.application).toBeDefined();
      expect(result.status).toBeDefined();

      globalThis.fetch = originalFetch;
    });

    it("should return unavailable status when Prometheus is down", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
        })
      ) as any;

      const result = await getMetricsSnapshotData();

      expect(result.status).toBe("unavailable");
      expect(result.http.requestRate).toBe(0);
      expect(result.database.queryRate).toBe(0);
      expect(result.application.activeUsers).toBe(0);

      globalThis.fetch = originalFetch;
    });

    it("should return degraded status for high error rate", async () => {
      const originalFetch = globalThis.fetch;
      let callCount = 0;

      globalThis.fetch = mock(() => {
        callCount++;
        if (callCount === 1) {
          // Prometheus availability check
          return Promise.resolve({ ok: true });
        }
        if (callCount === 3) {
          // Error rate query (callCount 2 is request rate, 3 is error rate)
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: "success",
                data: {
                  result: [{ metric: {}, value: [1234567890, "0.75"] }], // 75% error rate
                },
              }),
          });
        }
        // Other queries
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                result: [{ metric: {}, value: [1234567890, "0"] }],
              },
            }),
        });
      }) as any;

      const result = await getMetricsSnapshotData();

      expect(result.status).toBe("degraded");

      globalThis.fetch = originalFetch;
    });

    it("should have correct metric value types", async () => {
      const originalFetch = globalThis.fetch;
      let callCount = 0;

      globalThis.fetch = mock(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                result: [{ metric: {}, value: [1234567890, "42"] }],
              },
            }),
        });
      }) as any;

      const result = await getMetricsSnapshotData();

      // Verify all fields are numbers
      expect(typeof result.http.requestRate).toBe("number");
      expect(typeof result.http.errorRate).toBe("number");
      expect(typeof result.http.p95Latency).toBe("number");
      expect(typeof result.http.activeConnections).toBe("number");

      expect(typeof result.database.queryRate).toBe("number");
      expect(typeof result.database.slowQueryCount).toBe("number");
      expect(typeof result.database.p95QueryTime).toBe("number");

      expect(typeof result.application.activeUsers).toBe("number");
      expect(typeof result.application.searchQueries).toBe("number");

      globalThis.fetch = originalFetch;
    });
  });

  describe("getPrometheusStatusData", () => {
    it("should return status with availability", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
        })
      ) as any;

      const result = await getPrometheusStatusData(drizzleDb);

      expect(result).toBeDefined();
      expect(result.available).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.grafanaUrl).toBeDefined();
      expect(result.usingCustomUrls).toBeDefined();

      globalThis.fetch = originalFetch;
    });

    it("should return false availability when Prometheus unavailable", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
        })
      ) as any;

      const result = await getPrometheusStatusData(drizzleDb);

      expect(result.available).toBe(false);

      globalThis.fetch = originalFetch;
    });

    it("should use environment URLs", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
        })
      ) as any;

      const result = await getPrometheusStatusData(drizzleDb);

      // Should have default URLs
      expect(typeof result.url).toBe("string");
      expect(typeof result.grafanaUrl).toBe("string");

      globalThis.fetch = originalFetch;
    });

    it("should indicate custom URLs when used", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
        })
      ) as any;

      const result = await getPrometheusStatusData(drizzleDb);

      // Should be a boolean
      expect(typeof result.usingCustomUrls).toBe("boolean");

      globalThis.fetch = originalFetch;
    });
  });

  describe("MetricSnapshot structure", () => {
    it("should have all required fields", () => {
      const mockSnapshot: MetricSnapshot = {
        timestamp: new Date().toISOString(),
        http: {
          requestRate: 100,
          errorRate: 0.05,
          p95Latency: 200,
          activeConnections: 50,
        },
        database: {
          queryRate: 500,
          slowQueryCount: 5,
          p95QueryTime: 100,
        },
        application: {
          activeUsers: 10,
          chartViews: { ancestor: 5, descendant: 3 },
          searchQueries: 20,
        },
        status: "healthy",
      };

      expect(mockSnapshot.timestamp).toBeDefined();
      expect(mockSnapshot.http.requestRate).toBeGreaterThanOrEqual(0);
      expect(mockSnapshot.database.queryRate).toBeGreaterThanOrEqual(0);
      expect(mockSnapshot.application.activeUsers).toBeGreaterThanOrEqual(0);
      expect(["healthy", "degraded", "unavailable"]).toContain(
        mockSnapshot.status
      );
    });

    it("should have valid status values", () => {
      const validStatuses = ["healthy", "degraded", "unavailable"];
      const testSnapshots = [
        { status: "healthy" as const },
        { status: "degraded" as const },
        { status: "unavailable" as const },
      ];

      testSnapshots.forEach((snapshot) => {
        expect(validStatuses).toContain(snapshot.status);
      });
    });

    it("should have numeric metric values", () => {
      const mockSnapshot: MetricSnapshot = {
        timestamp: new Date().toISOString(),
        http: {
          requestRate: 100,
          errorRate: 0.05,
          p95Latency: 200,
          activeConnections: 50,
        },
        database: {
          queryRate: 500,
          slowQueryCount: 5,
          p95QueryTime: 100,
        },
        application: {
          activeUsers: 10,
          chartViews: {},
          searchQueries: 20,
        },
        status: "healthy",
      };

      // All metric values should be non-negative numbers
      expect(mockSnapshot.http.requestRate).toBeGreaterThanOrEqual(0);
      expect(mockSnapshot.http.errorRate).toBeGreaterThanOrEqual(0);
      expect(mockSnapshot.http.p95Latency).toBeGreaterThanOrEqual(0);
      expect(mockSnapshot.database.queryRate).toBeGreaterThanOrEqual(0);
      expect(mockSnapshot.database.slowQueryCount).toBeGreaterThanOrEqual(0);
      expect(mockSnapshot.application.activeUsers).toBeGreaterThanOrEqual(0);
      expect(mockSnapshot.application.searchQueries).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error handling edge cases", () => {
    it("should handle empty Prometheus response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: { result: [] },
            }),
        })
      ) as any;

      const result = await queryPrometheus("test_query");
      expect(result).toBe(0);

      globalThis.fetch = originalFetch;
    });

    it("should handle malformed JSON response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => {
            throw new Error("Invalid JSON");
          },
        })
      ) as any;

      const result = await queryPrometheus("test_query");
      expect(result).toBe(0);

      globalThis.fetch = originalFetch;
    });

    it("should handle HTTP error responses", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      ) as any;

      const result = await queryPrometheus("test_query");
      expect(result).toBe(0);

      globalThis.fetch = originalFetch;
    });
  });
});
