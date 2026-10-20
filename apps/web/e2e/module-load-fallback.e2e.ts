/**
 * Module load failure recovery: a blocked JS chunk triggers one auto-reload,
 * then the static fallback UI (works without hydration).
 */

import { expect, test } from "@playwright/test";

test.describe("Module load fallback", () => {
  test("normal load shows no fallback and no console errors", async ({
    page,
  }) => {
    const errors: Array<string> = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html[data-hydrated]")).toHaveCount(1, {
      timeout: 15000,
    });
    await expect(page.locator("#vamsa-load-fallback-root")).toHaveCount(0);
    await expect(page.getByText(/couldn.t finish loading/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("blocked chunk reloads once then shows fallback", async ({ page }) => {
    let documentLoads = 0;
    page.on("request", (r) => {
      if (r.resourceType() === "document") documentLoads++;
    });
    await page.route(/\/assets\/.*\.js(\?.*)?$/, (route) => route.abort());

    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const fallback = page.locator("#vamsa-load-fallback-root");
    await expect(fallback).toBeVisible({ timeout: 15000 });
    await expect(
      fallback.getByRole("heading", { name: /couldn.t finish loading/i })
    ).toBeVisible();
    await expect(
      fallback.getByRole("button", { name: "Reload" })
    ).toBeVisible();
    // initial load + exactly one guarded auto-reload
    expect(documentLoads).toBe(2);
  });
});
