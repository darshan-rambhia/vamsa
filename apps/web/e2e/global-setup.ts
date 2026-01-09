/**
 * Playwright Global Setup
 * Runs once before all tests - sets up test environment and pre-authenticates users
 */
import { chromium, type FullConfig } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  page: any,
  baseURL: string,
  credentials: { email: string; password: string },
  userType: string
) {
  console.log(`[E2E Setup] Authenticating ${userType} user...`);

  await page.goto(`${baseURL}/login`);
  console.log(`[E2E Setup] Navigated to login page, current URL: ${page.url()}`);

  // Wait for the page to fully load and JavaScript to be ready
  await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
  console.log(`[E2E Setup] Page DOMContentLoaded`);

  // Wait for login form to be visible
  await page.getByTestId("login-form").waitFor({ state: "visible", timeout: 5000 });
  console.log(`[E2E Setup] Login form is visible`);

  // Fill credentials - use type() instead of fill() to trigger onChange on React controlled components
  const emailInput = page.getByTestId("login-email-input");
  const passwordInput = page.getByTestId("login-password-input");

  // Clear fields first in case they have any content
  await emailInput.click();
  await emailInput.press("Control+A");
  await emailInput.press("Backspace");

  // Type the email - this will trigger onChange and update React state
  await emailInput.type(credentials.email, { delay: 50 });

  // Type the password
  await passwordInput.type(credentials.password, { delay: 50 });

  // Verify the form was filled
  const filledEmail = await emailInput.inputValue();
  const filledPassword = await passwordInput.inputValue();
  console.log(`[E2E Setup] Form filled - Email: ${filledEmail}, Password length: ${filledPassword.length}`);

  // Check if submit button is enabled
  const submitButton = page.getByTestId("login-submit-button");
  const isDisabled = await submitButton.isDisabled().catch(() => true);
  console.log(`[E2E Setup] Submit button disabled: ${isDisabled}`);

  // Submit form and wait for navigation
  console.log(`[E2E Setup] Submitting login form...`);

  // Click the button and wait for navigation to one of the authenticated routes
  // Using a combination of waitForURL and waitForLoadState for robustness
  try {
    await Promise.all([
      page.waitForURL(/\/(people|dashboard|tree)/, { timeout: 20000 }),
      submitButton.click(),
    ]);
    console.log(`[E2E Setup] Navigation completed, now at: ${page.url()}`);
  } catch (navigationError) {
    // Navigation timeout - check what went wrong
    console.error(`[E2E Setup] Navigation timeout after button click`);

    // Check for login error message on the page
    const loginErrorVisible = await page.getByTestId("login-error").isVisible().catch(() => false);
    if (loginErrorVisible) {
      const errorText = await page.getByTestId("login-error").textContent();
      console.error(`[E2E Setup] Login error displayed: ${errorText}`);
      throw new Error(`Login failed with server error: ${errorText}`);
    }

    // Check if we're still on login page
    const currentURL = page.url();
    console.error(`[E2E Setup] Current URL: ${currentURL}`);

    // Log button and form state
    const buttonText = await submitButton.textContent().catch(() => "unknown");
    const buttonDisabled = await submitButton.isDisabled().catch(() => "unknown");
    console.error(`[E2E Setup] Button state - Text: "${buttonText}", Disabled: ${buttonDisabled}`);

    // Try to wait for the load event anyway and check the URL
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
      const urlAfterLoad = page.url();
      console.log(`[E2E Setup] After DOMContentLoaded, URL is: ${urlAfterLoad}`);

      if (!urlAfterLoad.includes("/login")) {
        console.log(`[E2E Setup] Seems like navigation did succeed to ${urlAfterLoad}`);
      }
    } catch {
      // Ignore load state error
    }

    throw navigationError;
  }

  console.log(`[E2E Setup] Navigation successful to ${page.url()}`);

  // Verify we're logged in by checking for nav (with extended timeout)
  await page.getByTestId("main-nav").waitFor({ state: "visible", timeout: 10000 });

  console.log(`[E2E Setup] ✓ ${userType} user authenticated`);
}

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";
  const storageDir = path.join(__dirname, ".auth");

  // Create .auth directory if it doesn't exist
  mkdirSync(storageDir, { recursive: true });

  console.log("[E2E Setup] Initializing test environment...");

  // Wait for the server to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Log all console messages for debugging
  page.on("console", (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  // Log all request/response errors AND successful requests to /login (server function call)
  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (!response.ok()) {
      console.error(`[Network Error] ${status} ${url}`);
    } else if (url.includes("/login") || url.includes("server-function")) {
      console.log(`[Network] ${status} ${url}`);
    }
  });

  // Log page errors
  page.on("pageerror", (error) => {
    console.error(`[Page Error] ${error.message}`);
  });

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

  // Pre-authenticate admin user and save state
  try {
    await authenticateUser(page, baseURL, ADMIN_CREDENTIALS, "admin");
    const adminState = await page.context().storageState();
    writeFileSync(path.join(storageDir, "admin.json"), JSON.stringify(adminState, null, 2));
    console.log("[E2E Setup] ✓ Admin auth state saved");
  } catch (err) {
    console.error("[E2E Setup] Failed to authenticate admin user:", err);
    throw err;
  }

  // Close the first page and create a fresh one for member authentication
  // This avoids session conflicts from the admin session
  await page.close();
  console.log("[E2E Setup] Closed admin session page, creating fresh page for member...");

  const memberPage = await browser.newPage();

  // Set up event listeners for the new page
  memberPage.on("console", (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  memberPage.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (!response.ok()) {
      console.error(`[Network Error] ${status} ${url}`);
    } else if (url.includes("/login") || url.includes("server-function")) {
      console.log(`[Network] ${status} ${url}`);
    }
  });

  memberPage.on("pageerror", (error) => {
    console.error(`[Page Error] ${error.message}`);
  });

  // Pre-authenticate member user and save state
  try {
    await authenticateUser(memberPage, baseURL, MEMBER_CREDENTIALS, "member");
    const memberState = await memberPage.context().storageState();
    writeFileSync(path.join(storageDir, "member.json"), JSON.stringify(memberState, null, 2));
    console.log("[E2E Setup] ✓ Member auth state saved");
  } catch (err) {
    console.error("[E2E Setup] Failed to authenticate member user:", err);
    throw err;
  }

  await memberPage.close();
  await browser.close();

  console.log("[E2E Setup] Global setup complete");
}

export default globalSetup;
