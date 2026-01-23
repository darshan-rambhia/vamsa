/**
 * Test setup file
 *
 * This file is loaded before tests run to set up global test configuration.
 *
 * Key behaviors:
 * 1. Mocks the logger module globally to prevent stderr output
 *    - This prevents expected error logs from causing exit code 1
 *    - logger.test.ts tests the actual pino configuration separately
 *
 * 2. Initializes i18n for translation tests
 *    - i18n is initialized once at setup
 *    - Tests should NOT mock ./i18n to avoid breaking other tests
 *
 * 3. @tanstack/react-start/server mocking is handled via try-catch in
 *    src/server/test-helpers/react-start-server.ts instead of here.
 *
 * 4. Cleans up test-generated files in data/uploads after all tests complete
 */

import { mock, afterAll } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";

// Mock logger module to prevent stderr output during tests
// This must happen before any module imports the logger
const noopLogger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => noopLogger,
};

mock.module("@vamsa/lib/logger", () => ({
  logger: noopLogger,
  createContextLogger: () => noopLogger,
  createRequestLogger: () => noopLogger,
  startTimer: () => () => {},
  serializeError: (error: unknown) => {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: (error as Error & { cause?: unknown }).cause,
      };
    }
    return error;
  },
}));

// Also mock the direct path in case some files use it
mock.module("../../src/logger", () => ({
  logger: noopLogger,
  createContextLogger: () => noopLogger,
  createRequestLogger: () => noopLogger,
  startTimer: () => () => {},
  serializeError: (error: unknown) => {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: (error as Error & { cause?: unknown }).cause,
      };
    }
    return error;
  },
}));

// Create a mock Prisma client that does nothing
// This prevents real database connections during tests
const mockPrismaClient = {
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
  $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrismaClient),
  user: {
    findUnique: () => Promise.resolve(null),
    findFirst: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
  },
  person: {
    findUnique: () => Promise.resolve(null),
    findFirst: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
  },
  calendarToken: {
    findUnique: () => Promise.resolve(null),
    findUniqueOrThrow: () => Promise.resolve({}),
    findFirst: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
  },
  // Add other models as needed - tests that use DI will override these anyway
};

// Mock the database module to prevent real Prisma initialization
// This prevents the "Called end on pool more than once" error
mock.module("../src/server/db", () => ({
  prisma: mockPrismaClient,
}));

mock.module("@vamsa/lib/server/db", () => ({
  prisma: mockPrismaClient,
}));

// Initialize i18n once at setup - this happens after mocking
const { initializeServerI18n } = await import("@vamsa/lib/server");
await initializeServerI18n();

// Clean up test-generated upload files after all tests complete
afterAll(async () => {
  const dataDir = join(process.cwd(), "data");
  try {
    await rm(dataDir, { recursive: true, force: true });
  } catch {
    // Directory may not exist, ignore errors
  }
});

// Re-export the mocks so test files can import them if needed
export { mockLogger, mockSerializeError, clearAllMocks } from "./shared-mocks";
