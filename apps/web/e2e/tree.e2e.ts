/**
 * Family Tree Visualization - User Flow Tests
 *
 * Tests actual user journeys through the family tree visualization:
 * - Loading and rendering tree
 * - Interacting with tree controls
 * - Navigation between views
 * - State preservation
 */

import { VIEWPORT_ARRAY, expect, test } from "./fixtures";
import { Navigation } from "./fixtures/page-objects";

test.describe("Family Tree Visualization", () => {
  // Tree visualization is memory-intensive (D3 charts) - use slower timeout
  test.slow();

  test.beforeEach(async ({ page, login }) => {
    await login();
    const nav = new Navigation(page);
    await nav.goToTree();
    await page
      .locator("main")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
  });

  test("user can view family tree with controls", async ({ page }) => {
    // Verify tree page loaded
    expect(page.url()).toContain("/visualize");

    // Main content area should be visible
    const mainElement = page.locator("main").first();
    await expect(mainElement).toBeVisible();

    // Should have chart type selector
    const chartTypeSelect = page.getByLabel(/chart type/i);
    await expect(chartTypeSelect).toBeVisible();
  });

  test("user can interact with tree controls", async ({ page }) => {
    // Find and interact with generation controls if visible
    const ancestorControl = page.getByLabel(/ancestors/i);
    const hasAncestorControl = await ancestorControl
      .isVisible()
      .catch(() => false);

    if (hasAncestorControl) {
      // Increase ancestor generations
      const increaseBtn = page.getByRole("button", {
        name: /increase ancestors/i,
      });
      if (await increaseBtn.isVisible().catch(() => false)) {
        await increaseBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Tree should remain stable after interaction
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("user can switch chart types", async ({ page }) => {
    // Use URL-based navigation which is more reliable than dropdown interaction
    // (Radix Select dropdowns render in portals with varying selectors)
    // Firefox can throw NS_BINDING_ABORTED - retry until we reach the target URL
    const targetUrl = "/visualize?type=ancestor";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
        // Check if we arrived at the right URL
        if (page.url().includes("type=ancestor")) break;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("NS_BINDING_ABORTED")
        ) {
          await page.waitForTimeout(500);
          if (page.url().includes("type=ancestor")) break;
          continue;
        }
        throw error;
      }
    }

    // Wait for page to load with new chart type
    await page
      .locator("main")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });

    // URL should reflect the chart type
    await expect(page).toHaveURL(/type=ancestor/);

    // Chart type selector should show ancestor
    const chartTypeSelect = page.getByLabel(/chart type/i);
    await expect(chartTypeSelect).toContainText(/ancestor/i);
  });

  test("user can navigate away and return to tree", async ({ page }) => {
    // Navigate to people page
    const nav = new Navigation(page);
    await nav.goToPeople();
    await expect(page).toHaveURL(/\/people/);

    // Return to tree
    await nav.goToTree();
    await expect(page).toHaveURL(/\/visualize/);

    // Tree should be visible again
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("tree state is preserved in URL", async ({ page }) => {
    // Navigate to timeline chart type via URL with retry for Firefox NS_BINDING_ABORTED
    const targetUrl = "/visualize?type=timeline";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
        if (page.url().includes("type=timeline")) break;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("NS_BINDING_ABORTED")
        ) {
          await page.waitForTimeout(500);
          if (page.url().includes("type=timeline")) break;
          continue;
        }
        throw error;
      }
    }

    await page
      .locator("main")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });

    await expect(page).toHaveURL(/type=timeline/);

    // Reload page
    await page.reload();
    await page
      .locator("main")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });

    // Chart type should be preserved after reload
    await expect(page).toHaveURL(/type=timeline/);
    const chartTypeSelect = page.getByLabel(/chart type/i);
    await expect(chartTypeSelect).toContainText(/timeline/i);
  });

  test("tree is responsive across viewports", async ({ page }) => {
    for (const viewport of VIEWPORT_ARRAY) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.waitForTimeout(300);

      // Main content should remain visible at all sizes
      await expect(page.locator("main").first()).toBeVisible();
    }
  });

  test("user can use keyboard navigation", async ({ page }) => {
    const mainElement = page.locator("main").first();
    await mainElement.focus();

    // Press arrow keys - page should handle gracefully
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(100);

    // Page should remain functional
    expect(page.url()).toContain("/visualize");
    await expect(mainElement).toBeVisible();
  });

  test("tree handles mouse interactions gracefully", async ({ page }) => {
    const mainElement = page.locator("main").first();

    // Hover over tree
    await mainElement.hover();

    // Simulate wheel event (zoom)
    await mainElement.evaluate(() => {
      const event = new WheelEvent("wheel", { deltaY: -100, bubbles: true });
      document.dispatchEvent(event);
    });

    await page.waitForTimeout(200);

    // Page should remain stable
    await expect(mainElement).toBeVisible();
  });
});
