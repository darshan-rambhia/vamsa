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

async function globalSetup(config: FullConfig) {
  // In Docker, BASE_URL points to app container; locally use config or default
  const baseURL =
    process.env.BASE_URL ||
    config.projects[0]?.use?.baseURL ||
    "http://localhost:3000";
  const storageDir = path.join(__dirname, ".auth");

  // Create .auth directory if it doesn't exist
  mkdirSync(storageDir, { recursive: true });

  console.log("[E2E Setup] Initializing test environment...");

  // Launch browser for authentication
  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  let retries = 0;
  const maxRetries = 30;
  // Use /health endpoint for server readiness check (root URL may redirect)
  const healthURL = `${baseURL}/health`;

  // Use fetch() to check server readiness - simpler and doesn't follow redirects
  while (retries < maxRetries) {
    try {
      const response = await fetch(healthURL, {
        method: "GET",
        redirect: "manual", // Don't follow redirects
        signal: AbortSignal.timeout(5000),
      });
      const status = response.status;
      // Accept 2xx and 3xx as server being ready (3xx means server is up but redirecting)
      if (status >= 200 && status < 400) {
        console.log(
          `[E2E Setup] Server is ready at ${baseURL} (status: ${status})`
        );
        break;
      }
      // If we get 4xx or 5xx, server is up but returning errors - still try
      console.log(`[E2E Setup] Server responded with ${status}, retrying...`);
    } catch (error) {
      console.error(
        `[E2E Setup] Server not reachable at ${healthURL}, retrying...`,
        error
      );
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

  // Pre-authenticate admin user and save state
  try {
    await authenticateUser(page, baseURL, ADMIN_CREDENTIALS, "admin");
    const adminState = await context.storageState();
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
  await context.close();
  console.log(
    "[E2E Setup] Closed admin session page, creating fresh page for member..."
  );

  const memberContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const memberPage = await memberContext.newPage();

  // Pre-authenticate member user and save state
  try {
    await authenticateUser(memberPage, baseURL, MEMBER_CREDENTIALS, "member");
    const memberState = await memberContext.storageState();
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
  await memberContext.close();
  await browser.close();

  // Also create webkit-specific auth states
  // WebKit may handle cookies/storage differently than Chromium
  console.log("[E2E Setup] Creating WebKit auth states...");

  const webkitBrowser = await webkit.launch();
  // WebKit doesn't support the same args as Chromium, rely on ignoreHTTPSErrors
  const webkitContext = await webkitBrowser.newContext({
    ignoreHTTPSErrors: true,
  });
  const webkitPage = await webkitContext.newPage();

  try {
    await authenticateUser(webkitPage, baseURL, ADMIN_CREDENTIALS, "admin");
    const webkitAdminState = await webkitContext.storageState();
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
  await webkitContext.close();

  const webkitMemberContext = await webkitBrowser.newContext({
    ignoreHTTPSErrors: true,
  });
  const webkitMemberPage = await webkitMemberContext.newPage();
  try {
    await authenticateUser(
      webkitMemberPage,
      baseURL,
      MEMBER_CREDENTIALS,
      "member"
    );
    const webkitMemberState = await webkitMemberContext.storageState();
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
  await webkitMemberContext.close();
  await webkitBrowser.close();

  // Also create Firefox-specific auth states
  // Firefox may handle cookies/storage differently than Chromium
  console.log("[E2E Setup] Creating Firefox auth states...");

  const firefoxBrowser = await firefox.launch();
  const firefoxContext = await firefoxBrowser.newContext({
    ignoreHTTPSErrors: true,
  });
  const firefoxPage = await firefoxContext.newPage();

  try {
    await authenticateUser(firefoxPage, baseURL, ADMIN_CREDENTIALS, "admin");
    const firefoxAdminState = await firefoxContext.storageState();
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
  await firefoxContext.close();

  const firefoxMemberContext = await firefoxBrowser.newContext({
    ignoreHTTPSErrors: true,
  });
  const firefoxMemberPage = await firefoxMemberContext.newPage();
  try {
    await authenticateUser(
      firefoxMemberPage,
      baseURL,
      MEMBER_CREDENTIALS,
      "member"
    );
    const firefoxMemberState = await firefoxMemberContext.storageState();
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
  await firefoxMemberContext.close();
  await firefoxBrowser.close();

  console.log("[E2E Setup] Global setup complete");
}

export default globalSetup;
