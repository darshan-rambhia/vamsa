---
name: testing
description: Write meaningful tests for Vamsa using Bun (unit) and Playwright (E2E). Use this skill when creating or modifying tests. See unit-recipes.md and e2e-recipes.md for domain-specific patterns.
license: MIT
---

# Vamsa Testing Guide

This skill provides testing standards for Vamsa.

**Reference files:**

- [unit-recipes.md](./unit-recipes.md) - Unit test patterns (React, GEDCOM, Charts)
- [e2e-recipes.md](./e2e-recipes.md) - E2E patterns (Page Objects, Auth, Forms, A11y)

## Decision: Unit vs E2E

| Test for...                         | Use                         |
| ----------------------------------- | --------------------------- |
| Pure function logic                 | Unit test                   |
| Component rendering                 | Unit test (Testing Library) |
| Business calculations               | Unit test                   |
| User workflows across pages         | E2E test                    |
| Authentication flows                | E2E test                    |
| Database integrations               | E2E test                    |
| Error states (network, permissions) | E2E test                    |

**Rule of thumb**: If you can test it faster and more reliably with a unit test, use a unit test. E2E tests are for user journeys that cross boundaries.

---

# Unit Testing (Bun)

## Philosophy: Honest Minimal Tests

Tests must verify **actual behavior**, not just existence. Every test should answer: "Does this code work correctly?"

### The Golden Rules

1. **Would this test fail if the code was broken?** If not, it's a fake test.
2. **Is this testing our code, not JavaScript/React/mocks?** Don't test that `typeof x === "function"`.
3. **Each test should verify something meaningfully different.** Don't pad test counts.

### Test Quality Tiers

**Tier 1: Export/Type Validation (MINIMAL)**

```typescript
// Use when no DOM testing available
describe("ProfileCard", () => {
  it("exports ProfileCard component", () => {
    expect(ProfileCard).toBeDefined();
    expect(typeof ProfileCard).toBe("function");
  });

  it("creates element with required props", () => {
    const element = <ProfileCard person={mockPerson} onClaim={() => {}} />;
    expect(element.type).toBe(ProfileCard);
  });
});
```

**Tier 2: DOM Rendering (PREFERRED)**

```typescript
// Use @testing-library/react for actual DOM output
describe("Button", () => {
  test("renders button with text", () => {
    const { getByRole, getByText } = render(<Button>Click me</Button>);
    expect(getByRole("button")).toBeDefined();
    expect(getByText("Click me")).toBeDefined();
  });

  test("applies variant styling", () => {
    const { getByRole } = render(<Button variant="destructive">Delete</Button>);
    expect(getByRole("button").className).toContain("bg-destructive");
  });
});
```

**Tier 3: Behavioral Tests (BEST)**

```typescript
// Test actual logic and user interactions
describe("SearchInput", () => {
  test("calls onSearch when form is submitted", () => {
    const onSearch = mock(() => {});
    const { getByRole } = render(<SearchInput onSearch={onSearch} />);

    const input = getByRole("searchbox");
    fireEvent.change(input, { target: { value: "test query" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSearch).toHaveBeenCalledWith("test query");
  });
});
```

## Unit Test Anti-Patterns (CRITICAL)

### Never Write Tautological Tests

```typescript
// BAD - Tests that JavaScript works
test("should be a function", () => {
  expect(typeof MyComponent).toBe("function"); // Always true
});

// GOOD - Tests actual behavior
test("returns true for valid input", () => {
  expect(someFunction("valid")).toBe(true);
});
```

### Never Verify Props You Just Set

```typescript
// BAD - Testing assignment
const element = <Button disabled={true} />;
expect(element.props.disabled).toBe(true); // You just set it!

// GOOD - Testing behavior
const { getByRole } = render(<Button disabled>Disabled</Button>);
expect((getByRole("button") as HTMLButtonElement).disabled).toBe(true);
```

### Never Test Framework Features

```typescript
// BAD - Testing React
test("React can create elements", () => {
  const element = <div>test</div>;
  expect(element).toBeDefined();
});

// GOOD - Testing your component
test("counter increments when clicked", () => {
  const { getByRole, getByText } = render(<Counter />);
  fireEvent.click(getByRole("button", { name: "Increment" }));
  expect(getByText("Count: 1")).toBeDefined();
});
```

### Never Write Always-Passing Assertions

```typescript
// BAD
expect(result !== null || result === null).toBe(true); // Always true

// GOOD
expect(result).not.toBeNull();
```

---

# E2E Testing (Playwright)

## Philosophy: User Workflows

E2E tests simulate complete user journeys. They answer: "Can the user accomplish this task?"

### BDD Structure (REQUIRED)

Every E2E test MUST use Given-When-Then structure:

```typescript
import { test, expect } from "../fixtures/test-base";
import { bdd } from "../helpers/bdd-helpers";

test("should create a new person", async ({ page }) => {
  await bdd.given("user is logged in as admin", async () => {
    await page.goto("/people");
    await expect(page.getByTestId("main-nav")).toBeVisible();
  });

  await bdd.when("user fills out the person form", async () => {
    await page.getByTestId("add-person-button").click();
    await page.getByTestId("person-form-firstName").fill("John");
    await page.getByTestId("person-form-lastName").fill("Smith");
    await page.getByTestId("person-form-submit").click();
  });

  await bdd.then("person is created and visible", async () => {
    await expect(page.getByText("John Smith")).toBeVisible();
  });
});
```

### Selectors: Test IDs Over CSS

```typescript
// BAD - Brittle CSS
await page.click("div.card > div:nth-child(2) > button.btn-primary");

// GOOD - Semantic test IDs
await page.getByTestId("person-form-submit").click();

// GOOD - Accessible roles
await page.getByRole("button", { name: "Submit" }).click();
```

### Test ID Naming Convention

```
{component}-{element}-{modifier}

Examples:
- login-form
- login-email-input
- person-card-{personId}
```

### Authentication

```typescript
// Default: Tests run as authenticated admin
test("should see admin panel", async ({ page }) => {
  await page.goto("/admin");
  // Already authenticated via storage state
});

// Test as different user
test.use({ storageState: ".auth/member.json" });

// Test unauthenticated state
test.use({ storageState: { cookies: [], origins: [] } });
```

### Test Users

```typescript
export const TEST_USERS = {
  admin: {
    email: "admin@test.vamsa.local",
    password: "TestAdmin123!",
    role: "ADMIN",
  },
  member: {
    email: "member@test.vamsa.local",
    password: "TestMember123!",
    role: "MEMBER",
  },
  viewer: {
    email: "viewer@test.vamsa.local",
    password: "TestViewer123!",
    role: "VIEWER",
  },
};
```

## E2E Anti-Patterns (CRITICAL)

### Never Use Arbitrary Waits

```typescript
// BAD
await page.waitForTimeout(2000);

// GOOD - Wait for specific condition
await page.getByTestId("submit-button").waitFor({ state: "visible" });
```

### Never Use Lenient Fallbacks

```typescript
// BAD - Fallback hides failures
await Promise.race([
  page
    .locator("[data-tree]")
    .waitFor()
    .catch(() => {}),
  page
    .locator("main")
    .waitFor()
    .catch(() => {}), // Always passes!
]);

// GOOD - Strict assertion
const tree = page.locator("[data-tree]");
const emptyState = page.locator('text="No family tree"');
await expect(tree.or(emptyState)).toBeVisible({ timeout: 5000 });
```

### Never Swallow Errors

```typescript
// BAD
await page.click("button").catch(() => {});

// GOOD - Let errors fail
await page.click("button");
```

### Strict Timeouts

```typescript
// Page load: 5s max
await page.waitForSelector("[data-tree]", { timeout: 5000 });

// User interactions: 3s max
await expect(page.getByText("Success")).toBeVisible({ timeout: 3000 });
```

---

# Running Tests

## Commands

```bash
# Unit tests
bun run test                # All unit tests
bun run test:unit           # lib and ui only
bun run test:coverage       # With coverage report

# E2E tests
bun run test:e2e            # All E2E tests
bun run test:e2e --ui       # Interactive mode
bun run test:e2e auth.spec.ts  # Specific file
bun run test:e2e --grep "login"  # Pattern match

# Specific package
cd packages/lib && bun test
cd packages/ui && bun test
cd apps/web && bun test
```

## Coverage Requirements

From `bunfig.toml`:

```toml
[test.coverageThreshold]
lines = 95
functions = 95
branches = 90

[test.coverageThreshold."@vamsa/lib"]
lines = 98.82
functions = 98.12
branches = 95

[test.coverageThreshold."@vamsa/ui"]
lines = 100
functions = 100
branches = 100
```

**Coverage must come from meaningful tests, not fake ones.**

---

# Quality Checklists

## Unit Test Checklist

- [ ] Tests import actual component (not mock replica)
- [ ] Each test would fail if tested code was broken
- [ ] No tautological assertions (`typeof x === "boolean"`)
- [ ] No prop self-verification
- [ ] No always-passing conditions
- [ ] Edge cases tested (null, undefined, empty, boundary)

## E2E Test Checklist

- [ ] Uses BDD structure (Given-When-Then)
- [ ] Test names are descriptive and user-centric
- [ ] Uses test IDs or semantic locators
- [ ] No arbitrary `waitForTimeout()` calls
- [ ] No lenient fallbacks
- [ ] Strict timeouts (5s page, 3s interactions)
- [ ] Runs in parallel without conflicts

---

# Reference Files

## Unit Testing

- `bunfig.toml` - Test configuration and coverage thresholds
- `packages/ui/src/test-setup.ts` - Test environment setup
- `packages/ui/src/primitives/button.test.tsx` - Good rendering example
- `packages/lib/src/relationships.test.ts` - Good logic example

## E2E Testing

- `apps/web/playwright.config.ts` - Playwright configuration
- `apps/web/e2e/fixtures/test-base.ts` - Custom fixtures
- `apps/web/e2e/helpers/bdd-helpers.ts` - BDD step helpers
- `apps/web/e2e/pages/` - Page Object classes
