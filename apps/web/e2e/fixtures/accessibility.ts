/**
 * Accessibility Testing Utilities
 * Provides helper functions for accessibility checks in E2E tests
 */

import { expect } from "@playwright/test";
import type { AccessibilityViolation } from "./test-base";

/**
 * Assert that a page has no critical accessibility violations
 * Fails the test if any violations are found
 *
 * @param violations - Array of accessibility violations from checkAccessibility
 * @param testName - Optional test context name for error reporting
 */
export function assertNoA11yViolations(
  violations: Array<AccessibilityViolation>,
  testName?: string
): void {
  const criticalViolations = violations.filter((v) =>
    ["critical", "serious"].includes(v.impact)
  );

  expect(
    violations.length,
    `${testName ? `[${testName}] ` : ""}Expected no accessibility violations but found ${violations.length}${
      criticalViolations.length > 0
        ? ` (${criticalViolations.length} critical)`
        : ""
    }\n\nViolations:\n${violations
      .map((v) => `- ${v.id} (${v.impact}): ${v.message} (${v.nodes} nodes)`)
      .join("\n")}`
  ).toBe(0);
}

/**
 * Assert that a page has no critical accessibility violations
 * Allows warnings but fails on critical/serious violations
 *
 * @param violations - Array of accessibility violations from checkAccessibility
 * @param testName - Optional test context name for error reporting
 */
export function assertNoCriticalA11yViolations(
  violations: Array<AccessibilityViolation>,
  testName?: string
): void {
  const criticalViolations = violations.filter((v) =>
    ["critical", "serious"].includes(v.impact)
  );

  expect(
    criticalViolations.length,
    `${testName ? `[${testName}] ` : ""}Expected no critical accessibility violations but found ${criticalViolations.length}\n\nCritical Violations:\n${criticalViolations
      .map((v) => `- ${v.id} (${v.impact}): ${v.message} (${v.nodes} nodes)`)
      .join("\n")}`
  ).toBe(0);
}

/**
 * Log accessibility violations for debugging
 * Useful for understanding what violations exist on a page
 *
 * @param violations - Array of accessibility violations from checkAccessibility
 * @param testName - Optional test context name for logging
 */
export function logA11yViolations(
  violations: Array<AccessibilityViolation>,
  testName?: string
): void {
  if (violations.length === 0) {
    console.log(
      `${testName ? `[${testName}] ` : ""}No accessibility violations found`
    );
    return;
  }

  console.log(
    `${testName ? `[${testName}] ` : ""}Found ${violations.length} accessibility violations:`
  );

  const byImpact = violations.reduce(
    (acc, v) => {
      if (!acc[v.impact]) {
        acc[v.impact] = [];
      }
      acc[v.impact].push(v);
      return acc;
    },
    {} as Record<string, Array<AccessibilityViolation>>
  );

  Object.entries(byImpact).forEach(([impact, viols]) => {
    console.log(`\n  ${impact.toUpperCase()} (${viols.length}):`);
    viols.forEach((v) => {
      console.log(`    - ${v.id}: ${v.message} (${v.nodes} nodes)`);
    });
  });
}

/**
 * Filter violations by impact level
 * Useful for selective assertion or logging
 *
 * @param violations - Array of accessibility violations
 * @param impacts - Impact levels to filter for (e.g., ["critical", "serious"])
 * @returns Filtered array of violations
 */
export function filterViolationsByImpact(
  violations: Array<AccessibilityViolation>,
  impacts: Array<string>
): Array<AccessibilityViolation> {
  return violations.filter((v) => impacts.includes(v.impact));
}

/**
 * Get a summary of accessibility violations
 * Returns a human-readable summary for reporting
 *
 * @param violations - Array of accessibility violations
 * @returns Summary string
 */
export function getA11ySummary(
  violations: Array<AccessibilityViolation>
): string {
  if (violations.length === 0) {
    return "No accessibility violations found";
  }

  const byImpact = violations.reduce(
    (acc, v) => {
      acc[v.impact] = (acc[v.impact] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const summary = Object.entries(byImpact)
    .sort((a, b) => {
      const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      return (
        (order[a[0] as keyof typeof order] ?? 4) -
        (order[b[0] as keyof typeof order] ?? 4)
      );
    })
    .map(([impact, count]) => `${count} ${impact}`)
    .join(", ");

  return `Found ${violations.length} violations: ${summary}`;
}
