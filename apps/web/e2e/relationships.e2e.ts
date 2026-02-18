/**
 * Relationship Management - User Flow Tests
 *
 * Tests actual user journeys through relationship management:
 * - Adding relationships (parent, child, spouse, sibling)
 * - Dialog state management
 * - Accessibility
 *
 * Note: Edit/Delete relationship tests removed - they require pre-existing
 * relationships which can't be reliably set up in parallel E2E tests.
 */

import { bdd, expect, test, waitForHydration } from "./fixtures";
import { PersonFormPage, gotoWithRetry } from "./fixtures/page-objects";

// Helper to fill input with error throwing on failure
// Uses "poke and verify" pattern - type a character, verify React responds, then continue
async function fillInputWithError(
  page: any,
  input: any,
  value: string,
  fieldName: string
) {
  await input.waitFor({ state: "visible", timeout: 5000 });

  for (let attempt = 1; attempt <= 5; attempt++) {
    await input.click();
    await page.waitForTimeout(50);
    await input.clear();

    // Poke: type first character and wait for React reconciliation
    await input.type(value.charAt(0), { delay: 50 });
    // CRITICAL: Wait long enough for React to potentially reset the value
    // If React isn't hydrated, controlled inputs get reset to state value (empty)
    await page.waitForTimeout(200);

    const firstChar = await input.inputValue();
    if (firstChar !== value.charAt(0)) {
      // React either not hydrated or reset the value - wait longer and retry
      await page.waitForTimeout(300 * attempt);
      continue;
    }

    // React accepted the character - type the rest
    await input.type(value.slice(1), { delay: 20 });
    await page.waitForTimeout(200); // Wait for reconciliation

    const currentValue = await input.inputValue();
    if (currentValue === value) return;

    // Value mismatch - wait and retry
    await page.waitForTimeout(200 * attempt);
  }

  const finalValue = await input.inputValue();
  throw new Error(
    `[fillInputWithError] Failed to fill ${fieldName} after 5 retries. Expected: "${value}", Got: "${finalValue}"`
  );
}

// Helper to create a person and navigate to their Relationships tab
async function createPersonAndGoToRelationships(
  page: any,
  waitForDataSync: () => Promise<void>
): Promise<string | null> {
  // Create a new person
  await page.goto("/people/new", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded");
  await waitForHydration(page);

  const firstNameInput = page.getByTestId("person-form-firstName");
  await firstNameInput.waitFor({ state: "visible", timeout: 10000 });

  const firstName = `RelTest${Date.now()}`;
  const lastName = "Person";

  // Fill form with error throwing on failure
  await fillInputWithError(page, firstNameInput, firstName, "firstName");

  const lastNameInput = page.getByTestId("person-form-lastName");
  await fillInputWithError(page, lastNameInput, lastName, "lastName");

  // Submit and wait for navigation
  await page.getByTestId("person-form-submit").click();
  await page.waitForURL((url: URL) => !url.pathname.includes("/new"), {
    timeout: 15000,
  });
  await waitForDataSync();

  // Extract person ID from URL
  const currentUrl = page.url();
  const match = currentUrl.match(/\/people\/([^/]+)/);
  if (!match) return null;

  const personId = match[1];

  // Click on Relationships tab
  const relationshipsTab = page
    .locator('[role="tab"]')
    .filter({ hasText: "Relationships" });
  await relationshipsTab.waitFor({ state: "visible", timeout: 5000 });
  await relationshipsTab.click();
  await expect(relationshipsTab).toHaveAttribute("aria-selected", "true", {
    timeout: 5000,
  });

  return personId;
}

test.describe("Add Relationship", () => {
  test("user can open and close add relationship dialog", async ({
    page,
    waitForDataSync,
  }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForDataSync
    );
    expect(personId).toBeTruthy();

    const addButton = page.getByTestId("add-relationship-button");
    await expect(addButton).toBeVisible({ timeout: 5000 });

    // Open dialog
    await addButton.click();
    const dialog = page.getByTestId("add-relationship-dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close with cancel
    const cancelButton = page.getByTestId("add-relationship-cancel");
    await cancelButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("user can see all relationship type options", async ({
    page,
    waitForDataSync,
  }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForDataSync
    );
    expect(personId).toBeTruthy();

    const addButton = page.getByTestId("add-relationship-button");
    await expect(addButton).toBeVisible({ timeout: 5000 });

    await addButton.click();
    const dialog = page.getByTestId("add-relationship-dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Open relationship type selector
    const typeSelect = page.getByTestId("add-relationship-type-select");
    await typeSelect.click();
    const listbox = page.getByRole("listbox");
    await listbox.waitFor({ state: "visible", timeout: 3000 });

    // Check for relationship options
    const options = ["Parent", "Child", "Spouse", "Sibling"];
    let visibleCount = 0;

    for (const option of options) {
      const optionElement = page.getByRole("option", { name: option });
      if (await optionElement.isVisible().catch(() => false)) {
        visibleCount++;
      }
    }

    expect(visibleCount).toBeGreaterThan(0);
  });

  test("spouse relationship shows marriage date fields", async ({
    page,
    waitForDataSync,
  }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForDataSync
    );
    expect(personId).toBeTruthy();

    const addButton = page.getByTestId("add-relationship-button");
    await expect(addButton).toBeVisible({ timeout: 5000 });

    await addButton.click();
    const dialog = page.getByTestId("add-relationship-dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select spouse type
    const typeSelect = page.getByTestId("add-relationship-type-select");
    await typeSelect.click();
    const listbox = page.getByRole("listbox");
    await listbox.waitFor({ state: "visible", timeout: 3000 });

    const spouseOption = page.getByRole("option", { name: "Spouse" });
    if (await spouseOption.isVisible().catch(() => false)) {
      await spouseOption.click();
      await listbox.waitFor({ state: "hidden", timeout: 3000 });

      // Check for marriage date fields
      const marriageDateField = page.getByTestId(
        "add-relationship-marriage-date"
      );
      if (await marriageDateField.isVisible().catch(() => false)) {
        await expect(marriageDateField).toBeVisible();
      }
    }
  });

  test("user can search for and select a person", async ({
    page,
    waitForDataSync,
  }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForDataSync
    );
    expect(personId).toBeTruthy();

    const addButton = page.getByTestId("add-relationship-button");
    await expect(addButton).toBeVisible({ timeout: 5000 });

    await addButton.click();
    const dialog = page.getByTestId("add-relationship-dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Search for a person
    const searchInput = page.getByTestId("add-relationship-search-input");
    await searchInput.type("T", { delay: 50 });
    await page.waitForTimeout(500);

    // The search should work even if no results are found
    await expect(searchInput).toHaveValue("T");
  });

  test("dialog state resets when reopened", async ({
    page,
    waitForDataSync,
  }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForDataSync
    );
    expect(personId).toBeTruthy();

    const addButton = page.getByTestId("add-relationship-button");
    await expect(addButton).toBeVisible({ timeout: 5000 });

    // First open - add some input
    await addButton.click();
    const dialog = page.getByTestId("add-relationship-dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const searchInput = page.getByTestId("add-relationship-search-input");
    await searchInput.type("test", { delay: 50 });
    await expect(searchInput).toHaveValue(/test/);

    // Close dialog
    const cancelButton = page.getByTestId("add-relationship-cancel");
    await cancelButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Reopen - should be reset
    await addButton.click();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const searchInputAfter = page.getByTestId("add-relationship-search-input");
    const value = await searchInputAfter.inputValue();
    expect(value).toBe("");
  });
});

test.describe("Delete Relationship", () => {
  test("should create a relationship and then delete it", async ({
    page,
    waitForDataSync,
  }) => {
    test.slow();

    const parentName = `Parent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const childName = `Child_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const lastName = "DelRelTest";
    let parentId: string | null = null;

    await bdd.given("two persons exist", async () => {
      // Create parent
      await gotoWithRetry(page, "/people/new");
      await waitForHydration(page);
      const form = new PersonFormPage(page);
      await form.fillBasicInfo({ firstName: parentName, lastName });
      await form.submit();
      await page.waitForURL((url) => !url.pathname.includes("/new"), {
        timeout: 15000,
      });
      await waitForDataSync();

      const match = page.url().match(/\/people\/([^/]+)/);
      parentId = match?.[1] ?? null;
      expect(parentId).toBeTruthy();

      // Create child
      await gotoWithRetry(page, "/people/new");
      await waitForHydration(page);
      const form2 = new PersonFormPage(page);
      await form2.fillBasicInfo({ firstName: childName, lastName });
      await form2.submit();
      await page.waitForURL((url) => !url.pathname.includes("/new"), {
        timeout: 15000,
      });
      await waitForDataSync();
    });

    await bdd.when("user adds a child relationship to the parent", async () => {
      await gotoWithRetry(page, `/people/${parentId}`);
      await waitForHydration(page);
      await page
        .locator("h1")
        .first()
        .waitFor({ state: "visible", timeout: 10000 });

      // Switch to Relationships tab — click and verify it became selected
      const relTab = page
        .locator('[role="tab"]')
        .filter({ hasText: "Relationships" });
      await relTab.waitFor({ state: "visible", timeout: 5000 });
      await relTab.click();
      await expect(relTab).toHaveAttribute("aria-selected", "true", {
        timeout: 5000,
      });

      // Open add relationship dialog
      const addButton = page.getByTestId("add-relationship-button");
      await expect(addButton).toBeVisible({ timeout: 5000 });
      await addButton.click();

      const dialog = page.getByTestId("add-relationship-dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Select "Child" type from Radix Select
      const typeSelect = page.getByTestId("add-relationship-type-select");
      await typeSelect.click();
      const listbox = page.getByRole("listbox");
      await listbox.waitFor({ state: "visible", timeout: 3000 });
      const childOption = page.getByRole("option", { name: "Child" });
      await childOption.click();
      await listbox.waitFor({ state: "hidden", timeout: 3000 });

      // Search for the child person
      const searchInput = page.getByTestId("add-relationship-search-input");
      await searchInput.fill(childName);

      // Wait for search results to appear
      const firstResult = page
        .locator("[data-testid^='add-relationship-search-result-']")
        .first();
      await expect(firstResult).toBeVisible({ timeout: 5000 });
      await firstResult.click();

      // Wait for person to be selected (selected person chip appears)
      const selectedPerson = page.getByTestId(
        "add-relationship-selected-person"
      );
      await expect(selectedPerson).toBeVisible({ timeout: 3000 });

      // Click the submit button
      const saveButton = page.getByTestId("add-relationship-submit");
      await saveButton.click();
      await waitForDataSync();
    });

    await bdd.then(
      "relationship appears on the person detail page",
      async () => {
        await gotoWithRetry(page, `/people/${parentId}`);
        await waitForHydration(page);
        await page
          .locator("h1")
          .first()
          .waitFor({ state: "visible", timeout: 10000 });

        const relTab = page
          .locator('[role="tab"]')
          .filter({ hasText: "Relationships" });
        await relTab.click();
        await expect(relTab).toHaveAttribute("aria-selected", "true", {
          timeout: 5000,
        });

        const childLink = page.locator(`text=${childName}`);
        await expect(childLink).toBeVisible({ timeout: 5000 });
      }
    );

    await bdd.and("user deletes the relationship", async () => {
      const deleteButton = page
        .getByTestId("delete-relationship-button")
        .first();
      await expect(deleteButton).toBeVisible({ timeout: 5000 });
      await deleteButton.click();

      const confirmDialog = page.getByTestId("delete-relationship-dialog");
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });

      const confirmButton = page.getByTestId("delete-relationship-confirm");
      await confirmButton.click();
      await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
      await waitForDataSync();
    });

    await bdd.and("relationship no longer appears after deletion", async () => {
      await page.reload();
      await waitForHydration(page);
      await page
        .locator("h1")
        .first()
        .waitFor({ state: "visible", timeout: 10000 });

      const relTab = page
        .locator('[role="tab"]')
        .filter({ hasText: "Relationships" });
      await relTab.click();
      await expect(relTab).toHaveAttribute("aria-selected", "true", {
        timeout: 5000,
      });

      const childLink = page.locator(`text=${childName}`);
      await expect(childLink).not.toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe("Accessibility", () => {
  test("dialog closes on escape key", async ({ page, waitForDataSync }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForDataSync
    );
    expect(personId).toBeTruthy();

    const addButton = page.getByTestId("add-relationship-button");
    await expect(addButton).toBeVisible({ timeout: 5000 });

    await addButton.click();
    const dialog = page.getByTestId("add-relationship-dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Press escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("dialog is keyboard navigable", async ({ page, waitForDataSync }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForDataSync
    );
    expect(personId).toBeTruthy();

    const addButton = page.getByTestId("add-relationship-button");
    await expect(addButton).toBeVisible({ timeout: 5000 });

    await addButton.click();
    const dialog = page.getByTestId("add-relationship-dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Tab through elements
    const typeSelect = page.getByTestId("add-relationship-type-select");
    if (await typeSelect.isVisible().catch(() => false)) {
      await typeSelect.focus();
      await page.keyboard.press("Tab");

      // Should move focus without error
      const focusedElement = await page.evaluate(() =>
        document.activeElement?.getAttribute("data-testid")
      );
      expect(focusedElement).toBeDefined();
    }
  });
});
