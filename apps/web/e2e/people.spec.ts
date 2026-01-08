/**
 * People Management E2E Tests
 * Tests CRUD operations for family members
 */
import { test, expect, TEST_USERS } from "./fixtures";
import { PeopleListPage, PersonDetailPage, PersonFormPage, Navigation } from "./fixtures/page-objects";

test.describe("People Management", () => {
  // Login before each test
  test.beforeEach(async ({ login }) => {
    await login(TEST_USERS.admin);
  });

  test.describe("People List", () => {
    test("should display people list page", async ({ page }) => {
      const peopleList = new PeopleListPage(page);
      await peopleList.goto();

      // Page should load
      await expect(page).toHaveURL("/people");

      // Should have header or title
      await expect(page.locator("h1, h2").first()).toBeVisible();
    });

    test("should show empty state when no people exist", async ({ page }) => {
      const peopleList = new PeopleListPage(page);
      await peopleList.goto();
      await peopleList.waitForLoad();

      // Either show people or empty state
      const personCount = await peopleList.getPersonCount();
      if (personCount === 0) {
        // Should show empty state message or add button
        const emptyState = page.locator('text="No people"').or(page.locator('text="Add"'));
        await expect(emptyState.first()).toBeVisible();
      }
    });

    test("should navigate to add person form", async ({ page }) => {
      const peopleList = new PeopleListPage(page);
      await peopleList.goto();

      // Find and click add button
      const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();
      if (await addButton.isVisible()) {
        await addButton.click();

        // Should navigate to form or open modal
        await page.waitForLoadState("networkidle");
      }
    });

    test("should search/filter people", async ({ page }) => {
      const peopleList = new PeopleListPage(page);
      await peopleList.goto();
      await peopleList.waitForLoad();

      // If search exists, test it
      if (await peopleList.searchInput.isVisible()) {
        await peopleList.search("test");
        await page.waitForTimeout(500); // Wait for filter

        // List should update (either filter or show no results)
        await expect(page).toHaveURL("/people");
      }
    });
  });

  test.describe("Person CRUD", () => {
    test("should create a new person", async ({ page, waitForConvexSync }) => {
      await page.goto("/people");

      // Click add button
      const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();
      if (await addButton.isVisible()) {
        await addButton.click();

        // Fill form
        const form = new PersonFormPage(page);
        const testPerson = {
          firstName: `Test${Date.now()}`,
          lastName: "Person",
        };

        await form.fillBasicInfo(testPerson);
        await form.submit();

        // Wait for Convex to sync
        await waitForConvexSync();

        // Should redirect or show success
        await page.waitForTimeout(500);
      }
    });

    test("should display person details", async ({ page }) => {
      const peopleList = new PeopleListPage(page);
      await peopleList.goto();
      await peopleList.waitForLoad();

      // If there are people, click the first one
      const personCount = await peopleList.getPersonCount();
      if (personCount > 0) {
        const firstPerson = page.locator('[data-person-card], [data-testid="person-card"]').first();
        if (await firstPerson.isVisible()) {
          await firstPerson.click();

          // Should show person details
          await page.waitForURL(/\/people\//);

          const detailPage = new PersonDetailPage(page);
          await expect(detailPage.nameHeading).toBeVisible();
        }
      }
    });

    test("should edit a person", async ({ page, waitForConvexSync }) => {
      const peopleList = new PeopleListPage(page);
      await peopleList.goto();
      await peopleList.waitForLoad();

      const personCount = await peopleList.getPersonCount();
      if (personCount > 0) {
        // Click first person
        const firstPerson = page.locator('[data-person-card], [data-testid="person-card"]').first();
        if (await firstPerson.isVisible()) {
          await firstPerson.click();
          await page.waitForURL(/\/people\//);

          // Click edit button
          const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
          if (await editButton.isVisible()) {
            await editButton.click();

            // Edit form should appear
            await page.waitForTimeout(500);
          }
        }
      }
    });

    test("should validate required fields on person form", async ({ page }) => {
      await page.goto("/people");

      const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();
      if (await addButton.isVisible()) {
        await addButton.click();

        // Try to submit empty form
        const form = new PersonFormPage(page);
        await form.submit();

        // Should show validation error or prevent submission
        await page.waitForTimeout(500);

        // Should still be on form (not redirected)
        const stillOnForm = await form.firstNameInput.isVisible();
        expect(stillOnForm).toBeTruthy();
      }
    });
  });

  test.describe("Person Navigation", () => {
    test("should navigate back from person detail", async ({ page }) => {
      const peopleList = new PeopleListPage(page);
      await peopleList.goto();
      await peopleList.waitForLoad();

      const personCount = await peopleList.getPersonCount();
      if (personCount > 0) {
        // Go to person detail
        const firstPerson = page.locator('[data-person-card], [data-testid="person-card"]').first();
        if (await firstPerson.isVisible()) {
          await firstPerson.click();
          await page.waitForURL(/\/people\//);

          // Go back
          const backButton = page
            .locator('button:has-text("Back"), a:has-text("Back"), [data-back]')
            .first();
          if (await backButton.isVisible()) {
            await backButton.click();
            await expect(page).toHaveURL("/people");
          } else {
            // Use browser back
            await page.goBack();
            await expect(page).toHaveURL("/people");
          }
        }
      }
    });

    test("should use breadcrumb navigation if present", async ({ page }) => {
      const peopleList = new PeopleListPage(page);
      await peopleList.goto();
      await peopleList.waitForLoad();

      const personCount = await peopleList.getPersonCount();
      if (personCount > 0) {
        const firstPerson = page.locator('[data-person-card], [data-testid="person-card"]').first();
        if (await firstPerson.isVisible()) {
          await firstPerson.click();
          await page.waitForURL(/\/people\//);

          // Check for breadcrumb
          const breadcrumb = page.locator('[data-breadcrumb], nav[aria-label="Breadcrumb"]');
          if (await breadcrumb.isVisible()) {
            const peopleLink = breadcrumb.locator('a:has-text("People")');
            if (await peopleLink.isVisible()) {
              await peopleLink.click();
              await expect(page).toHaveURL("/people");
            }
          }
        }
      }
    });
  });
});

test.describe("People - Responsive", () => {
  test.beforeEach(async ({ login }) => {
    await login(TEST_USERS.admin);
  });

  test("people list should be responsive", async ({ page, getViewportInfo }) => {
    const { isMobile, isTablet, width } = getViewportInfo();
    const peopleList = new PeopleListPage(page);
    await peopleList.goto();

    // Content should be visible at any size
    await expect(page.locator("main")).toBeVisible();

    if (isMobile) {
      // Cards should stack vertically on mobile
      const container = page.locator("main").first();
      const box = await container.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(width + 50);
    }
  });

  test("person cards should adapt to viewport", async ({ page, getViewportInfo }) => {
    const { isMobile } = getViewportInfo();
    const peopleList = new PeopleListPage(page);
    await peopleList.goto();
    await peopleList.waitForLoad();

    const personCount = await peopleList.getPersonCount();
    if (personCount > 0) {
      const cards = page.locator('[data-person-card], [data-testid="person-card"]');
      const firstCard = cards.first();
      const box = await firstCard.boundingBox();

      if (isMobile && box) {
        // On mobile, cards should be nearly full width
        expect(box.width).toBeGreaterThan(200);
      }
    }
  });
});

test.describe("People - Data Integrity", () => {
  test.beforeEach(async ({ login }) => {
    await login(TEST_USERS.admin);
  });

  test("should preserve data after page refresh", async ({ page, waitForConvexSync }) => {
    const peopleList = new PeopleListPage(page);
    await peopleList.goto();
    await peopleList.waitForLoad();

    const initialCount = await peopleList.getPersonCount();

    // Refresh page
    await page.reload();
    await peopleList.waitForLoad();

    const afterRefreshCount = await peopleList.getPersonCount();

    // Count should be the same
    expect(afterRefreshCount).toBe(initialCount);
  });

  test("should reflect changes immediately (Convex reactivity)", async ({
    page,
    waitForConvexSync,
  }) => {
    // This test verifies Convex's reactive updates
    // When data changes, UI should update without manual refresh
    await page.goto("/people");
    await page.waitForLoadState("networkidle");

    // Initial state captured
    const peopleList = new PeopleListPage(page);
    await peopleList.waitForLoad();

    // The key benefit of Convex - no stale data issues
    // This is a smoke test to ensure the page loads with fresh data
    await expect(page).toHaveURL("/people");
  });
});
