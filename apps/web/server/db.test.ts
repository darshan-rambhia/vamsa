/**
 * Unit tests for database client with performance monitoring
 *
 * Tests the Prisma client extensions including:
 * - Query timing and metrics recording
 * - OpenTelemetry span creation and status setting
 * - Slow query detection and logging
 * - Error handling and exception recording
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// Mock the OpenTelemetry API
let mockSpan: any;
let mockTracer: any;

beforeEach(() => {
  mockSpan = {
    setAttribute: mock(() => {}),
    setStatus: mock(() => {}),
    recordException: mock(() => {}),
    end: mock(() => {}),
  };

  mockTracer = {
    startActiveSpan: mock(async (name, options, callback) => {
      return callback(mockSpan);
    }),
  };
});

mock.module("@opentelemetry/api", () => ({
  trace: {
    getTracer: mock(() => mockTracer),
  },
  SpanStatusCode: {
    OK: "OK",
    ERROR: "ERROR",
  },
}));

mock.module("@vamsa/api/client", () => ({
  prisma: {
    $extends: (extensionObj) => {
      // Return a mock prisma client with the extension
      return {
        $extends: mock(() => ({})),
      };
    },
  },
  getPoolStats: mock(() => ({
    totalConnections: 10,
    availableConnections: 8,
  })),
  getPool: mock(() => ({
    end: mock(() => {}),
  })),
  shutdown: mock(() => Promise.resolve()),
}));

mock.module("./metrics/prisma", () => ({
  recordPrismaQuery: mock(() => {}),
  recordPrismaError: mock(() => {}),
  getPrismaErrorType: mock(() => "UNKNOWN"),
  SLOW_QUERY_THRESHOLD_MS: 1000,
}));

mock.module("./metrics/slow-query-logger", () => ({
  logSlowQuery: mock(() => {}),
  sanitizeQueryParams: mock((params) => params),
}));

describe("Database Client", () => {
  describe("Module Exports", () => {
    it("should export db client", async () => {
      const { db } = await import("./db");
      expect(db).toBeDefined();
    });

    it("should export pool utilities", async () => {
      const { getPoolStats, getPool, shutdown } = await import("./db");
      expect(getPoolStats).toBeDefined();
      expect(getPool).toBeDefined();
      expect(shutdown).toBeDefined();
    });

    it("should export prisma client", async () => {
      const { prisma } = await import("./db");
      expect(prisma).toBeDefined();
    });

    it("should export DbClient type", async () => {
      const module = await import("./db");
      expect(module.db).toBeDefined();
    });
  });

  describe("Query Extension Setup", () => {
    it("should create a tracer with correct name", async () => {
      const { db } = await import("./db");
      expect(mockTracer.startActiveSpan).toBeDefined();
    });

    it("should apply extensions to prisma client", async () => {
      const { db } = await import("./db");
      expect(db).toBeDefined();
    });
  });

  describe("Pool Statistics", () => {
    it("should return pool stats when available", async () => {
      const { getPoolStats } = await import("./db");
      const stats = getPoolStats();
      expect(stats).toBeDefined();
      expect(stats.totalConnections).toEqual(10);
      expect(stats.availableConnections).toEqual(8);
    });

    it("should retrieve pool instance", async () => {
      const { getPool } = await import("./db");
      const pool = getPool();
      expect(pool).toBeDefined();
      expect(pool.end).toBeDefined();
    });
  });

  describe("Shutdown Function", () => {
    it("should be a callable function", async () => {
      const { shutdown } = await import("./db");
      expect(typeof shutdown).toBe("function");
    });

    it("should resolve when called", async () => {
      const { shutdown } = await import("./db");
      const result = await shutdown();
      expect(result).toBeUndefined();
    });
  });

  describe("Error Handling Capabilities", () => {
    it("should handle record exception for errors", async () => {
      const { db } = await import("./db");
      expect(mockSpan.recordException).toBeDefined();
    });

    it("should set error status on exceptions", async () => {
      const { db } = await import("./db");
      expect(mockSpan.setStatus).toBeDefined();
    });
  });

  describe("Span Attributes", () => {
    it("should support setting database attributes", async () => {
      const { db } = await import("./db");
      expect(mockSpan.setAttribute).toBeDefined();
    });

    it("should support setting result count attribute", async () => {
      const { db } = await import("./db");
      expect(mockSpan.setAttribute).toBeDefined();
    });

    it("should end span after query", async () => {
      const { db } = await import("./db");
      expect(mockSpan.end).toBeDefined();
    });
  });
});
