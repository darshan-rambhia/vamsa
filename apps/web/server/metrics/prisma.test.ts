/**
 * Tests for Prisma query performance metrics
 *
 * These tests verify that the metrics helper functions work correctly
 * and produce well-formed metric attributes.
 */

import { describe, test, expect } from "bun:test";
import {
  recordPrismaQuery,
  recordPrismaError,
  getPrismaErrorType,
  SLOW_QUERY_THRESHOLD_MS,
} from "./prisma";

describe("Prisma Metrics", () => {
  describe("recordPrismaQuery", () => {
    test("does not throw when recording a successful query", () => {
      expect(() => {
        recordPrismaQuery("Person", "findMany", 50, true, 10);
      }).not.toThrow();
    });

    test("does not throw when recording a failed query", () => {
      expect(() => {
        recordPrismaQuery("Person", "create", 100, false);
      }).not.toThrow();
    });

    test("does not throw when recording without result count", () => {
      expect(() => {
        recordPrismaQuery("User", "findUnique", 25, true);
      }).not.toThrow();
    });

    test("handles various Prisma models", () => {
      const models = [
        "Person",
        "Relationship",
        "User",
        "Session",
        "Event",
        "Place",
        "MediaObject",
      ];
      for (const model of models) {
        expect(() => {
          recordPrismaQuery(model, "findMany", 10, true);
        }).not.toThrow();
      }
    });

    test("handles various Prisma operations", () => {
      const operations = [
        "findMany",
        "findUnique",
        "findFirst",
        "create",
        "createMany",
        "update",
        "updateMany",
        "delete",
        "deleteMany",
        "upsert",
        "aggregate",
        "groupBy",
        "count",
      ];
      for (const op of operations) {
        expect(() => {
          recordPrismaQuery("Person", op, 10, true);
        }).not.toThrow();
      }
    });

    test("handles slow queries without error", () => {
      expect(() => {
        // Query exceeding slow threshold
        recordPrismaQuery(
          "Person",
          "findMany",
          SLOW_QUERY_THRESHOLD_MS + 500,
          true
        );
      }).not.toThrow();
    });

    test("handles zero duration", () => {
      expect(() => {
        recordPrismaQuery("Person", "findUnique", 0, true);
      }).not.toThrow();
    });

    test("handles large result counts", () => {
      expect(() => {
        recordPrismaQuery("Person", "findMany", 100, true, 10000);
      }).not.toThrow();
    });
  });

  describe("recordPrismaError", () => {
    test("does not throw when recording an error", () => {
      expect(() => {
        recordPrismaError("Person", "create", "P2002");
      }).not.toThrow();
    });

    test("handles Prisma error codes", () => {
      const errorCodes = [
        "P2000", // Value too long
        "P2001", // Record not found
        "P2002", // Unique constraint violation
        "P2003", // Foreign key constraint violation
        "P2025", // Record not found
      ];
      for (const code of errorCodes) {
        expect(() => {
          recordPrismaError("Person", "create", code);
        }).not.toThrow();
      }
    });

    test("handles generic error types", () => {
      const errorTypes = [
        "ValidationError",
        "TypeError",
        "ConnectionError",
        "UnknownError",
      ];
      for (const type of errorTypes) {
        expect(() => {
          recordPrismaError("Person", "update", type);
        }).not.toThrow();
      }
    });
  });

  describe("getPrismaErrorType", () => {
    test("extracts Prisma error code", () => {
      const error = new Error("Unique constraint failed");
      (error as Error & { code: string }).code = "P2002";

      expect(getPrismaErrorType(error)).toBe("P2002");
    });

    test("returns error name when no code is present", () => {
      const error = new TypeError("Invalid argument");

      expect(getPrismaErrorType(error)).toBe("TypeError");
    });

    test("returns UnknownError for non-Error objects", () => {
      expect(getPrismaErrorType("string error")).toBe("UnknownError");
      expect(getPrismaErrorType(null)).toBe("UnknownError");
      expect(getPrismaErrorType(undefined)).toBe("UnknownError");
      expect(getPrismaErrorType(123)).toBe("UnknownError");
    });

    test("handles Error with non-string code", () => {
      const error = new Error("Test error");
      (error as Error & { code: number }).code = 123;

      // Should fall back to error name since code is not a string
      expect(getPrismaErrorType(error)).toBe("Error");
    });
  });

  describe("SLOW_QUERY_THRESHOLD_MS", () => {
    test("is defined and is a positive number", () => {
      expect(SLOW_QUERY_THRESHOLD_MS).toBeDefined();
      expect(typeof SLOW_QUERY_THRESHOLD_MS).toBe("number");
      expect(SLOW_QUERY_THRESHOLD_MS).toBeGreaterThan(0);
    });

    test("is set to 1000ms", () => {
      expect(SLOW_QUERY_THRESHOLD_MS).toBe(1000);
    });
  });
});
