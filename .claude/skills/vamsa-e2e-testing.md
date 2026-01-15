---
name: vamsa-e2e-testing
description: Write user workflow-focused E2E tests for Vamsa using Playwright. Use this skill when creating or modifying E2E tests. Tests must simulate real user journeys with BDD structure (Given-When-Then), strict assertions, and no lenient fallbacks.
---

# Vamsa E2E Testing Guide

This skill enforces Vamsa's E2E testing philosophy: **user workflow-focused tests that catch real problems**. Tests simulate complete user journeys, not isolated component checks. Every test should answer: "Can the user accomplish this task?"

## Philosophy: User Workflows, Not Unit Tests

### What E2E Tests ARE For

- **Complete user journeys**: Login → navigate → perform action → verify result
- **Real functionality validation**: Does the feature work from the user's perspective?
- **Cross-page flows**: Multi-step workflows that span multiple routes
- **Error states**: What happens when things go wrong?
- **Permission checks**: Can the right users access the right things?
- **State persistence**: Does data survive navigation and page refresh?

### What E2E Tests ARE NOT For

- **Implementation details**: Don't test React state or internal functions
- **Visual regression**: Use Percy or Chromatic for that
- **Performance benchmarks**: Use Lighthouse for that
- **Unit-level logic**: Use Bun test for that
- **Component isolation**: That's what unit tests are for

### The Golden Rule

> If you can test it faster and more reliably with a unit test, use a unit test.
> E2E tests are for **user journeys that cross boundaries**.

---

## Test Architecture

### Framework & Configuration

- **Framework**: Playwright (Chromium-only for speed)
- **Location**: `apps/web/e2e/**/*.spec.ts`
- **Config**: `apps/web/playwright.config.ts`
- **Execution**: 8 parallel workers, ~3 minute target
- **Database**: Real `vamsa_test` PostgreSQL database (seeded)

### File Organization

Tests organized by **user-facing workflow**, not technical layer:

```
e2e/
├── auth.spec.ts              # Login, logout, session management
├── register.spec.ts          # User registration flows
├── change-password.spec.ts   # Password management
├── people.spec.ts            # Person list, search, filtering
├── person-forms.spec.ts      # Create/edit person forms
├── relationships.spec.ts     # Family relationship management
├── tree.spec.ts              # Family tree visualization
├── dashboard.spec.ts         # Dashboard overview
├── admin.spec.ts             # Admin-only functions
├── backup.spec.ts            # GEDCOM import/export
├── claim-profile.spec.ts     # Profile claiming workflows
├── i18n-language-switching.spec.ts  # Internationalization
├── fixtures/                 # Test data and setup
├── pages/                    # Page Object classes
└── helpers/                  # BDD helpers, custom matchers
```

---

## BDD Structure (REQUIRED)

Every test MUST use Given-When-Then structure via the `bdd` helper. This is non-negotiable.

### Why BDD?

- HTML reporter shows clear workflow hierarchy
- Failed tests pinpoint exact step in user journey
- Non-technical stakeholders can read test logic
- Each step gets individual timing/screenshots

### Using the BDD Helper

```typescript
import { test, expect } from "../fixtures/test-base";
import { bdd } from "../helpers/bdd-helpers";

test("should successfully create a new person", async ({ page }) => {
  await bdd.given("user is logged in as admin", async () => {
    // Pre-authenticated via storage state - just verify
    await page.goto("/people");
    await expect(page.getByTestId("main-nav")).toBeVisible();
  });

  await bdd.when("user fills out the person form", async () => {
    await page.getByTestId("add-person-button").click();
    await page.getByTestId("person-form-firstName").fill("John");
    await page.getByTestId("person-form-lastName").fill("Smith");
    await page.getByTestId("person-form-submit").click();
  });

  await bdd.then("person is created and visible in the list", async () => {
    await expect(page.getByText("John Smith")).toBeVisible();
    await expect(page).toHaveURL(/\/people/);
  });
});
```

### Available BDD Steps

```typescript
import { bdd } from "../helpers/bdd-helpers";

bdd.given("description", async () => {
  /* preconditions */
});
bdd.when("description", async () => {
  /* user action */
});
bdd.then("description", async () => {
  /* assertions */
});
bdd.and("description", async () => {
  /* additional step */
});
bdd.but("description", async () => {
  /* exception case */
});
```

### Step Description Guidelines

- Use **user-centric language**: "user clicks submit button" not "button click handler fires"
- Be **specific**: "user fills in email field with 'test@example.com'" not "user fills form"
- Include **context**: "user navigates to protected route: /admin" not "user goes to page"

---

## Selectors: Test IDs Over CSS

### The Problem with CSS Selectors

```typescript
// ❌ BAD - Brittle, breaks on refactor
await page.click("div.card > div:nth-child(2) > button.btn-primary");

// ❌ BAD - Tied to implementation
await page.click(".MuiButton-root");
```

### Use Test IDs

```typescript
// ✅ GOOD - Semantic, stable
await page.getByTestId("person-form-submit").click();
await page.getByTestId("login-email-input").fill("test@example.com");
```

### Use Semantic Locators When Appropriate

```typescript
// ✅ GOOD - Accessible by role
await page.getByRole("button", { name: "Submit" }).click();
await page.getByLabel("Email").fill("test@example.com");

// ✅ GOOD - By text content
await page.getByText("John Smith").click();
```

### Test ID Naming Convention

```
{component}-{element}-{modifier}

Examples:
- login-form
- login-email-input
- login-submit-button
- person-form-firstName
- person-card-{personId}
- main-nav
- signout-button
```

### Adding Test IDs to Components

```tsx
// In React component
<form data-testid="login-form">
  <input data-testid="login-email-input" {...emailProps} />
  <button data-testid="login-submit-button" type="submit">
    Sign In
  </button>
</form>
```

---

## Page Objects

Page Objects encapsulate page-specific selectors and interactions. Use them for reusability and maintainability.

### When to Use Page Objects

- Page is used in multiple tests
- Page has complex interactions
- Selectors might change during refactoring

### Page Object Pattern

```typescript
// e2e/pages/LoginPage.ts
import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.getByTestId("login-form");
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");
    this.errorMessage = page.getByTestId("login-error-message");
  }

  async goto() {
    await this.page.goto("/login");
    await this.form.waitFor({ state: "visible", timeout: 5000 });
  }

  async login(email: string, password: string) {
    // Use type() not fill() for React controlled components
    await this.emailInput.type(email, { delay: 50 });
    await this.passwordInput.type(password, { delay: 50 });
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async getErrorText(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }
}
```

### Using Page Objects in Tests

```typescript
import { LoginPage } from "../pages/LoginPage";

test("should show error for invalid credentials", async ({ page }) => {
  const loginPage = new LoginPage(page);

  await bdd.given("user is on login page", async () => {
    await loginPage.goto();
  });

  await bdd.when("user submits invalid credentials", async () => {
    await loginPage.login("invalid@example.com", "wrongpassword");
  });

  await bdd.then("error message is displayed", async () => {
    await loginPage.expectError("Invalid email or password");
  });
});
```

### Existing Page Objects

Located in `e2e/pages/`:

- `LoginPage` - Authentication UI
- `Navigation` - Global nav (handles desktop/mobile)
- `PeopleListPage` - Search, filtering, person selection
- `PersonDetailPage` - View person details
- `PersonFormPage` - Create/edit person forms
- `DashboardPage` - Dashboard overview
- `AdminPage` - Admin panel

---

## Authentication

### Pre-Authentication Strategy

Tests use saved browser state to skip login. Global setup authenticates users once and saves the session.

```typescript
// Default: Tests run as authenticated admin
// Auth state loaded from .auth/admin.json

test("should see admin panel", async ({ page }) => {
  await page.goto("/admin");
  // Already authenticated - no login needed
});
```

### Test as Different Users

```typescript
// Test as member (not admin)
test.use({ storageState: ".auth/member.json" });

test("member should not see admin panel", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/403|\/login/);
});
```

### Test Unauthenticated State

```typescript
// Clear authentication for this test
test.use({ storageState: { cookies: [], origins: [] } });

test("should redirect to login when not authenticated", async ({ page }) => {
  await page.goto("/people");
  await expect(page).toHaveURL(/\/login/);
});
```

### Using Login Fixture

For tests that need to explicitly test login:

```typescript
import { test, expect } from "../fixtures/test-base";
import { TEST_USERS } from "../fixtures/test-users";

test("should login successfully", async ({ page, login }) => {
  await bdd.when("user logs in with valid credentials", async () => {
    await login(TEST_USERS.admin);
  });

  await bdd.then("user is redirected to authenticated page", async () => {
    await expect(page).toHaveURL(/\/(people|dashboard)/);
  });
});
```

### Test Users

```typescript
export const TEST_USERS = {
  admin: {
    email: "admin@test.vamsa.local",
    password: "TestAdmin123!",
    name: "Test Admin",
    role: "ADMIN",
  },
  member: {
    email: "member@test.vamsa.local",
    password: "TestMember123!",
    name: "Test Member",
    role: "MEMBER",
  },
  viewer: {
    email: "viewer@test.vamsa.local",
    password: "TestViewer123!",
    name: "Test Viewer",
    role: "VIEWER",
  },
};
```

---

## Custom Fixtures & Helpers

### Available Test Fixtures

```typescript
import { test, expect } from "../fixtures/test-base";

test("example", async ({
  page,
  login, // (user?: TestUser) => Promise<void>
  logout, // () => Promise<void>
  clearAuth, // () => Promise<void>
  isAuthenticated, // () => Promise<boolean>
  getViewportInfo, // () => { width, height, isMobile, isTablet }
  checkAccessibility, // (options?) => Promise<AccessibilityViolation[]>
}) => {
  // Use fixtures as needed
});
```

### Custom Expect Matchers

```typescript
import { vamsaExpect } from "../helpers/vamsa-expect";

// Toast notifications
await vamsaExpect.toHaveToast(page, "Person created successfully");

// Error messages
await vamsaExpect.toHaveError(page, "Email is required");

// Authentication state
await vamsaExpect.toBeLoggedIn(page);
await vamsaExpect.toBeLoggedOut(page);
```

### Accessibility Testing

```typescript
test("should have no accessibility violations", async ({
  page,
  checkAccessibility,
}) => {
  await page.goto("/people");

  await bdd.then("page is accessible", async () => {
    const violations = await checkAccessibility();
    expect(violations.filter((v) => v.impact === "critical")).toHaveLength(0);
  });
});
```

---

## Anti-Patterns (CRITICAL)

### Lessons learned from real bugs that slipped through tests.

### 1. Never Use Arbitrary Waits

```typescript
// ❌ BAD - Arbitrary timeout
await page.waitForTimeout(2000);
await page.click("button");

// ✅ GOOD - Wait for specific condition
await page.getByTestId("submit-button").waitFor({ state: "visible" });
await page.getByTestId("submit-button").click();
```

### 2. Never Use Lenient Fallbacks

```typescript
// ❌ BAD - Fallback hides failures
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
await expect(page.locator("main")).toBeVisible(); // Always passes!

// ✅ GOOD - Strict assertion on actual content
const tree = page.locator("[data-tree]");
const emptyState = page.locator('text="No family tree"');
await expect(tree.or(emptyState)).toBeVisible({ timeout: 5000 });
```

### 3. Never Use Always-Passing Assertions

```typescript
// ❌ BAD - Always passes due to || true
expect(hasTree || isEmpty || true).toBeTruthy();

// ✅ GOOD - Actual assertion
expect(hasTree || isEmpty).toBeTruthy();
```

### 4. Never Use Timeouts Longer Than Expected Load Time

```typescript
// ❌ BAD - 60s timeout when page should load in 5s
await page.waitForSelector("[data-tree]", { timeout: 60000 });

// ✅ GOOD - Strict timeout based on expected performance
await page.waitForSelector("[data-tree]", { timeout: 5000 });
```

### 5. Never Test Implementation Details

```typescript
// ❌ BAD - Testing internal state
const reactState = await page.evaluate(() => window.__REACT_STATE__);
expect(reactState.isLoading).toBe(false);

// ✅ GOOD - Testing user-visible outcome
await expect(page.getByTestId("loading-spinner")).not.toBeVisible();
await expect(page.getByTestId("person-list")).toBeVisible();
```

### 6. Never Mix Unrelated Workflows

```typescript
// ❌ BAD - Testing multiple unrelated things
test("various features work", async ({ page }) => {
  // Test login
  // Test person creation
  // Test export
  // Test admin settings
});

// ✅ GOOD - One focused workflow per test
test("should create person and see them in list", async ({ page }) => {
  // Only tests person creation workflow
});
```

### 7. Never Swallow Errors

```typescript
// ❌ BAD - Error swallowed
await page.click("button").catch(() => {});

// ✅ GOOD - Let errors fail the test
await page.click("button");
```

---

## Writing Good Tests

### Test Structure Template

```typescript
import { test, expect } from "../fixtures/test-base";
import { bdd } from "../helpers/bdd-helpers";

test.describe("Feature Name", () => {
  test.describe("Scenario Category", () => {
    test("should [expected behavior] when [condition]", async ({ page }) => {
      await bdd.given("[precondition]", async () => {
        // Setup - navigate, verify state
      });

      await bdd.when("[user action]", async () => {
        // The action being tested
      });

      await bdd.then("[expected outcome]", async () => {
        // Assertions - what should be true after action
      });
    });
  });
});
```

### Good Test Naming

```typescript
// ✅ GOOD - Descriptive, user-centric
test("should display error message when email is invalid");
test("should redirect to login when session expires");
test("should create person and show success toast");
test("should allow admin to delete member");

// ❌ BAD - Vague, technical
test("test form validation");
test("check redirect");
test("person CRUD");
test("admin permissions");
```

### Testing Error States

```typescript
test("should display validation errors for invalid input", async ({ page }) => {
  await bdd.given("user is on person creation form", async () => {
    await page.goto("/people/new");
  });

  await bdd.when("user submits form without required fields", async () => {
    await page.getByTestId("person-form-submit").click();
  });

  await bdd.then("validation errors are displayed", async () => {
    await expect(page.getByTestId("firstName-error")).toContainText(
      "First name is required"
    );
    await expect(page.getByTestId("lastName-error")).toContainText(
      "Last name is required"
    );
  });
});
```

### Testing Protected Routes

```typescript
test.describe("Protected Routes", () => {
  // Use unauthenticated state
  test.use({ storageState: { cookies: [], origins: [] } });

  const protectedRoutes = ["/people", "/dashboard", "/admin", "/tree"];

  for (const route of protectedRoutes) {
    test(`should redirect ${route} to login when not authenticated`, async ({
      page,
    }) => {
      await bdd.when(`user navigates to ${route}`, async () => {
        await page.goto(route);
      });

      await bdd.then("user is redirected to login", async () => {
        await expect(page).toHaveURL(/\/login/);
      });
    });
  }
});
```

### Testing Role-Based Access

```typescript
test.describe("Admin-only Features", () => {
  test.describe("as member", () => {
    test.use({ storageState: ".auth/member.json" });

    test("should not have access to admin panel", async ({ page }) => {
      await bdd.when("member navigates to admin panel", async () => {
        await page.goto("/admin");
      });

      await bdd.then("access is denied", async () => {
        await expect(page).toHaveURL(/\/403/);
        // OR redirected away
        await expect(page.getByText("Access Denied")).toBeVisible();
      });
    });
  });

  test.describe("as admin", () => {
    // Default storage state is admin

    test("should have access to admin panel", async ({ page }) => {
      await bdd.when("admin navigates to admin panel", async () => {
        await page.goto("/admin");
      });

      await bdd.then("admin panel is accessible", async () => {
        await expect(page).toHaveURL(/\/admin/);
        await expect(page.getByTestId("admin-panel")).toBeVisible();
      });
    });
  });
});
```

---

## Responsive Testing

### Test Mobile Viewports

```typescript
test.describe("Mobile Navigation", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should show mobile menu button", async ({ page }) => {
    await page.goto("/dashboard");

    await bdd.then("mobile menu button is visible", async () => {
      await expect(page.getByTestId("mobile-menu-button")).toBeVisible();
      await expect(page.getByTestId("desktop-nav")).not.toBeVisible();
    });
  });
});
```

### Use Viewport Info Helper

```typescript
test("should adapt to viewport", async ({ page, getViewportInfo }) => {
  const { isMobile, isTablet } = getViewportInfo();

  if (isMobile) {
    await expect(page.getByTestId("mobile-nav")).toBeVisible();
  } else {
    await expect(page.getByTestId("desktop-nav")).toBeVisible();
  }
});
```

---

## Performance Expectations

### Strict Timeouts

Tests should fail fast when things are slow:

```typescript
// Page load: 5 seconds max
await page.goto("/tree");
await page.waitForSelector("[data-tree]", { timeout: 5000 });

// User interactions: 3 seconds max
await page.getByTestId("submit").click();
await expect(page.getByText("Success")).toBeVisible({ timeout: 3000 });

// API responses: 5 seconds max
await expect(page.getByTestId("person-list")).toBeVisible({ timeout: 5000 });
```

### Performance Monitoring (Optional)

```typescript
test("should load tree page within performance budget", async ({ page }) => {
  const startTime = Date.now();

  await page.goto("/tree");
  await page.waitForSelector("[data-tree]", { state: "visible" });

  const loadTime = Date.now() - startTime;

  await bdd.then("page loads within 5 seconds", async () => {
    expect(loadTime).toBeLessThan(5000);
  });
});
```

---

## Running Tests

### Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI (interactive mode)
pnpm test:e2e --ui

# Run specific file
pnpm test:e2e auth.spec.ts

# Run tests matching pattern
pnpm test:e2e --grep "login"

# Debug mode
pnpm test:e2e --debug

# Generate report
pnpm test:e2e --reporter=html
```

### Reports & Artifacts

- **HTML Report**: `test-output/playwright/` (interactive)
- **JSON Results**: `test-output/results.json`
- **Traces**: Recorded on first retry
- **Screenshots**: Captured on failure
- **Videos**: Retained on failure

---

## Quality Checklist

Before submitting E2E tests, verify:

- [ ] Uses BDD structure (Given-When-Then)
- [ ] Test names are descriptive and user-centric
- [ ] Uses test IDs or semantic locators (not brittle CSS)
- [ ] No arbitrary `waitForTimeout()` calls
- [ ] No lenient fallbacks that hide failures
- [ ] No always-passing assertions (`|| true`)
- [ ] Strict timeouts (5s page load, 3s interactions)
- [ ] Error states are tested
- [ ] Runs in parallel without conflicts
- [ ] Passes on CI (not just locally)

---

## Reference Files

- `apps/web/playwright.config.ts` - Playwright configuration
- `apps/web/e2e/fixtures/test-base.ts` - Custom fixtures
- `apps/web/e2e/helpers/bdd-helpers.ts` - BDD step helpers
- `apps/web/e2e/helpers/vamsa-expect.ts` - Custom matchers
- `apps/web/e2e/pages/` - Page Object classes
- `.claude/e2e-test-improvements.md` - Lessons learned from bugs
