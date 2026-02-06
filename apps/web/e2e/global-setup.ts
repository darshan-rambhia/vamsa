/**
 * Playwright Global Setup
 * Runs once before all tests - sets up test environment and pre-authenticates users
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "@playwright/test";
import type { BrowserType, FullConfig, Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_CREDENTIALS = {
  email: "admin@test.vamsa.local",
  password: "TestAdmin123!",
};

const MEMBER_CREDENTIALS = {
  email: "member@test.vamsa.local",
  password: "TestMember123!",
};

async function authenticateUser(
  page: Page,
  baseURL: string,
  credentials: { email: string; password: string },
  userType: string
): Promise<void> {
  console.log(`[E2E Setup] Authenticating ${userType} user...`);

  await page.goto(`${baseURL}/login`);

  // Wait for the page to fully load
  await page.waitForLoadState("domcontentloaded", { timeout: 10000 });

  // Wait for login form to be visible
  await page
    .getByTestId("login-form")
    .waitFor({ state: "visible", timeout: 5000 });

  // Fill credentials using pressSequentially for cross-browser compatibility
  const emailInput = page.getByTestId("login-email-input");
  const passwordInput = page.getByTestId("login-password-input");

  await emailInput.click();
  await emailInput.clear();
  await emailInput.pressSequentially(credentials.email, { delay: 20 });

  await passwordInput.click();
  await passwordInput.clear();
  await passwordInput.pressSequentially(credentials.password, { delay: 20 });

  const submitButton = page.getByTestId("login-submit-button");

  // Click the button and wait for navigation to one of the authenticated routes
  try {
    await Promise.all([
      page.waitForURL(/\/(people|dashboard|tree)/, { timeout: 20000 }),
      submitButton.click(),
    ]);
  } catch (navigationError) {
    // Check for login error message on the page
    const loginErrorVisible = await page
      .getByTestId("login-error")
      .isVisible()
      .catch(() => false);
    if (loginErrorVisible) {
      const errorText = await page.getByTestId("login-error").textContent();
      throw new Error(`Login failed with server error: ${errorText}`);
    }
    throw navigationError;
  }

  // Verify we're logged in by checking for nav
  await page
    .getByTestId("main-nav")
    .waitFor({ state: "visible", timeout: 10000 });

  console.log(`[E2E Setup] ✓ ${userType} user authenticated`);
}

/**
 * Creates auth states for both admin and member users in a specific browser
 */
async function setupBrowserAuthStates(
  browserType: BrowserType,
  baseURL: string,
  storageDir: string,
  browserName: string,
  fileSuffix: string,
  throwOnError: boolean
): Promise<void> {
  console.log(`[E2E Setup] Creating ${browserName} auth states...`);

  const browser = await browserType.launch();

  // Admin auth
  const adminContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const adminPage = await adminContext.newPage();

  try {
    await authenticateUser(adminPage, baseURL, ADMIN_CREDENTIALS, "admin");
    const adminState = await adminContext.storageState();
    writeFileSync(
      path.join(storageDir, `admin${fileSuffix}.json`),
      JSON.stringify(adminState, null, 2)
    );
    console.log(`[E2E Setup] ✓ ${browserName} admin auth state saved`);
  } catch (err) {
    console.error(
      `[E2E Setup] Failed to authenticate ${browserName} admin:`,
      err
    );
    if (throwOnError) throw err;
  }

  await adminPage.close();
  await adminContext.close();

  // Member auth
  const memberContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const memberPage = await memberContext.newPage();

  try {
    await authenticateUser(memberPage, baseURL, MEMBER_CREDENTIALS, "member");
    const memberState = await memberContext.storageState();
    writeFileSync(
      path.join(storageDir, `member${fileSuffix}.json`),
      JSON.stringify(memberState, null, 2)
    );
    console.log(`[E2E Setup] ✓ ${browserName} member auth state saved`);
  } catch (err) {
    console.error(
      `[E2E Setup] Failed to authenticate ${browserName} member:`,
      err
    );
    if (throwOnError) throw err;
  }

  await memberPage.close();
  await memberContext.close();
  await browser.close();
}

async function waitForServer(baseURL: string): Promise<void> {
  let retries = 0;
  const maxRetries = 30;
  const healthURL = `${baseURL}/health`;

  while (retries < maxRetries) {
    try {
      const response = await fetch(healthURL, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
      const status = response.status;
      if (status >= 200 && status < 400) {
        console.log(
          `[E2E Setup] Server is ready at ${baseURL} (status: ${status})`
        );
        return;
      }
      console.log(`[E2E Setup] Server responded with ${status}, retrying...`);
    } catch {
      // Connection refused, timeout, or other network error
    }
    retries++;
    if (retries >= maxRetries) {
      console.error(
        `[E2E Setup] Server failed to start after ${maxRetries} attempts`
      );
      throw new Error(`Server not available at ${baseURL}`);
    }
    console.log(
      `[E2E Setup] Waiting for server... (attempt ${retries}/${maxRetries})`
    );
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function globalSetup(config: FullConfig) {
  const baseURL =
    process.env.BASE_URL ||
    config.projects[0]?.use?.baseURL ||
    "http://localhost:3000";
  const storageDir = path.join(__dirname, ".auth");

  mkdirSync(storageDir, { recursive: true });

  console.log("[E2E Setup] Initializing test environment...");

  await waitForServer(baseURL);

  // Chromium auth states (required - throw on error)
  await setupBrowserAuthStates(
    chromium,
    baseURL,
    storageDir,
    "Chromium",
    "",
    true
  );

  // WebKit auth states (optional - continue on error)
  await setupBrowserAuthStates(
    webkit,
    baseURL,
    storageDir,
    "WebKit",
    "-webkit",
    false
  );

  // Firefox auth states (optional - continue on error)
  await setupBrowserAuthStates(
    firefox,
    baseURL,
    storageDir,
    "Firefox",
    "-firefox",
    false
  );

  // Verify required auth state files were created
  const requiredAuthFiles = ["admin.json", "member.json"];
  for (const file of requiredAuthFiles) {
    const filePath = path.join(storageDir, file);
    if (!existsSync(filePath)) {
      throw new Error(`Required auth state file missing: ${filePath}`);
    }
  }

  console.log("[E2E Setup] Global setup complete");
}

export default globalSetup;
