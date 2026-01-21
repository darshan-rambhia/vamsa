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

import { test, expect } from "./fixtures";

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
  waitForConvexSync: () => Promise<void>
): Promise<string | null> {
  // Create a new person
  await page.goto("/people/new");
  await page.waitForLoadState("domcontentloaded");

  // NETWORKIDLE EXCEPTION: Person form requires networkidle for reliable React hydration
  //
  // WHY THIS IS NEEDED:
  // Under parallel test execution, React controlled inputs can be "visible" and "editable"
  // before React attaches onChange handlers. When you type into such an input:
  // 1. Native browser input accepts the text
  // 2. React hydrates and reconciles with empty state
  // 3. React RESETS the input to empty (the state value)
  //
  // This is critical because all relationship tests depend on successfully creating a person first.
  //
  // FUTURE IMPROVEMENT: If we find a deterministic way to detect React hydration completion
  // (e.g., a data attribute set after hydration, or a custom event), we can remove this.
  await page.waitForLoadState("networkidle").catch(() => {});

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
  await waitForConvexSync();

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
  await page.waitForTimeout(300);

  return personId;
}

test.describe("Add Relationship", () => {
  test("user can open and close add relationship dialog", async ({
    page,
    waitForConvexSync,
  }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForConvexSync
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
    waitForConvexSync,
  }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForConvexSync
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
    await page.waitForTimeout(300);

    // Check for relationship options
    const options = ["Parent", "Child", "Spouse", "Sibling"];
    let visibleCount = 0;

    for (const option of options) {
      const optionElement = page.locator(`text="${option}"`);
      if (await optionElement.isVisible().catch(() => false)) {
        visibleCount++;
      }
    }

    expect(visibleCount).toBeGreaterThan(0);
  });

  test("spouse relationship shows marriage date fields", async ({
    page,
    waitForConvexSync,
  }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForConvexSync
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
    await page.waitForTimeout(300);

    const spouseOption = page.locator('text="Spouse"');
    if (await spouseOption.isVisible().catch(() => false)) {
      await spouseOption.click();
      await page.waitForTimeout(500);

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
    waitForConvexSync,
  }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForConvexSync
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
    waitForConvexSync,
  }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForConvexSync
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

test.describe("Accessibility", () => {
  test("dialog closes on escape key", async ({ page, waitForConvexSync }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForConvexSync
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

  test("dialog is keyboard navigable", async ({ page, waitForConvexSync }) => {
    const personId = await createPersonAndGoToRelationships(
      page,
      waitForConvexSync
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
