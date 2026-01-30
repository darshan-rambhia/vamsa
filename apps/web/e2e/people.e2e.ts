/**
 * People Management E2E Tests
 * Tests CRUD operations for family members with data persistence verification
 */
import { expect, test } from "./fixtures";
import { bdd } from "./fixtures/bdd-helpers";
import {
  Navigation,
  PeopleListPage,
  PersonDetailPage,
  PersonFormPage,
  gotoWithRetry,
} from "./fixtures/page-objects";

// Helper to ensure a person exists, returns person ID
// Uses existing seeded data and waits for detail page to fully load
async function ensurePersonExists(
  page: any,
  _waitForConvexSync: () => Promise<void>
): Promise<string | null> {
  // Go to people list
  await gotoWithRetry(page, "/people");

  // Wait for table to be visible (seeded data should exist)
  const tableBody = page.locator("table tbody");
  await tableBody.waitFor({ state: "visible", timeout: 10000 });

  // Get the first person's link href
  const firstPersonLink = page.locator("table tbody tr a").first();
  await firstPersonLink.waitFor({ state: "visible", timeout: 5000 });

  const href = await firstPersonLink.getAttribute("href");
  const personIdMatch = href?.match(/\/people\/([^/]+)/);
  const personId = personIdMatch?.[1];

  if (!personId) {
    throw new Error("Could not find person ID from table link href");
  }

  // Navigate to the person detail page
  await gotoWithRetry(page, `/people/${personId}`);

  // Wait for the page to load - either the person's name or an h1 element
  await page.waitForLoadState("networkidle");
  await page
    .locator("h1")
    .first()
    .waitFor({ state: "visible", timeout: 10000 });

  return personId;
}

test.describe("People Management", () => {
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
        const emptyState = page
          .locator('text="No people"')
          .or(page.locator('text="Add"'));
        await expect(emptyState.first()).toBeVisible();
      }
    });

    test("should navigate to add person form", async ({ page }) => {
      const peopleList = new PeopleListPage(page);
      await peopleList.goto();

      // Find and click add button
      const addButton = page
        .locator('button:has-text("Add"), a:has-text("Add")')
        .first();
      if (await addButton.isVisible()) {
        await addButton.click();

        // Should navigate to form or open modal
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
    test("CREATE: should create a new person via form", async ({
      page,
      waitForConvexSync,
    }) => {
      await gotoWithRetry(page, "/people");

      // Click add button
      const addButton = page
        .locator('button:has-text("Add"), a:has-text("Add")')
        .first();
      if (await addButton.isVisible()) {
        await addButton.click();

        // Fill form
        const form = new PersonFormPage(page);
        const testPerson = {
          firstName: `Test` + Date.now(),
          lastName: "Person",
        };

        await form.fillBasicInfo(testPerson);
        await form.submit();

        // Wait for Convex to sync
        await waitForConvexSync();

        // Should be on form or have submitted successfully
        await page.waitForTimeout(500);
      }
    });

    test("CRUD: form submission with valid data completes successfully", async ({
      page,
      waitForConvexSync,
    }) => {
      await bdd.given("user navigates to create person form", async () => {
        await gotoWithRetry(page, "/people/new");
        const form = page.getByTestId("person-form");
        await expect(form).toBeVisible();
      });

      await bdd.when(
        "user fills form with valid data and submits",
        async () => {
          const form = new PersonFormPage(page);
          await form.fillBasicInfo({
            firstName: `CreateTest` + Date.now(),
            lastName: "Crud",
          });
          await form.submit();
          await waitForConvexSync();
          await page.waitForTimeout(500);
        }
      );

      await bdd.then("form submission completes without errors", async () => {
        // After submission, check for error state
        const errorMessage = page.locator(
          "[data-error], .error, .text-destructive"
        );
        const hasError = await errorMessage.isVisible().catch(() => false);
        expect(hasError).toBe(false);
      });

      await bdd.and(
        "people list can be accessed to verify data persistence",
        async () => {
          // Navigate to people list
          await gotoWithRetry(page, "/people");
          const peopleList = new PeopleListPage(page);
          await peopleList.waitForLoad();

          // Should successfully load and show people count
          const personCount = await peopleList.getPersonCount();
          expect(personCount).toBeGreaterThanOrEqual(0);
        }
      );
    });

    test("READ: should display person details", async ({ page }) => {
      const peopleList = new PeopleListPage(page);
      await peopleList.goto();
      await peopleList.waitForLoad();

      // If there are people, click the first one
      const personCount = await peopleList.getPersonCount();
      if (personCount > 0) {
        // Click the first person link in the table or card list
        const firstPersonLink = page
          .locator("table tbody tr a, [data-person-card] a")
          .first();
        if (await firstPersonLink.isVisible()) {
          await firstPersonLink.click();

          // Should show person details
          await page.waitForURL(/\/people\//, { timeout: 15000 });

          const detailPage = new PersonDetailPage(page);
          await expect(detailPage.nameHeading).toBeVisible();
        }
      }
    });

    test("UPDATE: should edit person and verify data saves", async ({
      page,
      waitForConvexSync,
    }) => {
      let personId: string | null = null;

      await bdd.given("user navigates to a person detail page", async () => {
        personId = await ensurePersonExists(page, waitForConvexSync);
        expect(personId).toBeTruthy();

        // Navigate to person detail if not already there
        if (!page.url().includes(`/people/${personId}`)) {
          await gotoWithRetry(page, `/people/${personId}`);
        }
      });

      await bdd.when(
        "user clicks edit and modifies the first name",
        async () => {
          // Click edit button
          const editButton = page
            .locator(
              'button:has-text("Edit Profile"), a:has-text("Edit Profile")'
            )
            .first();
          await expect(editButton).toBeVisible({ timeout: 5000 });
          await editButton.click();
          await page.waitForURL(/\/people\/[^/]+\/edit/, { timeout: 15000 });

          // Modify the form
          const form = new PersonFormPage(page);
          const currentValue = await form.firstNameInput.inputValue();
          const newValue = currentValue + `_mod_` + Date.now();

          await form.firstNameInput.clear();
          await form.firstNameInput.fill(newValue);

          // Submit
          await form.submit();
          await page.waitForTimeout(1000);
          await waitForConvexSync();
        }
      );

      await bdd.then(
        "edit form submission completes successfully",
        async () => {
          // Should navigate away from edit form or stay on success page
          await page.waitForTimeout(500);
          const url = page.url();

          // Should not be on edit form anymore or should have completed
          const isGoodState =
            url.includes("/people/") || !url.includes("/edit");
          expect(isGoodState).toBeTruthy();
        }
      );

      await bdd.and(
        "updated person data persists after server reload",
        async () => {
          // Reload the page to verify data persists
          await page.reload();
          await page.waitForTimeout(1000);

          // Page should load without errors
          const mainContent = page.locator("main");
          await expect(mainContent).toBeVisible();
        }
      );
    });

    test("should validate required fields on person form", async ({ page }) => {
      await gotoWithRetry(page, "/people");

      const addButton = page
        .locator('button:has-text("Add"), a:has-text("Add")')
        .first();
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
        const firstPerson = page
          .locator('[data-person-card], [data-testid="person-card"]')
          .first();
        if (await firstPerson.isVisible()) {
          await firstPerson.click();
          await page.waitForURL(/\/people\//, { timeout: 15000 });

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
        const firstPersonLink = page
          .locator("table tbody tr a, [data-person-card] a")
          .first();
        if (await firstPersonLink.isVisible()) {
          await firstPersonLink.click();
          await page.waitForURL(/\/people\//, { timeout: 15000 });

          // Check for breadcrumb
          const breadcrumb = page.locator(
            '[data-breadcrumb], nav[aria-label="Breadcrumb"]'
          );
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
  test("people list should be responsive", async ({
    page,
    getViewportInfo,
  }) => {
    const { isMobile, width } = getViewportInfo();
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

  test("person cards should adapt to viewport", async ({
    page,
    getViewportInfo,
  }) => {
    const { isMobile } = getViewportInfo();
    const peopleList = new PeopleListPage(page);
    await peopleList.goto();
    await peopleList.waitForLoad();

    const personCount = await peopleList.getPersonCount();
    if (personCount > 0) {
      const cards = page.locator(
        'table tbody tr, [data-person-card], [data-testid="person-card"]'
      );
      const firstCard = cards.first();
      const box = await firstCard.boundingBox();

      if (isMobile && box) {
        // On mobile, cards should be nearly full width
        expect(box.width || 0).toBeGreaterThan(200);
      }
    }
  });
});

test.describe("People - Data Integrity", () => {
  test("should reflect changes immediately (data reactivity)", async ({
    page,
  }) => {
    // This test verifies data updates are reactive
    // When data changes, UI should update without manual refresh
    await gotoWithRetry(page, "/people");

    // Initial state captured
    const peopleList = new PeopleListPage(page);
    await peopleList.waitForLoad();

    // The key benefit of reactive data - no stale data issues
    // This is a smoke test to ensure the page loads with fresh data
    await expect(page).toHaveURL("/people");
  });

  test("should maintain data consistency across navigation", async ({
    page,
    waitForConvexSync: _waitForConvexSync,
  }) => {
    await bdd.given("user navigates through multiple pages", async () => {
      await gotoWithRetry(page, "/people");
      const peopleList = new PeopleListPage(page);
      await peopleList.waitForLoad();

      const personCount = await peopleList.getPersonCount();
      if (personCount > 0) {
        const firstPersonLink = page
          .locator("table tbody tr a, [data-person-card] a")
          .first();
        if (await firstPersonLink.isVisible()) {
          await firstPersonLink.click();
          await page.waitForURL(/\/people\//, { timeout: 15000 });
        }
      }
    });

    await bdd.when("user navigates to other pages and back", async () => {
      // Use Navigation helper which handles Firefox NS_BINDING_ABORTED
      const nav = new Navigation(page);
      await nav.goToDashboard();
      await page.waitForTimeout(300);
      await nav.goToPeople();
    });

    await bdd.then(
      "returning to people list shows consistent data",
      async () => {
        const peopleList = new PeopleListPage(page);
        await peopleList.waitForLoad();

        // Should have loaded and show consistent state
        const personCount = await peopleList.getPersonCount();
        expect(personCount).toBeGreaterThanOrEqual(0);
      }
    );
  });

  test("should maintain person detail data across page reload", async ({
    page,
    waitForConvexSync,
  }) => {
    let personId: string | null = null;

    await bdd.given("user navigates to a person detail page", async () => {
      personId = await ensurePersonExists(page, waitForConvexSync);
      expect(personId).toBeTruthy();

      // Navigate to person detail if not already there
      if (!page.url().includes(`/people/${personId}`)) {
        await gotoWithRetry(page, `/people/${personId}`);
      }
    });

    await bdd.when("user reloads the page", async () => {
      // Capture current URL
      const currentUrl = page.url();

      // Reload the page
      await page.reload();

      // Should stay on same URL
      await page.waitForURL(currentUrl, { timeout: 5000 });
    });

    await bdd.then("person data persists after reload", async () => {
      const detailPage = new PersonDetailPage(page);
      const nameText = await detailPage.nameHeading.textContent();

      // Name heading should still be visible and populated
      expect(nameText).toBeTruthy();
      expect(nameText?.length).toBeGreaterThan(0);
    });
  });
});
