/**
 * Playwright Global Setup
 * Runs once before all tests - sets up test environment and pre-authenticates users
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "@playwright/test";
import type { FullConfig } from "@playwright/test";

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
  console.log(
    `[E2E Setup] Navigated to login page, current URL: ${page.url()}`
  );

  // Wait for the page to fully load and JavaScript to be ready
  await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
  console.log(`[E2E Setup] Page DOMContentLoaded`);

  // Wait for login form to be visible
  await page
    .getByTestId("login-form")
    .waitFor({ state: "visible", timeout: 5000 });
  console.log(`[E2E Setup] Login form is visible`);

  // Fill credentials using pressSequentially for cross-browser compatibility
  // This types one character at a time which triggers all input events properly
  const emailInput = page.getByTestId("login-email-input");
  const passwordInput = page.getByTestId("login-password-input");

  // Click to focus and clear any existing value
  await emailInput.click();
  await emailInput.clear();
  await emailInput.pressSequentially(credentials.email, { delay: 20 });

  await passwordInput.click();
  await passwordInput.clear();
  await passwordInput.pressSequentially(credentials.password, { delay: 20 });

  // Verify the form was filled
  const filledEmail = await emailInput.inputValue();
  const passwordFilled = (await passwordInput.inputValue()).length > 0;
  console.log(
    `[E2E Setup] Form filled - Email: ${filledEmail}, Password: ${passwordFilled ? "filled" : "empty"}`
  );

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
    const loginErrorVisible = await page
      .getByTestId("login-error")
      .isVisible()
      .catch(() => false);
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
    const buttonDisabled = await submitButton
      .isDisabled()
      .catch(() => "unknown");
    console.error(
      `[E2E Setup] Button state - Text: "${buttonText}", Disabled: ${buttonDisabled}`
    );

    // Try to wait for the load event anyway and check the URL
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
      const urlAfterLoad = page.url();
      console.log(
        `[E2E Setup] After DOMContentLoaded, URL is: ${urlAfterLoad}`
      );

      if (!urlAfterLoad.includes("/login")) {
        console.log(
          `[E2E Setup] Seems like navigation did succeed to ${urlAfterLoad}`
        );
      }
    } catch {
      // Ignore load state error
    }

    throw navigationError;
  }

  console.log(`[E2E Setup] Navigation successful to ${page.url()}`);

  // Verify we're logged in by checking for nav (with extended timeout)
  await page
    .getByTestId("main-nav")
    .waitFor({ state: "visible", timeout: 10000 });

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

  // Pre-authenticate admin user and save state
  try {
    await authenticateUser(page, baseURL, ADMIN_CREDENTIALS, "admin");
    const adminState = await page.context().storageState();
    writeFileSync(
      path.join(storageDir, "admin.json"),
      JSON.stringify(adminState, null, 2)
    );
    console.log("[E2E Setup] ✓ Admin auth state saved");
  } catch (err) {
    console.error("[E2E Setup] Failed to authenticate admin user:", err);
    throw err;
  }

  // Close the first page and create a fresh one for member authentication
  // This avoids session conflicts from the admin session
  await page.close();
  console.log(
    "[E2E Setup] Closed admin session page, creating fresh page for member..."
  );

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
    writeFileSync(
      path.join(storageDir, "member.json"),
      JSON.stringify(memberState, null, 2)
    );
    console.log("[E2E Setup] ✓ Member auth state saved");
  } catch (err) {
    console.error("[E2E Setup] Failed to authenticate member user:", err);
    throw err;
  }

  await memberPage.close();
  await browser.close();

  // Also create webkit-specific auth states
  // WebKit may handle cookies/storage differently than Chromium
  console.log("[E2E Setup] Creating WebKit auth states...");

  const webkitBrowser = await webkit.launch();
  const webkitPage = await webkitBrowser.newPage();

  try {
    await authenticateUser(webkitPage, baseURL, ADMIN_CREDENTIALS, "admin");
    const webkitAdminState = await webkitPage.context().storageState();
    writeFileSync(
      path.join(storageDir, "admin-webkit.json"),
      JSON.stringify(webkitAdminState, null, 2)
    );
    console.log("[E2E Setup] ✓ WebKit admin auth state saved");
  } catch (err) {
    console.error("[E2E Setup] Failed to authenticate webkit admin:", err);
    // Continue - webkit can fall back to chromium auth state
  }

  await webkitPage.close();

  const webkitMemberPage = await webkitBrowser.newPage();
  try {
    await authenticateUser(
      webkitMemberPage,
      baseURL,
      MEMBER_CREDENTIALS,
      "member"
    );
    const webkitMemberState = await webkitMemberPage.context().storageState();
    writeFileSync(
      path.join(storageDir, "member-webkit.json"),
      JSON.stringify(webkitMemberState, null, 2)
    );
    console.log("[E2E Setup] ✓ WebKit member auth state saved");
  } catch (err) {
    console.error("[E2E Setup] Failed to authenticate webkit member:", err);
    // Continue - webkit can fall back to chromium auth state
  }

  await webkitMemberPage.close();
  await webkitBrowser.close();

  // Also create Firefox-specific auth states
  // Firefox may handle cookies/storage differently than Chromium
  console.log("[E2E Setup] Creating Firefox auth states...");

  const firefoxBrowser = await firefox.launch();
  const firefoxPage = await firefoxBrowser.newPage();

  try {
    await authenticateUser(firefoxPage, baseURL, ADMIN_CREDENTIALS, "admin");
    const firefoxAdminState = await firefoxPage.context().storageState();
    writeFileSync(
      path.join(storageDir, "admin-firefox.json"),
      JSON.stringify(firefoxAdminState, null, 2)
    );
    console.log("[E2E Setup] ✓ Firefox admin auth state saved");
  } catch (err) {
    console.error("[E2E Setup] Failed to authenticate firefox admin:", err);
    // Continue - firefox can fall back to chromium auth state
  }

  await firefoxPage.close();

  const firefoxMemberPage = await firefoxBrowser.newPage();
  try {
    await authenticateUser(
      firefoxMemberPage,
      baseURL,
      MEMBER_CREDENTIALS,
      "member"
    );
    const firefoxMemberState = await firefoxMemberPage.context().storageState();
    writeFileSync(
      path.join(storageDir, "member-firefox.json"),
      JSON.stringify(firefoxMemberState, null, 2)
    );
    console.log("[E2E Setup] ✓ Firefox member auth state saved");
  } catch (err) {
    console.error("[E2E Setup] Failed to authenticate firefox member:", err);
    // Continue - firefox can fall back to chromium auth state
  }

  await firefoxMemberPage.close();
  await firefoxBrowser.close();

  console.log("[E2E Setup] Global setup complete");
}

export default globalSetup;
