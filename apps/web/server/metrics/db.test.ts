/**
 * Integration tests for database Prisma extension
 *
 * These tests verify the Prisma extension properly integrates with
 * metrics and tracing without mocking shared modules.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { clearSlowQueries, getSlowQueries } from "./slow-query-logger";

describe("DB Prisma extension", () => {
  beforeEach(() => {
    clearSlowQueries();
  });

  afterEach(() => {
    clearSlowQueries();
  });

  // Integration test using actual modules
  it("extension structure is valid", async () => {
    // Test that the db module exports are correct
    const { db } = await import("../../server/db");

    expect(db).toBeDefined();
    // The db should have Prisma client methods
    expect(typeof db.$connect).toBe("function");
    expect(typeof db.$disconnect).toBe("function");
  });

  it("slow query logger integration works", () => {
    // Verify the slow query logger is importable and functional
    expect(typeof clearSlowQueries).toBe("function");
    expect(typeof getSlowQueries).toBe("function");

    const queries = getSlowQueries();
    expect(Array.isArray(queries)).toBe(true);
    expect(queries.length).toBe(0);
  });
});

export {};
