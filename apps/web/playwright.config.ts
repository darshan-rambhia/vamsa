import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";

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
const webServerConfig = {
  command: "bun run dev",
  url: baseURL,
  timeout: 120 * 1000,
  reuseExistingServer: !process.env.CI,
  // Show logs when PLAYWRIGHT_LOGS=true, otherwise suppress them ("ignore")
  stdout: shouldShowServerLogs ? ("pipe" as const) : ("ignore" as const),
  stderr: shouldShowServerLogs ? ("pipe" as const) : ("ignore" as const),
  env: {
    ...process.env,
    // Force test database URL (override any .env setting)
    DATABASE_URL:
      "postgresql://vamsa_test:vamsa_test@localhost:5433/vamsa_test",
    // Disable rate limiting for E2E tests to prevent flaky tests
    E2E_TESTING: "true",
  },
};

/**
 * Playwright configuration for Vamsa E2E tests
 *
 * OPTIMIZATION: Currently running Chromium-only for faster execution (92% speedup).
 * - 2,052 runs (158 tests × 12 projects) → 158 runs
 * - 45-60 min → 3-4 min execution time
 *
 * Additional browsers/devices commented out because:
 * - No React Native app exists (mobile testing not needed yet)
 * - ReactFlow tests too superficial to catch WebKit-specific issues currently
 * - Responsive design better tested with visual regression tools
 * - Can add browsers back when specific cross-browser issues arise
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
    // Desktop browsers - Chromium only (optimized for speed)
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
