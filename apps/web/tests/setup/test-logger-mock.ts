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

import { initializeServerI18n, setLocalesPath } from "@vamsa/lib/server";
import path from "path";

// Set locales path relative to cwd - works for both direct runs and Stryker sandbox
// In both cases, src/i18n/locales/ exists at the current working directory
setLocalesPath(
  path.join(process.cwd(), "src/i18n/locales/{{lng}}/{{ns}}.json")
);

// Initialize i18n once at setup - this happens before any tests or mocks
await initializeServerI18n();

// Re-export the mocks so test files can import them if needed
export {
  mockLogger,
  mockLog,
  mockLoggers,
  mockDomainLogger,
  mockWithErr,
  mockWithErrBuilder,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
  clearAllMocks,
} from "./shared-mocks";
