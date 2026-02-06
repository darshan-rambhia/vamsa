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

import { vi, afterAll } from "vitest";
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
vi.mock("@vamsa/lib/logger", () => ({
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
vi.mock("../../src/logger", () => ({
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
  findFirst: vi.fn(async () => mockFindFirstResult),
  findMany: vi.fn(async () => mockFindManyResults),
});

// Create mock insert chain
const createMockInsertChain = () => ({
  values: vi.fn(() => ({
    returning: vi.fn(() => Promise.resolve([])),
  })),
});

// Create mock update chain
const createMockUpdateChain = () => ({
  set: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve()),
  })),
});

// Create mock delete chain
const createMockDeleteChain = () => ({
  where: vi.fn(() => Promise.resolve()),
});

// Create a mock Drizzle db with configurable query results
// All query namespaces share the same configurable result variables
const mockDrizzleDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => Promise.resolve([])),
          })),
        })),
        limit: vi.fn(() => Promise.resolve([])),
      })),
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      })),
    })),
  })),
  insert: vi.fn(() => createMockInsertChain()),
  update: vi.fn(() => createMockUpdateChain()),
  delete: vi.fn(() => createMockDeleteChain()),
  transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
    fn(mockDrizzleDb)
  ),
  // Query API - all namespaces share the same configurable result variables
  // Tests can override specific namespace methods if needed:
  //   mockDrizzleDb.query.calendarTokens.findFirst = vi.fn(async () => customResult)
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
    eventParticipants: createQueryNamespace(),
  },
  // Helper methods for tests to configure results
  // These set the closure variables used by ALL query namespaces
  setFindFirstResult: (result: unknown) => {
    mockFindFirstResult = result;
  },
  setFindManyResults: (results: Array<unknown>) => {
    mockFindManyResults = results;
  },
  // Reset all query namespaces to use the closure variables again
  // Call this in beforeEach if any test replaces query methods directly
  resetQueryMocks: () => {
    mockFindFirstResult = null;
    mockFindManyResults = [];
    // Reset all query namespaces to read from closure variables
    const namespaces = [
      "users",
      "persons",
      "relationships",
      "events",
      "places",
      "suggestions",
      "calendarTokens",
      "auditLogs",
      "familySettings",
      "sources",
      "eventSources",
      "placePersonLinks",
      "mediaObjects",
      "backups",
      "invites",
      "accounts",
      "sessions",
      "verifications",
      "researchNotes",
      "emailLogs",
      "eventParticipants",
    ] as const;
    for (const ns of namespaces) {
      mockDrizzleDb.query[ns].findFirst = vi.fn(
        async () => mockFindFirstResult
      );
      mockDrizzleDb.query[ns].findMany = vi.fn(async () => mockFindManyResults);
    }
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
  eventParticipants: createMockTable(),
};

// Mock @vamsa/api to prevent real database initialization
// Include all exports to prevent import errors
vi.mock("@vamsa/api", () => ({
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

// Mock better-auth library to prevent real auth initialization in tests
vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({
    api: {
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
      getSession: vi.fn(),
      changePassword: vi.fn(),
      signOut: vi.fn(),
    },
  })),
}));

// Mock better-auth plugins
vi.mock("better-auth/plugins", () => ({
  bearer: vi.fn(() => ({})),
  genericOAuth: vi.fn(() => ({})),
}));

// Mock better-auth adapters
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: vi.fn(() => ({})),
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
