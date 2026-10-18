/**
 * Profile claiming toggle for E2E specs
 *
 * Profile claiming is off by default. Specs that exercise the claim flow turn it
 * on through the admin settings form, as an admin, before their tests run.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "@playwright/test";
import type { Browser } from "@playwright/test";

const ADMIN_STATE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".auth",
  "admin.json"
);

const BASE_URL =
  process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

/**
 * Sets the admin "allow profile claiming" option to the requested state.
 * No-op when the option is already in that state.
 */
export async function setProfileClaiming(
  browser: Browser,
  enabled: boolean
): Promise<void> {
  const context = await browser.newContext({
    storageState: ADMIN_STATE,
    baseURL: BASE_URL,
  });
  const page = await context.newPage();
  try {
    await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
    const checkbox = page.getByTestId(
      "settings-allow-profile-claiming-checkbox"
    );
    await checkbox.waitFor();

    const isOn = (await checkbox.getAttribute("data-state")) === "checked";
    if (isOn !== enabled) {
      await checkbox.click();
      await page.getByTestId("settings-submit-button").click();
      await expect(page.getByTestId("settings-submit-button")).toBeEnabled();
    }
  } finally {
    await context.close();
  }
}
