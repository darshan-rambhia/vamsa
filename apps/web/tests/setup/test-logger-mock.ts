/**
 * Test setup file
 *
 * This file is loaded before tests run to set up global test configuration.
 *
 * Key behaviors:
 * 1. Mocks @vamsa/lib/logger globally using shared mock implementation
 *    - All test files should use the shared mockLogger from ./shared-mocks
 *    - This prevents mock.module() pollution between test files
 *
 * 2. Initializes i18n for translation tests
 *    - i18n is initialized once at setup
 *    - Tests should NOT mock ./i18n to avoid breaking other tests
 *
 * 3. @tanstack/react-start/server mocking is handled via try-catch in
 *    src/server/test-helpers/react-start-server.ts instead of here.
 */

import { mock } from "bun:test";
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "./shared-mocks";
import { initializeServerI18n } from "@vamsa/lib/server";

// Mock logger globally BEFORE any modules are imported
// This ensures consistent mock behavior across all test files
mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

// Initialize i18n once at setup - this happens before any tests or mocks
await initializeServerI18n();

// Re-export the mocks so test files can import them
export { mockLogger, mockSerializeError, clearAllMocks } from "./shared-mocks";

