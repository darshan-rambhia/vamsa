/**
 * Tests for slow query logger
 *
 * These tests verify that slow query logging and statistics work correctly.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  logSlowQuery,
  getSlowQueries,
  getSlowQueryStats,
  clearSlowQueries,
  sanitizeQueryParams,
  SLOW_QUERY_LOG_THRESHOLD_MS,
  type SlowQuery,
} from "./slow-query-logger";

describe("Slow Query Logger", () => {
  beforeEach(() => {
    // Clear the buffer before each test
    clearSlowQueries();
  });

  describe("logSlowQuery", () => {
    test("adds a query to the buffer", () => {
      const query: SlowQuery = {
        model: "Person",
        operation: "findMany",
        duration: 1500,
        timestamp: new Date(),
      };

      logSlowQuery(query);

      const queries = getSlowQueries();
      expect(queries).toHaveLength(1);
      expect(queries[0]).toEqual(query);
    });

    test("newest queries are first", () => {
      const query1: SlowQuery = {
        model: "Person",
        operation: "findMany",
        duration: 1500,
        timestamp: new Date("2024-01-01T10:00:00Z"),
      };

      const query2: SlowQuery = {
        model: "User",
        operation: "findUnique",
        duration: 2000,
        timestamp: new Date("2024-01-01T11:00:00Z"),
      };

      logSlowQuery(query1);
      logSlowQuery(query2);

      const queries = getSlowQueries();
      expect(queries).toHaveLength(2);
      expect(queries[0]).toEqual(query2);
      expect(queries[1]).toEqual(query1);
    });

    test("respects the buffer limit", () => {
      // Add 110 queries (more than the 100 limit)
      for (let i = 0; i < 110; i++) {
        logSlowQuery({
          model: "Person",
          operation: "findMany",
          duration: 1500 + i,
          timestamp: new Date(),
        });
      }

      const queries = getSlowQueries(150); // Request more than available
      expect(queries.length).toBeLessThanOrEqual(100);
    });
  });

  describe("getSlowQueries", () => {
    test("returns empty array when no queries logged", () => {
      const queries = getSlowQueries();
      expect(queries).toEqual([]);
    });

    test("respects the limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        logSlowQuery({
          model: "Person",
          operation: "findMany",
          duration: 1500,
          timestamp: new Date(),
        });
      }

      const queries = getSlowQueries(5);
      expect(queries).toHaveLength(5);
    });

    test("returns all queries when limit exceeds count", () => {
      for (let i = 0; i < 3; i++) {
        logSlowQuery({
          model: "Person",
          operation: "findMany",
          duration: 1500,
          timestamp: new Date(),
        });
      }

      const queries = getSlowQueries(10);
      expect(queries).toHaveLength(3);
    });

    test("uses default limit of 20", () => {
      for (let i = 0; i < 30; i++) {
        logSlowQuery({
          model: "Person",
          operation: "findMany",
          duration: 1500,
          timestamp: new Date(),
        });
      }

      const queries = getSlowQueries();
      expect(queries).toHaveLength(20);
    });
  });

  describe("getSlowQueryStats", () => {
    test("returns zeros when no queries logged", () => {
      const stats = getSlowQueryStats();

      expect(stats.totalCount).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.maxDuration).toBe(0);
      expect(stats.byModel).toEqual({});
      expect(stats.byOperation).toEqual({});
    });

    test("calculates correct statistics", () => {
      logSlowQuery({
        model: "Person",
        operation: "findMany",
        duration: 1000,
        timestamp: new Date(),
      });
      logSlowQuery({
        model: "Person",
        operation: "findUnique",
        duration: 2000,
        timestamp: new Date(),
      });
      logSlowQuery({
        model: "User",
        operation: "findMany",
        duration: 3000,
        timestamp: new Date(),
      });

      const stats = getSlowQueryStats();

      expect(stats.totalCount).toBe(3);
      expect(stats.averageDuration).toBe(2000);
      expect(stats.maxDuration).toBe(3000);
      expect(stats.byModel).toEqual({ Person: 2, User: 1 });
      expect(stats.byOperation).toEqual({ findMany: 2, findUnique: 1 });
    });
  });

  describe("clearSlowQueries", () => {
    test("clears all queries from buffer", () => {
      logSlowQuery({
        model: "Person",
        operation: "findMany",
        duration: 1500,
        timestamp: new Date(),
      });

      expect(getSlowQueries()).toHaveLength(1);

      clearSlowQueries();

      expect(getSlowQueries()).toHaveLength(0);
    });
  });

  describe("sanitizeQueryParams", () => {
    test("returns undefined for null/undefined", () => {
      expect(sanitizeQueryParams(null)).toBeUndefined();
      expect(sanitizeQueryParams(undefined)).toBeUndefined();
    });

    test("returns undefined for non-objects", () => {
      expect(sanitizeQueryParams("string")).toBeUndefined();
      expect(sanitizeQueryParams(123)).toBeUndefined();
    });

    test("sanitizes where clauses", () => {
      const params = {
        where: { id: "123", name: "Test" },
      };

      const sanitized = sanitizeQueryParams(params);

      expect(sanitized).toBeDefined();
      expect(sanitized?.where).toEqual({ id: "123", name: "Test" });
    });

    test("redacts password fields", () => {
      const params = {
        where: { password: "secret123", email: "test@example.com" },
      };

      const sanitized = sanitizeQueryParams(params);

      expect(sanitized).toBeDefined();
      expect((sanitized?.where as Record<string, string>)?.password).toBe(
        "[REDACTED]"
      );
      expect((sanitized?.where as Record<string, string>)?.email).toBe(
        "test@example.com"
      );
    });

    test("redacts passwordHash fields", () => {
      const params = {
        where: { passwordHash: "hash123" },
      };

      const sanitized = sanitizeQueryParams(params);

      expect(sanitized).toBeDefined();
      expect((sanitized?.where as Record<string, string>)?.passwordHash).toBe(
        "[REDACTED]"
      );
    });

    test("truncates long strings", () => {
      const longString = "a".repeat(150);
      const params = {
        where: { description: longString },
      };

      const sanitized = sanitizeQueryParams(params);

      expect(sanitized).toBeDefined();
      const desc = (sanitized?.where as Record<string, string>)?.description;
      expect(desc?.length).toBeLessThan(150);
      expect(desc?.endsWith("...")).toBe(true);
    });

    test("truncates large arrays", () => {
      const params = {
        where: { id: { in: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } },
      };

      const sanitized = sanitizeQueryParams(params);

      expect(sanitized).toBeDefined();
      const inArray = (
        (sanitized?.where as Record<string, unknown>)?.id as Record<
          string,
          unknown
        >
      )?.in as unknown[];
      expect(inArray?.length).toBe(6); // 5 items + "...and X more"
    });

    test("only includes safe keys", () => {
      const params = {
        where: { id: "123" },
        select: { name: true },
        include: { relations: true },
        orderBy: { name: "asc" },
        take: 10,
        skip: 5,
        data: { sensitiveField: "value" }, // Should be excluded
        unsafeKey: "should be excluded",
      };

      const sanitized = sanitizeQueryParams(params);

      expect(sanitized).toBeDefined();
      expect(sanitized?.where).toBeDefined();
      expect(sanitized?.select).toBeDefined();
      expect(sanitized?.include).toBeDefined();
      expect(sanitized?.orderBy).toBeDefined();
      expect(sanitized?.take).toBeDefined();
      expect(sanitized?.skip).toBeDefined();
      expect(sanitized?.data).toBeUndefined();
      expect(sanitized?.unsafeKey).toBeUndefined();
    });
  });

  describe("SLOW_QUERY_LOG_THRESHOLD_MS", () => {
    test("is defined and is a positive number", () => {
      expect(SLOW_QUERY_LOG_THRESHOLD_MS).toBeDefined();
      expect(typeof SLOW_QUERY_LOG_THRESHOLD_MS).toBe("number");
      expect(SLOW_QUERY_LOG_THRESHOLD_MS).toBeGreaterThan(0);
    });

    test("is set to 1000ms", () => {
      expect(SLOW_QUERY_LOG_THRESHOLD_MS).toBe(1000);
    });
  });
});
