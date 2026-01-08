/**
 * Playwright Global Setup
 * Runs once before all tests - sets up test environment
 */
import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";

  console.log("[E2E Setup] Initializing test environment...");

  // Wait for the server to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let retries = 0;
  const maxRetries = 30;

  while (retries < maxRetries) {
    try {
      const response = await page.goto(baseURL, { timeout: 5000 });
      if (response?.ok()) {
        console.log(`[E2E Setup] Server is ready at ${baseURL}`);
        break;
      }
    } catch {
      retries++;
      if (retries >= maxRetries) {
        console.error(`[E2E Setup] Server failed to start after ${maxRetries} attempts`);
        throw new Error(`Server not available at ${baseURL}`);
      }
      console.log(`[E2E Setup] Waiting for server... (attempt ${retries}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  await browser.close();

  console.log("[E2E Setup] Global setup complete");
}

export default globalSetup;
