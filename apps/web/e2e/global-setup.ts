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

  // Debug: Check /login endpoint with fetch first
  try {
    const debugResponse = await fetch(`${baseURL}/login`, {
      method: 'GET',
      redirect: 'manual',
    });
    console.log(`[E2E Debug] /login status: ${debugResponse.status}`);
    console.log(`[E2E Debug] /login headers:`, Object.fromEntries(debugResponse.headers.entries()));
    if (debugResponse.status >= 300 && debugResponse.status < 400) {
      console.log(`[E2E Debug] /login redirects to: ${debugResponse.headers.get('location')}`);
    }
  } catch (err) {
    console.error(`[E2E Debug] /login fetch failed:`, err);
  }

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
  // In Docker, BASE_URL points to app container; locally use config or default
  const baseURL =
    process.env.BASE_URL ||
    config.projects[0]?.use?.baseURL ||
    "http://localhost:3000";
  const storageDir = path.join(__dirname, ".auth");

  // Create .auth directory if it doesn't exist
  mkdirSync(storageDir, { recursive: true });

  console.log("[E2E Setup] Initializing test environment...");

  // Wait for the server to be ready
  // Launch browser with args to completely disable HSTS and secure upgrade behavior
  // This prevents the browser from internally redirecting http:// to https://
  const browser = await chromium.launch({
    args: [
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--disable-features=IsolateOrigins,site-per-process,UpgradeInsecureRequests',
      '--ignore-certificate-errors',
      '--test-type',
    ],
  });
  // Create context with ignoreHTTPSErrors and disable bypassCSP
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    // Set extra headers to prevent Upgrade-Insecure-Requests
    extraHTTPHeaders: {
      'Upgrade-Insecure-Requests': '0',
    },
  });
  const page = await context.newPage();

  // Use CDP to disable security features that cause HSTS upgrades
  const client = await context.newCDPSession(page);
  await client.send('Security.enable');
  await client.send('Security.setIgnoreCertificateErrors', { ignore: true });
  // Disable HSTS
  await client.send('Network.enable');
  await client.send('Network.setBypassServiceWorker', { bypass: true });

  // Log all console messages for debugging
  page.on("console", (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  // Log requests to /login to see what headers browser sends
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/login")) {
      console.log(`[Network Request] ${request.method()} ${url}`);
      console.log(`[Network Request Headers]`, JSON.stringify(request.headers(), null, 2));
    }
  });

  // Log all request/response errors AND successful requests to /login (server function call)
  page.on("response", async (response) => {
    const url = response.url();
    const status = response.status();
    if (!response.ok()) {
      console.error(`[Network Error] ${status} ${url}`);
      // Log redirect location for 3xx responses
      if (status >= 300 && status < 400) {
        const headers = response.headers();
        console.error(`[Network Redirect] Location: ${headers['location'] || 'not set'}`);
        console.error(`[Network Redirect] All headers:`, JSON.stringify(headers, null, 2));
      }
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
  // Use /health endpoint for server readiness check (root URL may redirect)
  const healthURL = `${baseURL}/health`;

  // Use fetch() to check server readiness - simpler and doesn't follow redirects
  while (retries < maxRetries) {
    try {
      const response = await fetch(healthURL, {
        method: 'GET',
        redirect: 'manual', // Don't follow redirects
        signal: AbortSignal.timeout(5000),
      });
      const status = response.status;
      // Accept 2xx and 3xx as server being ready (3xx means server is up but redirecting)
      if (status >= 200 && status < 400) {
        console.log(`[E2E Setup] Server is ready at ${baseURL} (status: ${status})`);
        break;
      }
      // If we get 4xx or 5xx, server is up but returning errors - still try
      console.log(`[E2E Setup] Server responded with ${status}, retrying...`);
    } catch (error) {
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
  const webkitContext = await webkitBrowser.newContext({ ignoreHTTPSErrors: true });
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

  const webkitMemberContext = await webkitBrowser.newContext({ ignoreHTTPSErrors: true });
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

  // Launch Firefox with prefs to disable HSTS preload
  const firefoxBrowser = await firefox.launch({
    firefoxUserPrefs: {
      'security.mixed_content.block_active_content': false,
      'security.mixed_content.block_display_content': false,
      'network.stricttransportsecurity.preloadlist': false,
      'security.cert_pinning.enforcement_level': 0,
    },
  });
  const firefoxContext = await firefoxBrowser.newContext({ ignoreHTTPSErrors: true });
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

  const firefoxMemberContext = await firefoxBrowser.newContext({ ignoreHTTPSErrors: true });
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
