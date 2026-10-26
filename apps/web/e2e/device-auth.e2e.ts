/**
 * Device authorization (RFC 8628) approval page: /device
 *
 * Simulates `vamsa login`: the CLI requests a device code from Better Auth,
 * the user signs in and approves (or denies) it in the browser, and the CLI's
 * token poll reflects the decision.
 */

import {
  TEST_USERS,
  expect,
  test,
  waitForHydration,
} from "./fixtures/test-base";
import { bdd } from "./fixtures/bdd-helpers";
import type { APIRequestContext, Page } from "@playwright/test";

const CLIENT_ID = "vamsa-cli";
const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri_complete?: string;
}

async function requestDeviceCode(
  request: APIRequestContext
): Promise<DeviceCode> {
  const res = await request.post("/api/auth/device/code", {
    data: { client_id: CLIENT_ID },
  });
  expect(res.ok()).toBe(true);
  return (await res.json()) as DeviceCode;
}

async function pollToken(request: APIRequestContext, deviceCode: string) {
  const res = await request.post("/api/auth/device/token", {
    data: {
      grant_type: DEVICE_GRANT,
      device_code: deviceCode,
      client_id: CLIENT_ID,
    },
  });
  return { status: res.status(), body: await res.json() };
}

async function signInAndOpenDevice(page: Page, userCode: string) {
  await page.goto(`/device?user_code=${encodeURIComponent(userCode)}`);
  await expect(page).toHaveURL(/\/login/);
  // WebKit can drop input before React hydrates; wait, then verify each fill
  await waitForHydration(page, 15000);
  const email = page.getByTestId("login-email-input");
  const password = page.getByTestId("login-password-input");
  await expect(async () => {
    await email.fill(TEST_USERS.member.email);
    await password.fill(TEST_USERS.member.password);
    await expect(email).toHaveValue(TEST_USERS.member.email, { timeout: 500 });
    await expect(password).toHaveValue(TEST_USERS.member.password, {
      timeout: 500,
    });
  }).toPass({ timeout: 10000 });
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/device/, { timeout: 15000 });
  await expect(page.getByTestId("device-pending")).toBeVisible({
    timeout: 15000,
  });
}

/** "ABCDEFGH" -> "ABCD-EFGH", matching the page's display format */
function displayCode(code: string): string {
  const c = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

test.describe("Device authorization (/device)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("approving a device code issues a token to the CLI", async ({
    page,
    request,
  }) => {
    let code!: DeviceCode;

    await bdd.given("the CLI has requested a device code", async () => {
      code = await requestDeviceCode(request);
      const pending = await pollToken(request, code.device_code);
      expect(pending.status).toBe(400);
      expect(pending.body.error).toBe("authorization_pending");
    });

    await bdd.when(
      "the user signs in and opens the approval page",
      async () => {
        await signInAndOpenDevice(page, code.user_code);
        await expect(page.getByTestId("device-user-code")).toContainText(
          displayCode(code.user_code)
        );
      }
    );

    await bdd.and("the user approves", async () => {
      await page.getByTestId("device-approve").click();
      await expect(page.getByTestId("device-approved")).toBeVisible();
    });

    await bdd.then("the CLI poll returns an access token", async () => {
      // Avoid slow_down: respect the 5s poll interval since the first poll
      await expect
        .poll(async () => (await pollToken(request, code.device_code)).body, {
          intervals: [5500, 5500],
          timeout: 20000,
        })
        .toMatchObject({ access_token: expect.any(String) });
    });
  });

  test("denying a device code rejects the CLI poll", async ({
    page,
    request,
  }) => {
    let code!: DeviceCode;

    await bdd.given("the CLI has requested a device code", async () => {
      code = await requestDeviceCode(request);
    });

    await bdd.when("the user signs in and denies it", async () => {
      await signInAndOpenDevice(page, code.user_code);
      await page.getByTestId("device-deny").click();
      await expect(page.getByTestId("device-denied")).toBeVisible();
    });

    await bdd.then("the CLI poll returns access_denied", async () => {
      const res = await pollToken(request, code.device_code);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("access_denied");
    });
  });
});
