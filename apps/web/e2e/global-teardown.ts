/**
 * Playwright Global Teardown
 * Runs once after all tests - cleans up test environment
 */
import type { FullConfig } from "@playwright/test";

async function globalTeardown(_config: FullConfig) {
  console.log("[E2E Teardown] Cleaning up test environment...");

  // Add any global cleanup here:
  // - Clear test databases
  // - Remove test users
  // - Clean up uploaded files

  console.log("[E2E Teardown] Cleanup complete");
}

export default globalTeardown;
