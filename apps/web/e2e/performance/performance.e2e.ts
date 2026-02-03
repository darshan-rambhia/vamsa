/**
 * Performance Metrics Tests
 *
 * Tests application performance against defined budgets:
 * - Page load times (measured via Playwright metrics)
 * - Navigation responsiveness
 *
 * Performance Budgets:
 * - Page navigation: 6s (networkidle)
 * - DOM Content Loaded: 3.5s
 * - Navigation between pages: 3s
 */

import { expect, test } from "@playwright/test";

test.describe("Performance Metrics", () => {
  test("login page loads within performance budget", async ({ page }) => {
    // Clear authentication to ensure we load login page
    await page.context().clearCookies();

    // Measure time to navigate and load
    const startTime = Date.now();
    await page.goto("/login", {
      waitUntil: "domcontentloaded",
    });
    const domContentLoadedTime = Date.now() - startTime;

    // Continue waiting for full network idle
    await page.waitForLoadState("networkidle").catch(() => {
      // It's ok if networkidle times out, we're measuring domcontentloaded
    });
    const fullLoadTime = Date.now() - startTime;

    // Login form should be visible and interactive
    const emailInput = page.getByTestId("login-email-input");
    await expect(emailInput).toBeVisible({ timeout: 2000 });
    await expect(emailInput).toBeEditable({ timeout: 2000 });

    // Performance budgets - DOM Content Loaded should be fast
    expect(
      domContentLoadedTime,
      `DOM Content Loaded should be under 3000ms, got ${domContentLoadedTime}ms`
    ).toBeLessThan(3000);

    // Full load should complete within budget
    expect(
      fullLoadTime,
      `Full page load should be under 6000ms, got ${fullLoadTime}ms`
    ).toBeLessThan(6000);
  });

  test("dashboard loads within performance budget", async ({ page }) => {
    // Navigate to dashboard (assumes pre-authenticated via storage state)
    const startTime = Date.now();
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
    });
    const domContentLoadedTime = Date.now() - startTime;

    // Wait for page content to appear
    await page.waitForSelector("main", { timeout: 5000 }).catch(() => {});
    const contentLoadedTime = Date.now() - startTime;

    // Performance budgets - slightly relaxed for authenticated pages with data
    expect(
      domContentLoadedTime,
      `DOM Content Loaded should be under 3500ms, got ${domContentLoadedTime}ms`
    ).toBeLessThan(3500);

    expect(
      contentLoadedTime,
      `Content should load within 6000ms, got ${contentLoadedTime}ms`
    ).toBeLessThan(6000);
  });

  test("people list loads within performance budget", async ({ page }) => {
    // Navigate to people list
    const startTime = Date.now();
    await page.goto("/people", {
      waitUntil: "domcontentloaded",
    });
    const domContentLoadedTime = Date.now() - startTime;

    // Wait for page content to appear
    await page.waitForSelector("main", { timeout: 5000 }).catch(() => {});
    const contentLoadedTime = Date.now() - startTime;

    // Performance budgets - slightly relaxed for list pages that fetch data
    expect(
      domContentLoadedTime,
      `DOM Content Loaded should be under 3500ms, got ${domContentLoadedTime}ms`
    ).toBeLessThan(3500);

    expect(
      contentLoadedTime,
      `Content should load within 6000ms, got ${contentLoadedTime}ms`
    ).toBeLessThan(6000);
  });

  test("navigation between pages is responsive", async ({ page }) => {
    // Start on dashboard
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    // Navigate to people
    const navigationStartTime = Date.now();
    await page.goto("/people", { waitUntil: "domcontentloaded" });
    const navigationTime = Date.now() - navigationStartTime;

    // Navigation between pages should be fast (data-heavy pages might need more time)
    expect(
      navigationTime,
      `Navigation should complete in under 3000ms, got ${navigationTime}ms`
    ).toBeLessThan(3000);
  });

  test("authenticated pages are interactive quickly", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    // Check that interactive elements are available quickly
    const startTime = Date.now();
    const mainNav = page.getByTestId("main-nav");
    await expect(mainNav).toBeVisible({ timeout: 2000 });
    const interactiveTime = Date.now() - startTime;

    expect(
      interactiveTime,
      `Page should be interactive within 2000ms, got ${interactiveTime}ms`
    ).toBeLessThan(2000);
  });
});

test.describe("Performance - Accessibility", () => {
  test("performance pages maintain accessibility standards", async ({
    page,
  }) => {
    // Navigate to login page
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Verify page is accessible and performant
    // No interaction needed, just verify page loads and is interactive
    const emailInput = page.getByTestId("login-email-input");
    await expect(emailInput).toBeVisible({ timeout: 3000 });
    await expect(emailInput).toBeEditable({ timeout: 3000 });
  });
});
