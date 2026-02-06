import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env files (monorepo root)
// .env.test overrides .env with test-specific values
config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});
config({
  path: path.resolve(__dirname, "../../.env.test"),
  override: true,
  quiet: true,
});

// In Docker, IN_DOCKER=true is set by docker-compose
// Locally, we start the server ourselves on localhost
const isDocker = process.env.IN_DOCKER === "true";
const baseURL =
  process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

// Determine if we should show server logs
const shouldShowServerLogs = process.env.PLAYWRIGHT_LOGS === "true";

// Build webServer config - only used when NOT in Docker
// In Docker, the app container is started by docker-compose
const webServerConfig = isDocker
  ? undefined
  : {
      // Use direct bun command for local development
      command: "bun run server/index.ts",
      url: baseURL,
      timeout: 120 * 1000,
      reuseExistingServer: true,
      cwd: __dirname,
      stdout: shouldShowServerLogs ? ("pipe" as const) : ("ignore" as const),
      stderr: shouldShowServerLogs ? ("pipe" as const) : ("ignore" as const),
      // Test env vars loaded from .env.test + E2E flag
      // Filter out undefined values to satisfy Playwright's type requirements
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            (entry): entry is [string, string] => entry[1] !== undefined
          )
        ),
        // Match CI: server runs in test mode with rate limiting disabled
        NODE_ENV: "test",
        E2E_TESTING: "true",
      },
    };

// Shared configuration for browsers that need extended timeouts (Firefox, WebKit)
const EXTENDED_BROWSER_USE = {
  actionTimeout: 15000,
  navigationTimeout: 30000,
  ignoreHTTPSErrors: true,
};

const EXTENDED_PROJECT_CONFIG = {
  timeout: 45 * 1000,
  retries: 3,
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
  retries: 2,
  // Use fewer workers in CI to prevent browser crashes from memory pressure
  // Docker containers have limited resources; 15 parallel browsers causes OOM
  workers: process.env.CI ? 2 : 15,
  fullyParallel: true,
  outputDir: "../../test-output/e2e/results/",
  snapshotDir: path.join(__dirname, "e2e/visual/__snapshots__"),
  snapshotPathTemplate: "{snapshotDir}/{testFileDir}/{arg}-{platform}{ext}",
  reporter: [
    ["html", { outputFolder: "../../test-output/e2e/playwright/" }],
    ["list"],
    ["json", { outputFile: "../../test-output/e2e/results.json" }],
  ],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  // Only start webServer when running locally (not in Docker)
  ...(webServerConfig && { webServer: webServerConfig }),

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
      use: {
        ...devices["Desktop Chrome"],
        // Disable HSTS/security features that redirect HTTP to HTTPS in Docker
        launchOptions: {
          args: [
            "--disable-web-security",
            "--allow-running-insecure-content",
            "--disable-features=IsolateOrigins,site-per-process",
          ],
        },
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        ...EXTENDED_BROWSER_USE,
        storageState: path.join(__dirname, "e2e/.auth/admin-webkit.json"),
      },
      ...EXTENDED_PROJECT_CONFIG,
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        ...EXTENDED_BROWSER_USE,
        storageState: path.join(__dirname, "e2e/.auth/admin-firefox.json"),
        // Firefox-specific: disable HSTS via user preferences
        launchOptions: {
          firefoxUserPrefs: {
            "security.mixed_content.block_active_content": false,
            "security.mixed_content.block_display_content": false,
            "network.stricttransportsecurity.preloadlist": false,
            "security.cert_pinning.enforcement_level": 0,
          },
        },
      },
      ...EXTENDED_PROJECT_CONFIG,
    },
    // Visual regression tests
    {
      name: "visual",
      testMatch: "**/visual/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        // Disable HSTS/security features that redirect HTTP to HTTPS in Docker
        launchOptions: {
          args: [
            "--disable-web-security",
            "--allow-running-insecure-content",
            "--disable-features=IsolateOrigins,site-per-process",
          ],
        },
        // Consistent viewport for visual tests
        viewport: { width: 1280, height: 720 },
      },
    },
    // Performance tests
    {
      name: "performance",
      testMatch: "**/performance/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        // Disable HSTS/security features that redirect HTTP to HTTPS in Docker
        launchOptions: {
          args: [
            "--disable-web-security",
            "--allow-running-insecure-content",
            "--disable-features=IsolateOrigins,site-per-process",
          ],
        },
        // Standard viewport for consistent performance measurements
        viewport: { width: 1280, height: 720 },
      },
      // Relaxed timeout for performance tests (more time for metrics collection)
      timeout: 45 * 1000,
    },
  ],
});
