# Vamsa E2E Test Suite

Comprehensive end-to-end testing for the Vamsa genealogy application using Playwright and BDD (Behavior-Driven Development) methodology.

## Philosophy

Our E2E tests focus on **functional user workflows**, not fake benchmarks or visual regression. Tests are written in BDD style to:

- **Document behavior**: Tests serve as living documentation of how the application works
- **User-centric**: Focus on complete user journeys, not isolated component testing
- **Maintainable**: Clear Given-When-Then structure makes tests easy to understand and update
- **Reliable**: Avoid flaky tests by testing real functionality, not timing-dependent visuals

### What We Test

✅ **Authentication workflows** - Login, registration, password changes, OIDC
✅ **Profile management** - Creating, editing, claiming profiles
✅ **Relationship management** - Adding, editing family relationships
✅ **Family tree visualization** - ReactFlow tree interactions
✅ **Data import/export** - GEDCOM import, backup/restore
✅ **Internationalization** - Language switching, translated errors
✅ **Admin functions** - User management, suggestions, invites

### What We Don't Test

❌ Visual regression (use Percy or Chromatic if needed)
❌ Performance benchmarks (use Lighthouse or dedicated perf tools)
❌ Fake "happy path" tests that don't validate real functionality
❌ Unit test equivalents (use Bun test for those)

## Performance Metrics

Our optimized test suite dramatically reduces execution time while maintaining comprehensive coverage:

| Metric             | Before      | After       | Improvement                                 |
| ------------------ | ----------- | ----------- | ------------------------------------------- |
| **Execution Time** | 45 minutes  | ~3 minutes  | 🚀 **92% reduction**                        |
| **Test Count**     | 158 tests   | ~110 tests  | ✂️ **30% reduction** (focused on workflows) |
| **Code Size**      | 5,170 lines | 2,390 lines | 📉 **54% reduction**                        |
| **Test Flakiness** | High        | Low         | ⚡ Reliable, repeatable tests               |

## BDD Structure

All tests use the `bdd` fixture from our test framework for clear Given-When-Then structure:

```typescript
import { test, expect, bdd } from "./fixtures";

test("should login with valid credentials", async ({ page }) => {
  await bdd.given("user is on login page", async () => {
    await page.goto("/login");
  });

  await bdd.when("user enters valid credentials", async () => {
    await page.fill('input[name="email"]', "admin@vamsa.local");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
  });

  await bdd.then("user is redirected to dashboard", async () => {
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

### Benefits of BDD Style

1. **Self-documenting**: Anyone can read the test and understand the workflow
2. **Business alignment**: Tests map directly to user stories and requirements
3. **Debugging**: Failures show exactly which step broke (Given/When/Then)
4. **Collaboration**: Non-technical stakeholders can validate test scenarios

## Running Tests

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers (one-time)
npx playwright install
```

### Run All Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e --ui

# Run specific test file
pnpm test:e2e auth.spec.ts

# Run tests matching a title
pnpm test:e2e --grep "login"
```

### Debug Mode

```bash
# Run in debug mode with Playwright Inspector
pnpm test:e2e --debug

# Run specific test in debug mode
pnpm test:e2e auth.spec.ts:12 --debug
```

### Generate Reports

```bash
# Run tests and generate HTML report
pnpm test:e2e --reporter=html

# Open the report
npx playwright show-report
```

## Writing New Tests

### 1. Choose the Right Test File

Organize tests by feature area:

- **auth.spec.ts** - Login, logout, session management
- **register.spec.ts** - User registration flows
- **change-password.spec.ts** - Password management
- **claim-profile.spec.ts** - Profile claiming workflows
- **people.spec.ts** - Person list and search
- **person-forms.spec.ts** - Creating and editing persons
- **relationships.spec.ts** - Family relationship management
- **tree.spec.ts** - Family tree visualization (ReactFlow)
- **backup.spec.ts** - Data import/export, GEDCOM
- **admin.spec.ts** - Admin-only functions
- **dashboard.spec.ts** - Dashboard and overview pages
- **i18n-language-switching.spec.ts** - Internationalization

### 2. Use Page Objects

Leverage our page object models for cleaner tests:

```typescript
import { LoginPage, PersonFormPage } from "./fixtures/page-objects";

test("should create a new person", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("admin@vamsa.local", "password123");

  const personForm = new PersonFormPage(page);
  await personForm.goto();
  await personForm.fillBasicInfo({
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1990-01-15",
  });
  await personForm.submit();
});
```

### 3. Follow BDD Pattern

Always use Given-When-Then structure:

```typescript
test("descriptive test name", async ({ page }) => {
  // Given - Set up the initial state
  await bdd.given("description of preconditions", async () => {
    // Setup code
  });

  // When - Perform the action being tested
  await bdd.when("description of user action", async () => {
    // Action code
  });

  // Then - Verify the outcome
  await bdd.then("description of expected result", async () => {
    // Assertion code
  });
});
```

### 4. Use Appropriate Test Fixtures

Choose the right fixture for your test:

```typescript
// Authenticated as admin
test.use({ storageState: ".auth/admin.json" });

// Authenticated as regular user
test.use({ storageState: ".auth/user.json" });

// Not authenticated (login page tests)
test.use({ storageState: { cookies: [], origins: [] } });
```

## Anti-Patterns to Avoid

### ❌ Don't: Test implementation details

```typescript
// Bad - tests React state
test("should update state on input", async ({ page }) => {
  await page.evaluate(() => {
    const input = document.querySelector("input");
    input.dispatchEvent(new Event("change"));
  });
});
```

### ✅ Do: Test user-visible behavior

```typescript
// Good - tests what users see and do
test("should display error when email is invalid", async ({ page }) => {
  await page.fill('input[name="email"]', "invalid");
  await page.click('button[type="submit"]');
  await expect(page.getByText("Invalid email")).toBeVisible();
});
```

### ❌ Don't: Create brittle selectors

```typescript
// Bad - breaks when HTML structure changes
await page.click("div > div > button:nth-child(3)");
```

### ✅ Do: Use semantic selectors

```typescript
// Good - resilient to structure changes
await page.click('button[type="submit"]');
await page.getByRole("button", { name: "Login" }).click();
await page.getByLabel("Email address").fill("test@example.com");
```

### ❌ Don't: Test multiple unrelated things

```typescript
// Bad - too much in one test
test("should do everything", async ({ page }) => {
  await loginPage.login();
  await personForm.create({ firstName: "John" });
  await relationshipForm.addRelation();
  await backupPage.export();
  // ... 50 more lines
});
```

### ✅ Do: Keep tests focused

```typescript
// Good - one workflow per test
test("should create a new person", async ({ page }) => {
  await loginPage.login();
  await personForm.create({ firstName: "John" });
  await expect(page.getByText("Person created")).toBeVisible();
});

test("should export backup", async ({ page }) => {
  await loginPage.login();
  await backupPage.export();
  await expect(page.getByText("Backup complete")).toBeVisible();
});
```

### ❌ Don't: Use arbitrary waits

```typescript
// Bad - flaky and slow
await page.click("button");
await page.waitForTimeout(5000); // Arbitrary wait
```

### ✅ Do: Wait for specific conditions

```typescript
// Good - fast and reliable
await page.click("button");
await expect(page.getByText("Success")).toBeVisible();
```

## Workflow Coverage Matrix

See [COVERAGE.md](./COVERAGE.md) for detailed workflow coverage analysis and identified gaps.

## Test Data Management

### Test Users

Pre-configured test users are created during global setup:

- **Admin**: `admin@vamsa.local` / `password123`
- **Regular User**: `user@vamsa.local` / `password123`

Authentication state is saved in `.auth/*.json` and reused across tests for speed.

### Test Database

Tests use a dedicated test database (`vamsa_test`) that is:

1. **Seeded** with base data in `global-setup.ts`
2. **Isolated** per test worker for parallel execution
3. **Cleaned** (optional) in `global-teardown.ts`

## CI/CD Integration

Tests run automatically on every PR and push to main:

```yaml
# .github/workflows/e2e.yml
- name: Run E2E tests
  run: pnpm test:e2e --reporter=html,json

- name: Upload test results
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

### Quality Gates

E2E tests enforce these quality gates:

- ✅ All tests must pass (no flaky tests tolerated)
- ✅ Critical accessibility violations fail the build
- ✅ Test execution time must be < 5 minutes
- ✅ Test coverage must include all critical user workflows

## Accessibility Testing

All tests automatically check for critical accessibility violations using `@axe-core/playwright`:

```typescript
import { test, expect, bdd } from "./fixtures";

test("should be accessible", async ({ page, makeAxeBuilder }) => {
  await page.goto("/dashboard");

  const accessibilityScanResults = await makeAxeBuilder()
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Troubleshooting

### Tests are failing locally but passing in CI

1. **Database state**: Ensure your local test database is clean

   ```bash
   pnpm db:reset:test
   ```

2. **Browser version**: Update Playwright browsers

   ```bash
   npx playwright install
   ```

3. **Port conflicts**: Make sure port 3000 is available
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

### Tests are slow

1. **Run in parallel**: Playwright runs tests in parallel by default

   ```bash
   pnpm test:e2e --workers=4
   ```

2. **Use storageState**: Reuse authentication instead of logging in every test

   ```typescript
   test.use({ storageState: ".auth/admin.json" });
   ```

3. **Avoid unnecessary waits**: Use `expect()` with auto-waiting instead of `waitForTimeout()`

### Tests are flaky

1. **Add explicit waits**: Wait for specific elements/states

   ```typescript
   await expect(page.getByText("Loaded")).toBeVisible();
   ```

2. **Increase timeout for slow operations**:

   ```typescript
   await expect(page.getByText("Loaded")).toBeVisible({ timeout: 10000 });
   ```

3. **Check for race conditions**: Ensure async operations complete before assertions

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [BDD with Playwright](https://playwright.dev/docs/best-practices)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)

## Contributing

When adding new tests:

1. Follow the BDD pattern (Given-When-Then)
2. Use page objects for reusable interactions
3. Keep tests focused on one workflow
4. Add descriptive test names
5. Document new page objects
6. Update COVERAGE.md with new workflow coverage

For questions or improvements, reach out to the team or open an issue.
