/**
 * Test setup file
 *
 * This file is loaded before tests run to set up global test configuration.
 *
 * Key behaviors:
 * 1. Mocks the logger module globally using shared mocks from shared-mocks.ts
 *    - Uses mock functions that can be verified in tests
 *    - Tests import mockLogger, mockLoggers, etc. from shared-mocks
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

// Import shared mocks - these are the same objects that test files import
import {
  mockLogger,
  mockLog,
  mockLoggers,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../src/testing/shared-mocks";

// Mock logger module using shared mocks
// This ensures test files can verify calls on the same mock objects
mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  log: mockLog,
  loggers: mockLoggers,
  createLogger: () => mockLog,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
  serializeError: mockSerializeError,
}));

// Also mock the direct path in case some files use it
mock.module("../../src/logger", () => ({
  logger: mockLogger,
  log: mockLog,
  loggers: mockLoggers,
  createLogger: () => mockLog,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
  serializeError: mockSerializeError,
}));

// Closure variables for configurable mock results
// Tests can modify these via setFindFirstResult/setFindManyResults
let mockFindFirstResult: unknown = null;
let mockFindManyResults: Array<unknown> = [];

// Create a generic query namespace with configurable results
const createQueryNamespace = () => ({
  findFirst: mock(async () => mockFindFirstResult),
  findMany: mock(async () => mockFindManyResults),
});

// Create mock insert chain
const createMockInsertChain = () => ({
  values: mock(() => ({
    returning: mock(() => Promise.resolve([])),
  })),
});

// Create mock update chain
const createMockUpdateChain = () => ({
  set: mock(() => ({
    where: mock(() => Promise.resolve()),
  })),
});

// Create mock delete chain
const createMockDeleteChain = () => ({
  where: mock(() => Promise.resolve()),
});

// Create a mock Drizzle db with configurable query results
// All query namespaces share the same configurable result variables
const mockDrizzleDb = {
  select: mock(() => ({
    from: mock(() => ({
      where: mock(() => ({
        orderBy: mock(() => ({
          limit: mock(() => ({
            offset: mock(() => Promise.resolve([])),
          })),
        })),
        limit: mock(() => Promise.resolve([])),
      })),
      leftJoin: mock(() => ({
        where: mock(() => ({
          orderBy: mock(() => ({
            limit: mock(() => ({
              offset: mock(() => Promise.resolve([])),
            })),
          })),
        })),
      })),
    })),
  })),
  insert: mock(() => createMockInsertChain()),
  update: mock(() => createMockUpdateChain()),
  delete: mock(() => createMockDeleteChain()),
  transaction: mock((fn: (tx: unknown) => Promise<unknown>) =>
    fn(mockDrizzleDb)
  ),
  // Query API - all namespaces share the same configurable result variables
  // Tests can override specific namespace methods if needed:
  //   mockDrizzleDb.query.calendarTokens.findFirst = mock(async () => customResult)
  query: {
    // Core entities
    users: createQueryNamespace(),
    persons: createQueryNamespace(),
    relationships: createQueryNamespace(),
    events: createQueryNamespace(),
    places: createQueryNamespace(),
    // Additional entities
    suggestions: createQueryNamespace(),
    calendarTokens: createQueryNamespace(),
    auditLogs: createQueryNamespace(),
    familySettings: createQueryNamespace(),
    sources: createQueryNamespace(),
    eventSources: createQueryNamespace(),
    placePersonLinks: createQueryNamespace(),
    mediaObjects: createQueryNamespace(),
    backups: createQueryNamespace(),
    invites: createQueryNamespace(),
    accounts: createQueryNamespace(),
    sessions: createQueryNamespace(),
    verifications: createQueryNamespace(),
    researchNotes: createQueryNamespace(),
    emailLogs: createQueryNamespace(),
  },
  // Helper methods for tests to configure results
  // These set the closure variables used by ALL query namespaces
  setFindFirstResult: (result: unknown) => {
    mockFindFirstResult = result;
  },
  setFindManyResults: (results: Array<unknown>) => {
    mockFindManyResults = results;
  },
};

// Create a mock schema that returns empty objects for any column access
// Uses Proxy to return empty objects for any property, avoiding need to define every column
const createMockTable = () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        // Return an empty object for any property access (column references)
        // This allows drizzle queries like eq(drizzleSchema.users.email, value) to work
        if (typeof prop === "string") {
          return {};
        }
        return undefined;
      },
    }
  );

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
  placePersonLinks: createMockTable(),
  eventSources: createMockTable(),
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
export {
  mockLogger,
  mockLog,
  mockLoggers,
  mockSerializeError,
  clearAllMocks,
} from "../../src/testing/shared-mocks";

// Export the mock Drizzle db for tests that need to configure it
export { mockDrizzleDb };
