/**
 * Test setup file
 *
 * This file is loaded before tests run to set up global test configuration.
 *
 * Key behaviors:
 * 1. Initializes i18n for translation tests
 *    - Client-side i18n (react-i18next) is initialized via the app's config
 *    - Server-side i18n is initialized for server function tests
 *    - Tests should NOT mock ./i18n to avoid breaking other tests
 *
 * 2. Logger is NOT mocked globally
 *    - The real logger works fine in tests
 *    - Individual test files can import mocks from ./shared-mocks if needed
 */

import path from "node:path";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { initializeServerI18n, setLocalesPath } from "@vamsa/lib/server";

// Initialize client-side i18n (react-i18next) so useTranslation() works in component tests
import "../../src/i18n/config";

// Clean up DOM between tests to prevent "Found multiple elements" errors
afterEach(() => {
  cleanup();
});

// Set locales path relative to this file (apps/web/tests/setup/test-logger-mock.ts)
// Locales are at: apps/web/src/i18n/locales/{{lng}}/{{ns}}.json
// Relative path from this file: ../../src/i18n/locales/{{lng}}/{{ns}}.json
setLocalesPath(
  path.resolve(
    import.meta.dirname,
    "../../src/i18n/locales/{{lng}}/{{ns}}.json"
  )
);

// Initialize server-side i18n once at setup
await initializeServerI18n();
