# E2E Testing Recipes

Domain-specific E2E testing patterns, fixtures, and Page Objects for Vamsa. Use these as templates when writing Playwright tests.

---

## Test Users & Authentication

### Available Test Users

```typescript
import { TEST_USERS } from "../fixtures/test-base";

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

### Pattern: Test as Different User Roles

```typescript
import { test, expect } from "../fixtures/test-base";
import { bdd } from "../fixtures/bdd-helpers";

// Default: runs as admin (via storage state)
test("admin can access admin panel", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByTestId("admin-panel")).toBeVisible();
});

// Test as member
test.describe("as member", () => {
  test.use({ storageState: ".auth/member.json" });

  test("member cannot access admin panel", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/403/);
  });
});

// Test as unauthenticated
test.describe("unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects to login", async ({ page }) => {
    await page.goto("/people");
    await expect(page).toHaveURL(/\/login/);
  });
});
```

### Pattern: Explicit Login Flow

```typescript
import { test, expect, TEST_USERS } from "../fixtures/test-base";

test("should login successfully", async ({ page, login }) => {
  await bdd.given("user is on login page", async () => {
    await page.goto("/login");
  });

  await bdd.when("user logs in with valid credentials", async () => {
    await login(TEST_USERS.admin);
  });

  await bdd.then("user is redirected to authenticated page", async () => {
    await expect(page).toHaveURL(/\/(people|dashboard)/);
  });
});
```

### Pattern: Clear Authentication Mid-Test

```typescript
test("should handle session expiry", async ({ page, login, clearAuth }) => {
  await login();
  await page.goto("/dashboard");

  // Clear auth to simulate session expiry
  await clearAuth();

  // Navigate to protected route
  await page.goto("/people");
  await expect(page).toHaveURL(/\/login/);
});
```

---

## Page Objects

### LoginPage

```typescript
import { LoginPage } from "../fixtures/page-objects";

test("login error handling", async ({ page }) => {
  const loginPage = new LoginPage(page);

  await bdd.given("user is on login page", async () => {
    await loginPage.goto();
  });

  await bdd.when("user enters invalid credentials", async () => {
    await loginPage.login("invalid@example.com", "wrongpassword");
  });

  await bdd.then("error message is displayed", async () => {
    const error = await loginPage.getErrorText();
    expect(error).toContain("Invalid");
  });
});
```

### Navigation

```typescript
import { Navigation } from "../fixtures/page-objects";

test("navigation works", async ({ page }) => {
  const nav = new Navigation(page);

  await page.goto("/dashboard");

  // Navigate to different pages
  await nav.goToPeople();
  await expect(page).toHaveURL("/people");

  await nav.goToVisualize();
  await expect(page).toHaveURL(/\/visualize/);

  // Sign out
  await nav.signOut();
  await expect(page).toHaveURL("/login");
});

// Check responsive navigation
test("mobile navigation", async ({ page }) => {
  const nav = new Navigation(page);

  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/dashboard");

  const isMobile = await nav.isMobileNav();
  expect(isMobile).toBe(true);
});
```

### PeopleListPage

```typescript
import { PeopleListPage } from "../fixtures/page-objects";

test("search for people", async ({ page }) => {
  const peoplePage = new PeopleListPage(page);

  await bdd.given("user is on people page", async () => {
    await peoplePage.goto();
  });

  await bdd.when("user searches for 'John'", async () => {
    await peoplePage.search("John");
  });

  await bdd.then("filtered results are shown", async () => {
    await peoplePage.waitForLoad();
    const count = await peoplePage.getPersonCount();
    expect(count).toBeGreaterThan(0);
  });
});
```

### PersonFormPage

```typescript
import { PersonFormPage } from "../fixtures/page-objects";

test("create new person", async ({ page }) => {
  const form = new PersonFormPage(page);

  await bdd.given("user is on person creation form", async () => {
    await page.goto("/people/new");
    await form.waitForFormReady();
  });

  await bdd.when("user fills and submits the form", async () => {
    await form.fillBasicInfo({
      firstName: "John",
      lastName: "Doe",
    });
    await form.submit();
  });

  await bdd.then("person is created", async () => {
    await expect(page).not.toHaveURL(/\/new/);
    await expect(page.getByText("John Doe")).toBeVisible();
  });
});

// Test with full form
test("create person with all details", async ({ page }) => {
  const form = new PersonFormPage(page);

  await page.goto("/people/new");
  await form.waitForFormReady();

  await form.fillFullForm({
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1985-01-15",
    birthPlace: "New York, USA",
    bio: "A test person for E2E testing.",
  });

  await form.submit();
});
```

### AdminPage

```typescript
import { AdminPage } from "../fixtures/page-objects";

test("navigate admin tabs", async ({ page }) => {
  const admin = new AdminPage(page);

  await bdd.given("admin is on admin panel", async () => {
    await admin.goto();
  });

  await bdd.when("admin clicks Users tab", async () => {
    await admin.selectUsersTab();
  });

  await bdd.then("users list is displayed", async () => {
    await expect(page).toHaveURL(/users/);
  });
});
```

---

## Responsive Testing

### Viewport Constants

```typescript
import { VIEWPORTS, VIEWPORT_ARRAY } from "../fixtures/viewports";

// Standard viewports
VIEWPORTS.mobile; // { width: 375, height: 667, name: "mobile" }
VIEWPORTS.tablet; // { width: 768, height: 1024, name: "tablet" }
VIEWPORTS.desktop; // { width: 1920, height: 1080, name: "desktop" }
```

### Pattern: Test Across All Viewports

```typescript
import { VIEWPORT_ARRAY } from "../fixtures/viewports";

for (const viewport of VIEWPORT_ARRAY) {
  test(`navigation works on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/dashboard");

    // Test navigation is accessible
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();
  });
}
```

### Pattern: Mobile-Specific Tests

```typescript
test.describe("Mobile Navigation", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("shows mobile menu button", async ({ page }) => {
    await page.goto("/dashboard");

    await bdd.then("mobile menu button is visible", async () => {
      await expect(page.getByTestId("nav-mobile-menu-button")).toBeVisible();
      await expect(page.getByTestId("nav-desktop")).not.toBeVisible();
    });
  });

  test("mobile menu opens and closes", async ({ page }) => {
    await page.goto("/dashboard");

    const menuButton = page.getByTestId("nav-mobile-menu-button");
    await menuButton.click();

    // Menu should be open
    await expect(page.getByTestId("nav-mobile-menu")).toBeVisible();

    // Click outside to close
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("nav-mobile-menu")).not.toBeVisible();
  });
});
```

### Pattern: Using ResponsiveTestHelper

```typescript
import { ResponsiveTestHelper } from "../fixtures/viewports";

test("content adapts to viewport", async ({ page }) => {
  const responsive = new ResponsiveTestHelper(page);

  await page.goto("/dashboard");

  // Test across all viewports
  await responsive.testAcrossViewports(async (viewport, helper) => {
    const { deviceType } = helper.getCurrentViewport();

    if (deviceType === "mobile") {
      await expect(page.getByTestId("mobile-nav")).toBeVisible();
    } else {
      await expect(page.getByTestId("desktop-nav")).toBeVisible();
    }
  });
});
```

---

## Form Validation

### Pattern: Test Empty Form Submission

```typescript
import { formValidation } from "../fixtures/form-validation";

test("prevents empty login submission", async ({ page }) => {
  await formValidation.testEmptySubmission(page, {
    formUrl: "/login",
    formTestId: "login-form",
    submitButtonTestId: "login-submit-button",
    fields: [
      {
        testId: "login-email-input",
        fieldName: "email",
        testValue: "test@example.com",
      },
      {
        testId: "login-password-input",
        fieldName: "password",
        testValue: "TestPass123!",
      },
    ],
  });
});
```

### Pattern: Test Required Field

```typescript
import { formValidation } from "../fixtures/form-validation";

test("requires first name", async ({ page }) => {
  await formValidation.testRequiredField(
    page,
    {
      formUrl: "/people/new",
      formTestId: "person-form",
      submitButtonTestId: "person-form-submit",
      fields: [
        {
          testId: "person-form-firstName",
          fieldName: "first name",
          testValue: "John",
        },
        {
          testId: "person-form-lastName",
          fieldName: "last name",
          testValue: "Doe",
        },
      ],
    },
    "person-form-firstName", // Field to leave empty
    ["person-form-lastName"] // Fields to fill
  );
});
```

### Pattern: Test Password Validation

```typescript
import { formValidation } from "../fixtures/form-validation";

test("rejects weak password", async ({ page }) => {
  await formValidation.testPasswordValidation(
    page,
    {
      formUrl: "/register",
      formTestId: "register-form",
      submitButtonTestId: "register-submit-button",
      fields: [
        {
          testId: "register-name-input",
          fieldName: "name",
          testValue: "John Doe",
        },
        {
          testId: "register-email-input",
          fieldName: "email",
          testValue: "test@example.com",
        },
        {
          testId: "register-password-input",
          fieldName: "password",
          testValue: "",
        },
        {
          testId: "register-confirm-password-input",
          fieldName: "confirm password",
          testValue: "",
        },
      ],
    },
    "register-password-input",
    "register-confirm-password-input",
    "short" // Invalid password (too short)
  );
});

test("rejects mismatched passwords", async ({ page }) => {
  await formValidation.testPasswordMismatch(
    page,
    {
      formUrl: "/register",
      formTestId: "register-form",
      submitButtonTestId: "register-submit-button",
      fields: [
        {
          testId: "register-name-input",
          fieldName: "name",
          testValue: "John Doe",
        },
        {
          testId: "register-email-input",
          fieldName: "email",
          testValue: "test@example.com",
        },
        {
          testId: "register-password-input",
          fieldName: "password",
          testValue: "",
        },
        {
          testId: "register-confirm-password-input",
          fieldName: "confirm password",
          testValue: "",
        },
      ],
    },
    "register-password-input",
    "register-confirm-password-input",
    "TestPassword123!",
    "DifferentPassword123!"
  );
});
```

### Pattern: Test Email Validation

```typescript
import { formValidation } from "../fixtures/form-validation";

test("rejects invalid email", async ({ page }) => {
  await formValidation.testEmailValidation(
    page,
    {
      formUrl: "/register",
      formTestId: "register-form",
      submitButtonTestId: "register-submit-button",
      fields: [
        { testId: "register-email-input", fieldName: "email", testValue: "" },
        {
          testId: "register-password-input",
          fieldName: "password",
          testValue: "TestPass123!",
        },
      ],
    },
    "register-email-input",
    "not-an-email" // Invalid email
  );
});
```

### Pattern: Test Keyboard Navigation

```typescript
import { formValidation } from "../fixtures/form-validation";

test("form is keyboard navigable", async ({ page }) => {
  await formValidation.testFormKeyboardNavigation(
    page,
    {
      formUrl: "/login",
      formTestId: "login-form",
      submitButtonTestId: "login-submit-button",
      fields: [],
    },
    "login-email-input",
    "login-password-input"
  );
});
```

---

## Accessibility Testing

### Pattern: Check Page Accessibility

```typescript
import { test, expect } from "../fixtures/test-base";
import { assertNoCriticalA11yViolations } from "../fixtures/accessibility";

test("people page is accessible", async ({ page, checkAccessibility }) => {
  await page.goto("/people");

  await bdd.then("page has no critical a11y violations", async () => {
    const violations = await checkAccessibility();
    assertNoCriticalA11yViolations(violations, "People Page");
  });
});
```

### Pattern: Check Specific Element

```typescript
test("form is accessible", async ({ page, checkAccessibility }) => {
  await page.goto("/people/new");

  const violations = await checkAccessibility({
    selector: "[data-testid='person-form']",
  });

  assertNoCriticalA11yViolations(violations);
});
```

### Pattern: Skip Specific Rules

```typescript
test("dashboard accessibility (skip color-contrast)", async ({
  page,
  checkAccessibility,
}) => {
  await page.goto("/dashboard");

  // Skip color-contrast rule if it's a known issue being worked on
  const violations = await checkAccessibility({
    skipRules: ["color-contrast"],
  });

  assertNoCriticalA11yViolations(violations);
});
```

### Pattern: Log Violations for Debugging

```typescript
import { logA11yViolations, getA11ySummary } from "../fixtures/accessibility";

test("debug accessibility issues", async ({ page, checkAccessibility }) => {
  await page.goto("/visualize");

  const violations = await checkAccessibility();

  // Log all violations for debugging
  logA11yViolations(violations, "Visualize Page");

  // Get summary
  console.log(getA11ySummary(violations));
});
```

---

## Custom Assertions

### vamsaExpect Matchers

```typescript
import { vamsaExpect } from "../fixtures/test-base";

test("shows success toast", async ({ page }) => {
  // ... perform action ...

  await vamsaExpect.toHaveToast(page, "Person created successfully");
});

test("shows error message", async ({ page }) => {
  // ... perform invalid action ...

  await vamsaExpect.toHaveError(page, "Email is required");
});

test("verifies login state", async ({ page }) => {
  await page.goto("/dashboard");
  await vamsaExpect.toBeLoggedIn(page);

  // Or verify logged out
  await page.goto("/login");
  await vamsaExpect.toBeLoggedOut(page);
});
```

---

## React Hydration Handling

### The Problem

React controlled inputs can appear "visible" and "editable" before React attaches `onChange` handlers. Typing into such inputs results in:

1. Native browser accepts the text
2. React hydrates and reconciles with empty state
3. React RESETS the input to empty

### Pattern: Poke and Verify

```typescript
// Fill field with retry and verification
async function fillField(page: Page, locator: Locator, text: string) {
  await locator.waitFor({ state: "visible", timeout: 5000 });

  for (let attempt = 1; attempt <= 3; attempt++) {
    await locator.click();
    await page.waitForTimeout(100);
    await locator.fill(text);
    await page.waitForTimeout(150);

    const currentValue = await locator.inputValue();
    if (currentValue === text) return;

    // Retry with selectText + type
    if (attempt < 3) {
      await locator.click();
      await locator.selectText().catch(() => {});
      await locator.type(text, { delay: 30 });
    }
  }

  throw new Error(`Failed to fill field after 3 retries`);
}
```

### Waiting for Elements (Default Pattern)

**DO NOT use `waitForLoadState("networkidle")` in regular E2E tests.** It is non-deterministic, slow, and can be flaky with polling/websockets.

Instead, use **element visibility + hydration timeout**:

```typescript
// Good: Wait for specific element, then hydration timeout
await element.waitFor({ state: "visible", timeout: 10000 });
await page.waitForTimeout(500); // React hydration

// Bad: Don't use networkidle for regular tests
await page.waitForLoadState("networkidle"); // Avoid this
```

### Documented networkidle Exceptions

These specific locations use `networkidle` with documented justification:

**1. Login form** (`test-base.ts`, `page-objects.ts` LoginPage)

- **Why**: Under parallel execution, React controlled inputs can be "visible" and "editable" before React attaches `onChange` handlers. The native input accepts text, then React hydrates and resets the input to empty state.
- **Impact**: Login is critical infrastructure - all authenticated tests depend on it working reliably.
- **Future fix**: Add a deterministic React hydration detection (e.g., `data-hydrated` attribute, custom event).

**2. Person creation form** (`relationships.spec.ts`, `person-forms.spec.ts`)

- **Why**: Same React hydration issue as login - form inputs appear ready but onChange handlers aren't attached yet.
- **Impact**: Relationship tests and edit tests depend on successfully creating a person first.
- **Future fix**: Same as login - deterministic hydration detection.

```typescript
// EXCEPTION: These forms require networkidle
await page.waitForLoadState("networkidle").catch(() => {});
```

### When networkidle Might Be Acceptable (General)

- Testing specific network behavior
- Waiting for all assets to load for performance testing
- Explicit requirement for full page load verification

**Future improvement**: Add a `data-hydrated` attribute or custom event after React hydration completes.

---

## File Structure Reference

```
apps/web/e2e/
├── fixtures/
│   ├── test-base.ts         # Core fixtures (login, logout, a11y)
│   ├── page-objects.ts      # Page Object Models
│   ├── bdd-helpers.ts       # Given/When/Then helpers
│   ├── viewports.ts         # Responsive testing
│   ├── form-validation.ts   # Form validation helpers
│   ├── accessibility.ts     # A11y assertion helpers
│   └── index.ts             # Barrel exports
├── auth.spec.ts             # Authentication tests
├── register.spec.ts         # Registration tests
├── people.spec.ts           # People list tests
├── person-forms.spec.ts     # Person CRUD tests
├── relationships.spec.ts    # Relationship management
├── tree.spec.ts             # Family tree visualization
├── admin.spec.ts            # Admin panel tests
├── backup.spec.ts           # GEDCOM import/export
└── ...
```
