# E2E Test Improvements Needed

## Issue: Tree Page SSR Timeout Not Caught by E2E Tests

The tree page was experiencing 60-second SSR timeouts, but E2E tests passed. Here's why:

### Root Cause Analysis

**Test Location**: `apps/web/e2e/admin.spec.ts:510-620`

#### Problem 1: Lenient Timeouts

```typescript
// Line 522: Only waits 10 seconds, but SSR timeout is 60 seconds
.waitFor({ state: "visible", timeout: 10000 })
```

The test gives up after 10 seconds, but the actual SSR timeout is 60 seconds. The page might show a loading spinner within 10 seconds, making the test pass even though it will eventually timeout.

#### Problem 2: Fallback Chains Hide Failures

```typescript
// Lines 518-534: Race condition with lenient fallbacks
await Promise.race([
  page.locator("canvas, svg, [data-tree]").first().waitFor(...).catch(() => {}),
  page.locator('text="No family tree"').first().waitFor(...).catch(() => {}),
  page.locator("main").first().waitFor(...).catch(() => {}),
]);

await expect(page.locator("main").first()).toBeVisible();
```

If the tree fails to load, the test falls back to checking if the main element is visible. Since the main element loads during SSR (before the timeout), this passes!

#### Problem 3: Always-Passing Assertion

```typescript
// Line 572: This ALWAYS passes!
expect(hasTree || isEmpty || true).toBeTruthy();
```

The `|| true` makes this assertion always pass, even if both `hasTree` and `isEmpty` are false.

### Recommended Improvements

#### 1. Add Dedicated Tree E2E Tests

Create `apps/web/e2e/tree.spec.ts` with:

```typescript
test.describe("Family Tree", () => {
  test.describe("Tree Page Loading", () => {
    test("should load tree page within 5 seconds", async ({ page }) => {
      const startTime = Date.now();

      await page.goto("/tree?view=focused");

      // Wait for tree to render (not just loading spinner)
      await page.waitForSelector('[role="application"]', {
        state: "visible",
        timeout: 5000, // Stricter timeout
      });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000);
    });

    test("should not show SSR timeout errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });

      await page.goto("/tree?view=focused");

      // Verify no SSR stream timeout errors
      expect(errors.some((e) => e.includes("SSR stream"))).toBe(false);
      expect(errors.some((e) => e.includes("ECONNRESET"))).toBe(false);
    });

    test("should render tree nodes within 3 seconds", async ({ page }) => {
      await page.goto("/tree?view=focused");

      // Wait for actual tree nodes, not just the container
      await page.waitForSelector("[data-id]", {
        state: "visible",
        timeout: 3000,
      });

      // Verify at least one person node is rendered
      const nodes = await page.locator("[data-id]").count();
      expect(nodes).toBeGreaterThan(0);
    });
  });

  test.describe("Tree Interactions", () => {
    test("should zoom in/out on tree", async ({ page }) => {
      await page.goto("/tree?view=focused");
      await page.waitForSelector('[role="application"]');

      // Test zoom controls exist and work
      // ...
    });

    test("should expand ancestors", async ({ page }) => {
      await page.goto("/tree?view=focused");
      await page.waitForSelector('button:has-text("Expand Ancestors")');

      // Click expand and verify more nodes appear
      // ...
    });
  });
});
```

#### 2. Fix Existing Tree Tests

In `apps/web/e2e/admin.spec.ts`:

```typescript
// BEFORE (Line 572):
expect(hasTree || isEmpty || true).toBeTruthy();

// AFTER:
expect(hasTree || isEmpty).toBeTruthy();
```

```typescript
// BEFORE (Lines 518-536):
await Promise.race([...fallbacks]);
await expect(page.locator("main").first()).toBeVisible();

// AFTER:
// Remove Promise.race, directly assert tree or empty state
const tree = page.locator("canvas, svg, [data-tree]").first();
const emptyState = page.locator('text="No family tree"').first();

// Wait for EITHER tree OR empty state (no fallback to main)
await expect(tree.or(emptyState)).toBeVisible({ timeout: 5000 });
```

#### 3. Add Performance Monitoring

```typescript
test("should monitor page load performance", async ({ page }) => {
  const metrics = await page.evaluate(() => {
    const perfData = performance.getEntriesByType("navigation")[0];
    return {
      domContentLoaded:
        perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
    };
  });

  expect(metrics.domContentLoaded).toBeLessThan(3000);
  expect(metrics.loadComplete).toBeLessThan(5000);
});
```

#### 4. Add Critical Path Testing

Test that critical user flows complete successfully:

```typescript
test("complete user flow: login -> people -> tree -> person detail", async ({
  page,
}) => {
  await page.goto("/login");
  // Login
  await page.fill('input[type="email"]', "admin@test.vamsa.local");
  await page.fill('input[type="password"]', "test");
  await page.click('button[type="submit"]');

  // Navigate to people
  await page.click('a[href="/people"]');
  await expect(page).toHaveURL(/\/people/);
  await page.waitForSelector("table", { timeout: 3000 });

  // Navigate to tree
  await page.click('a[href="/tree"]');
  await expect(page).toHaveURL(/\/tree/);
  await page.waitForSelector('[role="application"]', { timeout: 3000 });

  // Click a person node
  await page.click("[data-id]");
  await expect(page).toHaveURL(/\/people\/.+/);
});
```

### Summary

The E2E tests were too lenient with:

1. **Timeouts**: 10s timeout when page actually takes 60s to fail
2. **Fallbacks**: Tests fall back to checking basic elements instead of actual tree
3. **Assertions**: Always-passing assertions (`|| true`)

**Fix**: Make tests stricter, remove lenient fallbacks, add dedicated tree tests that verify actual functionality within reasonable timeframes (3-5 seconds).
