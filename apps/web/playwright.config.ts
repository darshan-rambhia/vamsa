import { defineConfig, devices } from "@playwright/test";
import path from "path";

const PORT = process.env.PORT || 3000;
const baseURL = `http://localhost:${PORT}`;

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
  workers: process.env.CI ? 2 : 1,
  fullyParallel: false,
  outputDir: "test-output/results/",
  reporter: [
    ["html", { outputFolder: "test-output/playwright/" }],
    ["list"],
    ["json", { outputFile: "test-output/results.json" }],
  ],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  webServer: {
    command: "bun run dev",
    url: baseURL,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },

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
    {
      name: "tablet-ipad",
      use: { ...devices["iPad Pro"] },
    },
    {
      name: "tablet-android",
      use: { ...devices["Galaxy Tab S4"] },
    },

    // Mobile devices
    {
      name: "mobile-iphone",
      use: { ...devices["iPhone 14 Pro"] },
    },
    {
      name: "mobile-android",
      use: { ...devices["Pixel 7"] },
    },

    // Responsive breakpoints for design system testing
    {
      name: "viewport-sm",
      use: {
        viewport: { width: 640, height: 900 },
        userAgent: "Playwright/Viewport-SM",
      },
    },
    {
      name: "viewport-md",
      use: {
        viewport: { width: 768, height: 1024 },
        userAgent: "Playwright/Viewport-MD",
      },
    },
    {
      name: "viewport-lg",
      use: {
        viewport: { width: 1024, height: 768 },
        userAgent: "Playwright/Viewport-LG",
      },
    },
    {
      name: "viewport-xl",
      use: {
        viewport: { width: 1280, height: 800 },
        userAgent: "Playwright/Viewport-XL",
      },
    },
    {
      name: "viewport-2xl",
      use: {
        viewport: { width: 1536, height: 864 },
        userAgent: "Playwright/Viewport-2XL",
      },
    },
  ],
});
