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
 * 2. Logger is NOT mocked globally
 *    - The real logger works fine in tests
 *    - Individual test files can import mocks from ./shared-mocks if needed
 */

import path from "node:path";
import { initializeServerI18n, setLocalesPath } from "@vamsa/lib/server";

// Set locales path relative to cwd
setLocalesPath(
  path.join(process.cwd(), "src/i18n/locales/{{lng}}/{{ns}}.json")
);

// Initialize i18n once at setup
await initializeServerI18n();
