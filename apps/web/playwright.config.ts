import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local for tests
const envLocalPath = path.resolve(__dirname, "../../.env.local");
try {
  const envContent = readFileSync(envLocalPath, "utf-8");
  const lines = envContent.split("\n");
  for (const line of lines) {
    const [key, ...valueParts] = line.split("=");
    const value = valueParts.join("=").trim();
    if (key && !key.startsWith("#")) {
      process.env[key.trim()] = value.replace(/^["']|["']$/g, "");
    }
  }
} catch (_err) {
  // .env.local not found, that's okay
}

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

// Determine if we're in debug mode
const isDebugMode = process.env.PLAYWRIGHT_DEBUG === "true";

// Build webServer config with conditional stdout/stderr handling
const webServerConfig = {
  command: "bun run dev",
  url: baseURL,
  timeout: 120 * 1000,
  reuseExistingServer: !process.env.CI,
  // In debug mode, show logs ("pipe"), otherwise suppress them ("ignore")
  stdout: isDebugMode ? ("pipe" as const) : ("ignore" as const),
  stderr: isDebugMode ? ("pipe" as const) : ("ignore" as const),
  env: {
    ...process.env,
    // Ensure DATABASE_URL is set for test environment
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://vamsa_test:vamsa_test@localhost:5433/vamsa_test",
  },
};

/**
 * Playwright configuration for Vamsa E2E tests
 * Supports multiple devices and screen sizes for future mobile support
 */
export default defineConfig({
  testDir: path.join(__dirname, "e2e"),
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  retries: process.env.CI ? 2 : 0,
  workers: 7,
  fullyParallel: true,
  outputDir: "test-output/results/",
  reporter: [
    ["html", { outputFolder: "test-output/playwright/" }],
    ["list"],
    ["json", { outputFile: "test-output/results.json" }],
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
  },

  projects: [
    // Desktop browsers
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // Tablet devices
    // {
    //   name: "tablet-ipad",
    //   use: { ...devices["iPad Pro"] },
    // },
    // {
    //   name: "tablet-android",
    //   use: { ...devices["Galaxy Tab S4"] },
    // },

    // // Mobile devices
    // {
    //   name: "mobile-iphone",
    //   use: { ...devices["iPhone 14 Pro"] },
    // },
    // {
    //   name: "mobile-android",
    //   use: { ...devices["Pixel 7"] },
    // },

    // Responsive breakpoints for design system testing
    // {
    //   name: "viewport-sm",
    //   use: {
    //     viewport: { width: 640, height: 900 },
    //     userAgent: "Playwright/Viewport-SM",
    //   },
    // },
    // {
    //   name: "viewport-md",
    //   use: {
    //     viewport: { width: 768, height: 1024 },
    //     userAgent: "Playwright/Viewport-MD",
    //   },
    // },
    // {
    //   name: "viewport-lg",
    //   use: {
    //     viewport: { width: 1024, height: 768 },
    //     userAgent: "Playwright/Viewport-LG",
    //   },
    // },
    // {
    //   name: "viewport-xl",
    //   use: {
    //     viewport: { width: 1280, height: 800 },
    //     userAgent: "Playwright/Viewport-XL",
    //   },
    // },
    // {
    //   name: "viewport-2xl",
    //   use: {
    //     viewport: { width: 1536, height: 864 },
    //     userAgent: "Playwright/Viewport-2XL",
    //   },
    // },
  ],
});
