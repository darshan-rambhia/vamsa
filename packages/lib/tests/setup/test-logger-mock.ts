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

// Create a mock Drizzle db that does nothing
const mockDrizzleDb = {
  select: () => ({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: () => ({
            offset: () => Promise.resolve([]),
          }),
        }),
        limit: () => Promise.resolve([]),
      }),
      leftJoin: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              offset: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    }),
  }),
  insert: () => ({
    values: () => ({
      returning: () => Promise.resolve([]),
    }),
  }),
  update: () => ({
    set: () => ({
      where: () => ({
        returning: () => Promise.resolve([]),
      }),
    }),
  }),
  delete: () => ({
    where: () => Promise.resolve(),
  }),
  transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(mockDrizzleDb),
  query: {},
};

// Create a mock schema that returns empty tables
const createMockTable = () => ({
  id: {},
  name: {},
  createdAt: {},
  updatedAt: {},
});

const mockDrizzleSchema = {
  persons: createMockTable(),
  users: createMockTable(),
  invites: createMockTable(),
  relationships: createMockTable(),
  events: createMockTable(),
  places: createMockTable(),
  mediaObjects: createMockTable(),
  backups: createMockTable(),
  familySettings: createMockTable(),
  auditLogs: createMockTable(),
  suggestions: createMockTable(),
  calendarTokens: createMockTable(),
  sources: createMockTable(),
  researchNotes: createMockTable(),
  accounts: createMockTable(),
  sessions: createMockTable(),
  verifications: createMockTable(),
  oauthState: createMockTable(),
  emailLogs: createMockTable(),
};

// Mock @vamsa/api to prevent real database initialization
// Include all exports to prevent import errors
mock.module("@vamsa/api", () => ({
  // Drizzle ORM mocks
  drizzleDb: mockDrizzleDb,
  drizzleSchema: mockDrizzleSchema,
  closeDrizzleDb: () => Promise.resolve(),
  getDrizzlePoolStats: () => ({
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  }),
  // Email service mocks
  emailService: { send: () => Promise.resolve({}) },
  EmailService: class {},
  EMAIL_CONFIG: {},
  DEFAULT_NOTIFICATION_PREFERENCES: {},
  createSuggestionCreatedEmail: () => ({}),
  createSuggestionUpdatedEmail: () => ({}),
  createNewMemberEmail: () => ({}),
  createBirthdayReminderEmail: () => ({}),
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
