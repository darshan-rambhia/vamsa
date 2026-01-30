import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env files manually (dotenv might not be available in all contexts)
function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  try {
    const envContent = readFileSync(filePath, "utf-8");
    const lines = envContent.split("\n");
    for (const line of lines) {
      const [key, ...valueParts] = line.split("=");
      const trimmedKey = key?.trim();
      if (
        trimmedKey &&
        !trimmedKey.startsWith("#") &&
        !process.env[trimmedKey]
      ) {
        const value = valueParts
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
        process.env[trimmedKey] = value;
      }
    }
  } catch (_err) {
    // Load error, ignore
  }
}

// Load environment variables from .env (monorepo root)
loadEnvFile(path.resolve(__dirname, "../../.env"));

// Load environment variables from .env.local for tests (overrides .env)
loadEnvFile(path.resolve(__dirname, "../../.env.local"));

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

// Determine if we should show server logs
const shouldShowServerLogs = process.env.PLAYWRIGHT_LOGS === "true";

// Build webServer config with conditional stdout/stderr handling
// Both local and CI use production server for consistency
// Database ports differ: CI uses 5432 (GitHub Actions service), local uses 5433 (Docker)
const isCI = !!process.env.CI;
const webServerConfig = {
  // Always use production server - run-e2e.ts handles building locally
  command: "bun run start",
  url: baseURL,
  timeout: 120 * 1000,
  reuseExistingServer: !isCI,
  // Show logs when PLAYWRIGHT_LOGS=true, otherwise suppress them ("ignore")
  stdout: shouldShowServerLogs ? ("pipe" as const) : ("ignore" as const),
  stderr: shouldShowServerLogs ? ("pipe" as const) : ("ignore" as const),
  env: {
    ...process.env,
    // In CI, use DATABASE_URL from environment (set by workflow, port 5432)
    // In local, use Docker database on port 5433
    DATABASE_URL: isCI
      ? (process.env.DATABASE_URL ??
        "postgresql://vamsa_test:vamsa_test@localhost:5432/vamsa_test")
      : "postgresql://vamsa_test:vamsa_test@localhost:5433/vamsa_test",
    // Disable rate limiting for E2E tests to prevent flaky tests
    E2E_TESTING: "true",
  },
};

/**
 * Playwright configuration for Vamsa E2E tests
 *
 * Server Strategy:
 * - Both local and CI use production server (`bun run start`) for consistency
 * - This ensures E2E tests run against the actual deployment configuration
 * - The run-e2e.ts script handles building the app before running tests
 *
 * Browser Strategy:
 * - Local development: Chromium-only by default (fast feedback)
 * - CI: All browsers in parallel via matrix strategy (chromium, firefox, webkit)
 *
 * To run specific browsers locally:
 *   bun test:e2e --project=firefox
 *   bun test:e2e --project=webkit
 *   bun test:e2e --project=chromium --project=firefox
 */
export default defineConfig({
  testDir: path.join(__dirname, "e2e"),
  testMatch: "**/*.e2e.ts",
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  retries: process.env.CI ? 2 : 0,
  workers: 15,
  fullyParallel: true,
  outputDir: "../../test-output/e2e/results/",
  reporter: [
    ["html", { outputFolder: "../../test-output/e2e/playwright/" }],
    ["list"],
    ["json", { outputFile: "../../test-output/e2e/results.json" }],
  ],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  webServer: webServerConfig,

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Default viewport for desktop
    viewport: { width: 1280, height: 720 },
    // Use pre-authenticated admin state by default
    storageState: path.join(__dirname, "e2e/.auth/admin.json"),
  },

  projects: [
    // Desktop browsers
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        // WebKit needs longer timeouts for navigation and actions
        actionTimeout: 15000,
        navigationTimeout: 30000,
        // Use webkit-specific auth state (created by webkit browser in global-setup)
        storageState: path.join(__dirname, "e2e/.auth/admin-webkit.json"),
      },
      // WebKit tests get longer overall timeout and more retries
      timeout: 45 * 1000,
      retries: process.env.CI ? 3 : 1,
    },
    // Firefox browser
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        // Firefox needs longer timeouts for navigation and actions (similar to WebKit)
        actionTimeout: 15000,
        navigationTimeout: 30000,
        // Use firefox-specific auth state (created by firefox browser in global-setup)
        storageState: path.join(__dirname, "e2e/.auth/admin-firefox.json"),
      },
      // Firefox tests get longer overall timeout and more retries
      timeout: 45 * 1000,
      retries: process.env.CI ? 3 : 1,
    },
  ],
});
