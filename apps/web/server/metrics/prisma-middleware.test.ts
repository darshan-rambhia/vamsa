import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  createPrismaPerformanceMiddleware,
  isSlowQuery,
} from "./prisma-middleware";
import {
  getSlowQueries,
  clearSlowQueries,
  SLOW_QUERY_LOG_THRESHOLD_MS,
} from "./slow-query-logger";
import { SLOW_QUERY_THRESHOLD_MS } from "./prisma";

describe("Prisma Performance Middleware", () => {
  beforeEach(() => {
    // Clear slow queries before each test
    clearSlowQueries();
  });

  afterEach(() => {
    clearSlowQueries();
  });

  it("logs slow queries when duration exceeds threshold", async () => {
    const middleware = createPrismaPerformanceMiddleware();

    // Simulate a slow next function (delay greater than SLOW_QUERY_LOG_THRESHOLD_MS)
    const delay = SLOW_QUERY_LOG_THRESHOLD_MS + 50;
    const slowNext = async () => {
      await new Promise((r) => setTimeout(r, delay));
      return [];
    };

    await middleware(
      { model: "Person", action: "findMany" },
      slowNext as Parameters<typeof middleware>[1]
    );

    const slowQueries = getSlowQueries();
    expect(slowQueries.length).toBeGreaterThanOrEqual(1);
    expect(slowQueries[0].model).toBe("Person");
    expect(slowQueries[0].operation).toBe("findMany");
    expect(slowQueries[0].duration).toBeGreaterThanOrEqual(delay);
  });

  it("does not log fast queries", async () => {
    const middleware = createPrismaPerformanceMiddleware();

    // Simulate a fast next function
    const fastNext = async () => {
      return [];
    };

    await middleware(
      { model: "Person", action: "findMany" },
      fastNext as Parameters<typeof middleware>[1]
    );

    const slowQueries = getSlowQueries();
    expect(slowQueries.length).toBe(0);
  });

  describe("isSlowQuery", () => {
    it("returns true for durations exceeding threshold", () => {
      expect(isSlowQuery(SLOW_QUERY_THRESHOLD_MS + 1)).toBe(true);
      expect(isSlowQuery(SLOW_QUERY_THRESHOLD_MS + 1000)).toBe(true);
    });

    it("returns false for durations within threshold", () => {
      expect(isSlowQuery(SLOW_QUERY_THRESHOLD_MS)).toBe(false);
      expect(isSlowQuery(SLOW_QUERY_THRESHOLD_MS - 1)).toBe(false);
      expect(isSlowQuery(0)).toBe(false);
    });
  });
});
