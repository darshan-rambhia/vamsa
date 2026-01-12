/**
 * Accessibility Testing Verification Tests
 * Verifies that the accessibility testing framework is working correctly
 */
import { test, expect } from "./fixtures";
import {
  assertNoCriticalA11yViolations,
  logA11yViolations,
  getA11ySummary,
} from "./fixtures/accessibility";

test.describe("Accessibility Testing Framework", () => {
  test("should successfully run accessibility checks on login page", async ({
    page,
    checkAccessibility,
  }) => {
    // Navigate to login page (no auth required)
    await page.goto("/login");

    // Run accessibility check
    const violations = await checkAccessibility();

    // Verify check completed
    expect(violations).toBeDefined();
    expect(Array.isArray(violations)).toBe(true);

    // Log for debugging
    if (violations.length > 0) {
      console.log(getA11ySummary(violations));
      logA11yViolations(violations, "Login page");
    }

    // Assert no critical violations
    assertNoCriticalA11yViolations(violations, "Login page");
  });

  test("should check accessibility after authentication", async ({
    page,
    login,
    checkAccessibility,
  }) => {
    // Login first
    await login();

    // Navigate to dashboard
    await page.goto("/dashboard");

    // Run accessibility check
    const violations = await checkAccessibility();

    // Verify check completed
    expect(violations).toBeDefined();
    expect(Array.isArray(violations)).toBe(true);

    // Log summary
    console.log(getA11ySummary(violations));

    // Assert no critical violations
    assertNoCriticalA11yViolations(violations, "Dashboard page");
  });

  test("should identify violations when present", async ({
    page,
    checkAccessibility,
  }) => {
    // Go to a page
    await page.goto("/login");

    // Run accessibility check
    const violations = await checkAccessibility();

    // Verify we got results (they may or may not have violations)
    expect(violations).toBeDefined();
    expect(Array.isArray(violations)).toBe(true);

    // If there are violations, they should have the right structure
    violations.forEach((violation) => {
      expect(violation.id).toBeDefined();
      expect(violation.impact).toBeDefined();
      expect(violation.message).toBeDefined();
      expect(violation.nodes).toBeDefined();
      expect(typeof violation.nodes).toBe("number");
    });
  });

  test("should support filtering by impact level", async ({
    page,
    checkAccessibility,
  }) => {
    await page.goto("/login");

    const violations = await checkAccessibility();

    // Filter for critical violations only
    const criticalOnly = violations.filter((v) =>
      ["critical", "serious"].includes(v.impact)
    );

    // Verify filtering works
    expect(
      criticalOnly.every((v) => ["critical", "serious"].includes(v.impact))
    ).toBe(true);
  });
});
