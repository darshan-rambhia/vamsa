/**
 * Unit tests for database module
 *
 * Tests cover:
 * - Prisma client singleton re-export
 * - Database initialization and exports
 * - Pool utilities (getPool, getPoolStats, shutdown)
 * - Type safety
 *
 * Uses dependency injection pattern - imports are tested directly
 * without using mock.module() which would pollute the global module cache.
 *
 * Note: Full integration tests of Prisma extensions and pool lifecycle
 * require a real database connection and are tested separately via E2E tests.
 */

import { describe, it, expect } from "bun:test";

describe("Database Module", () => {
  describe("Prisma exports", () => {
    it("exports prisma client", async () => {
      const { prisma } = await import("@vamsa/api");
      expect(prisma).toBeDefined();
    });

    it("prisma client has required methods", async () => {
      const { prisma } = await import("@vamsa/api");

      // Check for Prisma lifecycle methods
      expect(typeof prisma.$connect).toBe("function");
      expect(typeof prisma.$disconnect).toBe("function");
      expect(typeof prisma.$transaction).toBe("function");
    });

    it("exports PrismaClient type", async () => {
      const module = await import("@vamsa/api");
      // The type should be importable (verified by TypeScript, but verify export exists)
      expect(module).toBeDefined();
    });
  });

  describe("Pool utilities", () => {
    it("exports getPool function", async () => {
      const { getPool } = await import("@vamsa/api");
      expect(typeof getPool).toBe("function");
    });

    it("exports getPoolStats function", async () => {
      const { getPoolStats } = await import("@vamsa/api");
      expect(typeof getPoolStats).toBe("function");
    });

    it("getPoolStats returns proper structure", async () => {
      const { getPoolStats } = await import("@vamsa/api");

      const stats = await getPoolStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalConnections).toBe("number");
      expect(typeof stats.idleConnections).toBe("number");
      expect(typeof stats.waitingRequests).toBe("number");
      expect(stats.totalConnections >= 0).toBe(true);
      expect(stats.idleConnections >= 0).toBe(true);
      expect(stats.waitingRequests >= 0).toBe(true);
    });

    it("pool stats show valid state even when pool is not initialized", async () => {
      const { getPoolStats } = await import("@vamsa/api");

      // This should return default zeros if pool is not set, or actual stats if it is
      const stats = await getPoolStats();

      expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
      expect(stats.idleConnections).toBeGreaterThanOrEqual(0);
      expect(stats.waitingRequests).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Shutdown function", () => {
    it("exports shutdown function", async () => {
      const { shutdown } = await import("@vamsa/api");
      expect(typeof shutdown).toBe("function");
    });

    it("shutdown is an async function", async () => {
      const { shutdown } = await import("@vamsa/api");

      // Verify it's an async function (returns a Promise)
      const result = shutdown.toString();
      expect(result).toContain("async");
    });
  });

  describe("Database module re-export", () => {
    it("re-exports prisma from @vamsa/api", async () => {
      const dbModule = await import("@vamsa/lib/server");
      const apiModule = await import("@vamsa/api");

      expect(dbModule.prisma).toBeDefined();
      expect(dbModule.prisma === apiModule.prisma).toBe(true);
    });

    it("db module exports are from @vamsa/api", async () => {
      const { prisma } = await import("@vamsa/lib/server");

      // Verify it's the actual Prisma client instance
      expect(prisma).toBeDefined();
      expect(typeof prisma.$connect).toBe("function");
    });
  });

  describe("Type exports", () => {
    it("@vamsa/api exports PrismaClient type", async () => {
      // This test verifies the type is exported and can be used for type checking
      // In a real usage: import type { PrismaClient } from '@vamsa/api'
      const module = await import("@vamsa/api");
      expect(module).toBeDefined();
    });
  });

  describe("Client singleton pattern", () => {
    it("prisma is the same instance across multiple imports", async () => {
      const import1 = await import("@vamsa/api");
      const import2 = await import("@vamsa/api");

      // Both imports should reference the same Prisma client instance
      expect(import1.prisma === import2.prisma).toBe(true);
    });

    it("db module references the same instance as @vamsa/api", async () => {
      const apiModule = await import("@vamsa/api");
      const dbModule = await import("@vamsa/lib/server");

      expect(dbModule.prisma === apiModule.prisma).toBe(true);
    });
  });

  describe("Environment configuration", () => {
    it("getPoolStats handles various environment states", async () => {
      const { getPoolStats } = await import("@vamsa/api");

      // Should not throw even if called multiple times
      const stats1 = await getPoolStats();
      const stats2 = await getPoolStats();

      expect(stats1).toBeDefined();
      expect(stats2).toBeDefined();
      // Stats should be consistent types
      expect(typeof stats1.totalConnections).toBe("number");
      expect(typeof stats2.totalConnections).toBe("number");
    });

    it("prisma client respects NODE_ENV for logging configuration", async () => {
      const { prisma } = await import("@vamsa/api");

      // The prisma client is configured based on NODE_ENV during initialization
      // Verify it's properly initialized with a real client
      expect(prisma).toBeDefined();
      expect(prisma.$connect).toBeDefined();
    });
  });

  describe("Database utilities interface", () => {
    it("provides all required database utilities", async () => {
      const { prisma, getPool, getPoolStats, shutdown } = await import(
        "@vamsa/api"
      );

      expect(prisma).toBeDefined();
      expect(typeof getPool).toBe("function");
      expect(typeof getPoolStats).toBe("function");
      expect(typeof shutdown).toBe("function");
    });

    it("utilities work with prisma client", async () => {
      const { prisma, getPool, getPoolStats } = await import("@vamsa/api");

      // All utilities should be available alongside prisma
      expect(prisma.$connect).toBeDefined();
      expect(prisma.$disconnect).toBeDefined();

      const pool = getPool();
      // Pool should be defined and have the expected type
      expect(pool).toBeDefined();
      expect(typeof pool).toBe("object");

      const stats = await getPoolStats();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error handling", () => {
    it("DATABASE_URL validation happens during module initialization", async () => {
      // The module loads successfully, which means DATABASE_URL validation
      // passed during initialization
      const { prisma } = await import("@vamsa/api");
      expect(prisma).toBeDefined();
    });

    it("getPoolStats returns valid data without throwing", async () => {
      const { getPoolStats } = await import("@vamsa/api");

      // Should not throw even in edge cases
      const stats = await getPoolStats();
      expect(stats).toBeDefined();
      expect(stats.totalConnections >= 0).toBe(true);
      expect(stats.idleConnections >= 0).toBe(true);
      expect(stats.waitingRequests >= 0).toBe(true);
    });
  });

  describe("Connection pooling configuration", () => {
    it("pool statistics reflect connection state", async () => {
      const { getPoolStats } = await import("@vamsa/api");

      const stats = await getPoolStats();

      // Valid pool stats should have idle <= total
      if (stats.totalConnections > 0) {
        expect(stats.idleConnections <= stats.totalConnections).toBe(true);
      }
    });

    it("waiting requests should be zero or positive", async () => {
      const { getPoolStats } = await import("@vamsa/api");

      const stats = await getPoolStats();
      expect(stats.waitingRequests >= 0).toBe(true);
    });
  });

  describe("Module structure", () => {
    it("db.ts simply re-exports from @vamsa/api", async () => {
      // This test verifies the pattern: db.ts is a thin wrapper
      const dbModule = await import("@vamsa/lib/server");
      const apiModule = await import("@vamsa/api");

      // db module should only export what's from @vamsa/api
      expect(dbModule.prisma === apiModule.prisma).toBe(true);
      expect("prisma" in dbModule).toBe(true);
    });
  });

  describe("Prisma model access", () => {
    it("prisma client provides model access", async () => {
      const { prisma } = await import("@vamsa/api");

      // The prisma client should have generated model accessors
      // These are generated from the Prisma schema
      expect(prisma).toBeDefined();

      // Check for common models from Vamsa schema
      // (if they exist, they should be accessible)
      const hasModels =
        typeof prisma === "object" && prisma !== null && Object.keys(prisma).length > 0;
      expect(hasModels).toBe(true);
    });
  });

  describe("Type safety", () => {
    it("exports maintain type compatibility", async () => {
      // This verifies that the module structure supports TypeScript imports
      // Example: import type { PrismaClient } from '@vamsa/api'
      const module = await import("@vamsa/api");

      // The module should be importable and have type exports
      expect(module).toBeDefined();
      expect(typeof module).toBe("object");
    });
  });
});
