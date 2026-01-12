# Accessibility Testing Guide

This guide explains how to use the automated accessibility testing framework in Vamsa E2E tests.

## Overview

Accessibility testing is integrated into the E2E test suite using [axe-core](https://github.com/dequelabs/axe-core) and the [@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright) package. All tests are configured to check for WCAG 2 AA compliance.

## Installation

The accessibility testing package is already installed as a dev dependency in `apps/web/package.json`:

```bash
pnpm add -D @axe-core/playwright
```

## Using the Accessibility Fixture

The `checkAccessibility()` fixture is available in all E2E tests. Here's how to use it:

### Basic Usage

```typescript
import { test, expect } from "./fixtures";
import { assertNoCriticalA11yViolations } from "./fixtures/accessibility";

test("my page should be accessible", async ({ page, checkAccessibility }) => {
  await page.goto("/my-page");

  // Run accessibility check
  const violations = await checkAccessibility();

  // Assert no critical violations
  assertNoCriticalA11yViolations(violations, "My page");
});
```

### Checking Specific Selectors

You can check accessibility for a specific part of the page:

```typescript
const violations = await checkAccessibility({
  selector: "[data-testid='my-dialog']"
});
```

### Skipping Specific Rules

If you need to skip certain accessibility rules (useful for known issues that will be fixed later):

```typescript
const violations = await checkAccessibility({
  skipRules: ["color-contrast", "aria-required-attr"]
});
```

### Checking Only Specific Rules

Run checks for only specific accessibility rules:

```typescript
const violations = await checkAccessibility({
  rules: ["color-contrast", "button-name", "image-alt"]
});
```

## Assertion Functions

### assertNoCriticalA11yViolations()

Fails the test if any critical or serious violations are found. Allows minor warnings.

```typescript
const violations = await checkAccessibility();
assertNoCriticalA11yViolations(violations, "Dashboard page");
```

### assertNoA11yViolations()

Fails the test if any violations are found (strict mode).

```typescript
const violations = await checkAccessibility();
assertNoA11yViolations(violations, "Login form");
```

### logA11yViolations()

Logs violations to the console for debugging (doesn't fail the test).

```typescript
const violations = await checkAccessibility();
logA11yViolations(violations, "Settings page");
```

### filterViolationsByImpact()

Filter violations by impact level for custom handling.

```typescript
const violations = await checkAccessibility();
const criticalOnly = filterViolationsByImpact(violations, ["critical"]);
expect(criticalOnly.length).toBe(0);
```

### getA11ySummary()

Get a human-readable summary of violations.

```typescript
const violations = await checkAccessibility();
const summary = getA11ySummary(violations);
console.log(summary);
// Output: "Found 3 violations: 1 critical, 2 moderate"
```

## Violation Impact Levels

Accessibility violations are categorized by impact:

- **critical**: Serious accessibility issues that create barriers for people with disabilities
- **serious**: Significant accessibility issues
- **moderate**: Moderate accessibility issues
- **minor**: Minor issues that don't severely impact accessibility

## WCAG 2 AA Standards

All accessibility checks are configured to validate against WCAG 2 AA standards, which are the most widely adopted web accessibility guidelines. This includes:

- Level A requirements (basic accessibility)
- Level AA requirements (enhanced accessibility)

## Common Accessibility Rules

Some common accessibility rules checked:

| Rule ID | Description |
|---------|-------------|
| `color-contrast` | Text must have sufficient color contrast |
| `aria-required-attr` | Required ARIA attributes must be present |
| `button-name` | Buttons must have accessible names |
| `image-alt` | Images must have alternative text |
| `form-field-multiple-labels` | Form fields shouldn't have multiple label elements |
| `label` | Form inputs must be associated with labels |
| `link-name` | Links must have discernible text |
| `region` | Page regions must be marked with landmarks |

See [axe-core rule descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md) for the complete list.

## Best Practices

1. **Check early and often**: Add accessibility checks to critical user flows
2. **Be specific**: Use test names to identify which part of the page failed
3. **Fix immediately**: Don't ignore accessibility violations - they affect real users
4. **Test multiple pages**: Different pages may have different accessibility issues
5. **Check after interactions**: Check accessibility after modals open, forms submit, etc.

## Example Test Pattern

```typescript
test("user can add a relationship with accessibility", async ({ page, checkAccessibility }) => {
  await page.goto("/people");

  // Check people list is accessible
  let violations = await checkAccessibility();
  assertNoCriticalA11yViolations(violations, "People list");

  // Navigate to person detail
  await page.click("[data-person-card]");

  // Check person detail is accessible
  violations = await checkAccessibility();
  assertNoCriticalA11yViolations(violations, "Person detail");

  // Open add relationship dialog
  await page.click("[data-testid='add-relationship-button']");

  // Check dialog is accessible
  violations = await checkAccessibility();
  assertNoCriticalA11yViolations(violations, "Add relationship dialog");

  // Complete the form
  await page.fill("[data-testid='relationship-type']", "parent");
  await page.click("[data-testid='submit']");

  // Check success state is accessible
  violations = await checkAccessibility();
  assertNoCriticalA11yViolations(violations, "Relationship added confirmation");
});
```

## Handling Known Issues

If you have a known accessibility issue that will be fixed later, skip it for now:

```typescript
// TODO: Fix color contrast in theme picker (vamsa-123)
const violations = await checkAccessibility({
  skipRules: ["color-contrast"]
});
assertNoCriticalA11yViolations(violations, "Theme picker");
```

## CI/CD Integration

Run accessibility tests as part of your CI/CD pipeline:

```bash
# Run E2E tests with accessibility checks
pnpm test:e2e

# Run only E2E tests (includes accessibility)
pnpm test:e2e:chromium

# View test report with accessibility results
pnpm test:e2e:report
```

## Debugging Accessibility Issues

When a test fails due to accessibility violations:

1. **Read the error message** - it lists all violations with IDs and descriptions
2. **Log violations** - use `logA11yViolations()` for detailed debugging
3. **Inspect the element** - use browser dev tools to see the offending element
4. **Check axe rules** - visit [axe-core rule descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
5. **Fix the code** - update the component to meet WCAG 2 AA standards

## Resources

- [axe-core Rule Descriptions](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Accessibility Resources](https://webaim.org/)
- [Playwright Testing](https://playwright.dev/)
- [@axe-core/playwright Documentation](https://www.npmjs.com/package/@axe-core/playwright)

## Questions?

For questions about accessibility testing or to report accessibility issues in Vamsa, please open an issue on the project repository.
