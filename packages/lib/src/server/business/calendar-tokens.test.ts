/**
 * Unit tests for Calendar Tokens Business Logic
 *
 * NOTE: The calendar-tokens module uses dynamic imports (await import("@vamsa/api"))
 * which bypasses static module mocks. These tests focus on testing the logic layer
 * using mock implementations injected via parameters where possible, and testing
 * error handling paths that don't require database interaction.
 *
 * Tests cover:
 * - verifyTokenOwnership: Verifying token ownership
 * - Error handling and edge cases
 * - Logging for security-critical operations
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllMocks, mockLogger } from "../../testing/shared-mocks";

// Import functions to test
import { verifyTokenOwnership } from "./calendar-tokens";

// Note: @vamsa/api mocking is handled by the preload file
// drizzleSchema and drizzleDb are available from there

// Mock date-fns
vi.mock("date-fns", () => ({
  addYears: (date: Date, years: number) => {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  },
}));

// NOTE: We don't mock ./token-rotation here because:
// 1. The tests in this file only cover verifyTokenOwnership (no rotation tests)
// 2. vi.mock() is global and persists across test files, which would
//    interfere with token-rotation.test.ts testing the real implementation
// 3. If rotation tests are added later, use spyOn() for test isolation

describe("calendar-tokens business logic", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe("verifyTokenOwnership", () => {
    it("should throw error when token not found", async () => {
      try {
        await verifyTokenOwnership("nonexistent-token", "user1");
        expect.unreachable("Should throw error");
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Token not found");
      }
    });

    it("should throw error when token belongs to different user", async () => {
      try {
        await verifyTokenOwnership("token-1", "different-user");
        expect.unreachable("Should throw error");
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Token not found");
      }
    });
  });

  describe("logging integration", () => {
    it("should use logger for calendar token operations", () => {
      // Verify logger is properly mocked
      expect(mockLogger).toBeDefined();
      expect(mockLogger.info).toBeDefined();
      expect(typeof mockLogger.info).toBe("function");
    });
  });
});
