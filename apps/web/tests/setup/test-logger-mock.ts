/**
 * Test setup file
 *
 * This file is loaded before tests run to set up global test configuration.
 *
 * Key behaviors:
 * 1. Initializes i18n for translation tests
 *    - i18n is initialized once at setup
 *    - Tests should NOT mock ./i18n to avoid breaking other tests
 *
 * 2. Logger is NOT mocked globally (logger.test.ts needs real implementation)
 *    - Individual test files can mock the logger if needed
 *    - Use mock.module() in specific test files for logger mocks
 *
 * 3. @tanstack/react-start/server mocking is handled via try-catch in
 *    src/server/test-helpers/react-start-server.ts instead of here.
 */

import { initializeServerI18n } from "@vamsa/lib/server";

// Initialize i18n once at setup - this happens before any tests or mocks
await initializeServerI18n();

// Re-export the mocks so test files can import them if needed
export { mockLogger, mockSerializeError, clearAllMocks } from "./shared-mocks";

