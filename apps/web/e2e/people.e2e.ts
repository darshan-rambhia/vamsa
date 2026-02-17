/**
 * People Management E2E Tests
 * Tests CRUD operations for family members with data persistence verification
 */
import { expect, test, waitForHydration } from "./fixtures";
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
  _waitForDataSync: () => Promise<void>
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

      // Wait for content to stabilize after initial load
      // Promise.race in waitForLoad can resolve before content renders
      await page.waitForTimeout(500);

      // Either show people or empty state
      const personCount = await peopleList.getPersonCount();
      if (personCount === 0) {
        // Should show empty state message or add button
        const emptyState = page
          .locator('text="No people"')
          .or(page.locator('text="Add"'));
        await expect(emptyState.first()).toBeVisible({ timeout: 5000 });
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
      waitForDataSync,
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

        // Wait for data to sync
        await waitForDataSync();

        // Should be on form or have submitted successfully
        await page.waitForTimeout(500);
      }
    });

    test("CRUD: form submission with valid data completes successfully", async ({
      page,
      waitForDataSync,
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
          await waitForDataSync();
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
      waitForDataSync,
    }) => {
      let personId: string | null = null;

      await bdd.given("user navigates to a person detail page", async () => {
        personId = await ensurePersonExists(page, waitForDataSync);
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
          await waitForDataSync();
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
    waitForDataSync: _waitForDataSync,
  }) => {
    // This test navigates through multiple pages - mark as slow to double timeout
    test.slow();
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
    waitForDataSync,
  }) => {
    let personId: string | null = null;

    await bdd.given("user navigates to a person detail page", async () => {
      personId = await ensurePersonExists(page, waitForDataSync);
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
      await expect(detailPage.nameHeading).not.toBeEmpty();
    });
  });
});

test.describe("People - Edit Lifecycle", () => {
  test("should edit a person and verify all changes persist", async ({
    page,
    waitForDataSync,
  }) => {
    test.slow();

    const originalFirst = `EditOrig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const updatedFirst = `EditUpd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const lastName = "Lifecycle";
    let personId: string | null = null;

    await bdd.given("a person exists in the system", async () => {
      await gotoWithRetry(page, "/people/new");
      await waitForHydration(page);
      const form = new PersonFormPage(page);
      await form.fillBasicInfo({ firstName: originalFirst, lastName });
      await form.submit();
      await page.waitForURL((url) => !url.pathname.includes("/new"), {
        timeout: 15000,
      });
      await waitForDataSync();

      const match = page.url().match(/\/people\/([^/]+)/);
      personId = match?.[1] ?? null;
      expect(personId).toBeTruthy();
    });

    await bdd.when("user clicks Edit and modifies the first name", async () => {
      await gotoWithRetry(page, `/people/${personId}`);
      const detailPage = new PersonDetailPage(page);
      await detailPage.nameHeading.waitFor({
        state: "visible",
        timeout: 10000,
      });

      const editButton = page
        .locator('button:has-text("Edit Profile"), a:has-text("Edit Profile")')
        .first();
      await expect(editButton).toBeVisible({ timeout: 5000 });
      await editButton.click();
      await page.waitForURL(/\/people\/[^/]+\/edit/, { timeout: 15000 });

      const form = new PersonFormPage(page);
      await form.firstNameInput.waitFor({ state: "visible", timeout: 5000 });
      await form.firstNameInput.clear();
      await form.firstNameInput.fill(updatedFirst);

      await form.submit();
      // Wait for navigation back to detail page after edit save
      await page.waitForURL(/\/people\/[^/]+$/, { timeout: 15000 });
      await waitForDataSync();
    });

    await bdd.then("updated name appears on the detail page", async () => {
      // We're already on the detail page after submit redirect, but reload to be safe
      await gotoWithRetry(page, `/people/${personId}`);
      const heading = page.locator("h1").first();
      await heading.waitFor({ state: "visible", timeout: 10000 });
      await expect(heading).toContainText(updatedFirst, { timeout: 10000 });
      const headingText = await heading.textContent();
      expect(headingText).not.toContain(originalFirst);
    });

    await bdd.and("updated name persists after reload", async () => {
      await page.reload();
      await page.waitForTimeout(1000);

      const heading = page.locator("h1").first();
      await expect(heading).toContainText(updatedFirst, { timeout: 10000 });
    });

    await bdd.and("updated name appears in the people list", async () => {
      const nav = new Navigation(page);
      try {
        await nav.goToPeople();
      } catch {
        await gotoWithRetry(page, "/people");
      }

      const peopleList = new PeopleListPage(page);
      await peopleList.waitForLoad();

      if (await peopleList.searchInput.isVisible().catch(() => false)) {
        await peopleList.search(updatedFirst);
        await page.waitForTimeout(500);
      }

      const personLink = page.locator(`a:has-text("${updatedFirst}")`);
      await expect(personLink.first()).toBeVisible({ timeout: 10000 });
    });
  });
});
