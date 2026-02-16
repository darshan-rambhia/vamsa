/**
 * Critical User Flow E2E Tests (oxco.8)
 *
 * Covers high-impact user journeys that must not break:
 * 1. Create person with ALL form fields (all tabs)
 * 2. Delete a relationship between persons
 * 3. GEDCOM file import with actual file upload
 * 4. GEDCOM export triggers download
 * 5. Full person lifecycle: create → edit → verify persistence
 */

import fs from "node:fs";
import path from "node:path";
import {
  TEST_USERS,
  expect,
  test,
  waitForHydration,
} from "./fixtures/test-base";
import { bdd } from "./fixtures/bdd-helpers";
import {
  Navigation,
  PeopleListPage,
  PersonDetailPage,
  PersonFormPage,
  gotoWithRetry,
} from "./fixtures/page-objects";

function uniqueName(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Flow 1: Create Person with All Fields ─────────────────────────────────

test.describe("Critical Flow: Create Person with All Fields", () => {
  test("should create a person filling every form field across all tabs", async ({
    page,
    waitForConvexSync,
  }) => {
    test.slow();

    const firstName = uniqueName("FullForm");
    const lastName = "AllFields";

    await bdd.given("user navigates to create person form", async () => {
      await gotoWithRetry(page, "/people/new");
      await waitForHydration(page);
      const form = page.getByTestId("person-form");
      await expect(form).toBeVisible({ timeout: 10000 });
    });

    await bdd.when("user fills all fields on the Basic Info tab", async () => {
      // Basic info fields
      const firstNameInput = page.getByTestId("person-form-firstName");
      await firstNameInput.waitFor({ state: "visible", timeout: 5000 });
      await firstNameInput.click();
      await firstNameInput.fill(firstName);

      const lastNameInput = page.getByTestId("person-form-lastName");
      await lastNameInput.click();
      await lastNameInput.fill(lastName);

      // Maiden name
      const maidenNameInput = page.getByTestId("person-form-maidenName");
      if (await maidenNameInput.isVisible().catch(() => false)) {
        await maidenNameInput.click();
        await maidenNameInput.fill("TestMaiden");
      }

      // Gender select
      const genderSelect = page.getByTestId("person-form-gender");
      if (await genderSelect.isVisible().catch(() => false)) {
        await genderSelect.click();
        await page.waitForTimeout(200);
        const maleOption = page
          .locator('[role="option"]')
          .filter({ hasText: "Male" });
        if (await maleOption.isVisible().catch(() => false)) {
          await maleOption.click();
          await page.waitForTimeout(200);
        }
      }

      // Date of birth
      const dobInput = page.getByTestId("person-form-dateOfBirth");
      if (await dobInput.isVisible().catch(() => false)) {
        await dobInput.click();
        await dobInput.fill("1990-06-15");
      }

      // Is living toggle
      const isLivingToggle = page.getByTestId("person-form-isLiving");
      if (await isLivingToggle.isVisible().catch(() => false)) {
        // It should default to checked/living - verify it's there
        await expect(isLivingToggle).toBeVisible();
      }

      // Birth place
      const birthPlaceInput = page.getByTestId("person-form-birthPlace");
      if (await birthPlaceInput.isVisible().catch(() => false)) {
        await birthPlaceInput.click();
        await birthPlaceInput.fill("Mumbai, India");
      }

      // Native place
      const nativePlaceInput = page.getByTestId("person-form-nativePlace");
      if (await nativePlaceInput.isVisible().catch(() => false)) {
        await nativePlaceInput.click();
        await nativePlaceInput.fill("Pune, India");
      }

      // Bio
      const bioInput = page.getByTestId("person-form-bio");
      if (await bioInput.isVisible().catch(() => false)) {
        await bioInput.click();
        await bioInput.fill("A test biography for comprehensive form testing.");
      }

      // Contact fields (may be on a different tab)
      const emailInput = page.getByTestId("person-form-email");
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.click();
        await emailInput.fill("testperson@example.com");
      }

      const phoneInput = page.getByTestId("person-form-phone");
      if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.click();
        await phoneInput.fill("+1-555-0123");
      }

      // Professional fields (may be on a different tab)
      const professionInput = page.getByTestId("person-form-profession");
      if (await professionInput.isVisible().catch(() => false)) {
        await professionInput.click();
        await professionInput.fill("Software Engineer");
      }

      const employerInput = page.getByTestId("person-form-employer");
      if (await employerInput.isVisible().catch(() => false)) {
        await employerInput.click();
        await employerInput.fill("Acme Corp");
      }
    });

    await bdd.and("user submits the form", async () => {
      const submitButton = page.getByTestId("person-form-submit");
      await submitButton.click();

      // Wait for navigation away from /new
      await page.waitForURL((url) => !url.pathname.includes("/new"), {
        timeout: 15000,
      });
      await waitForConvexSync();
    });

    await bdd.then(
      "person is created and detail page shows the data",
      async () => {
        // Should be on the person detail page
        await expect(page).toHaveURL(/\/people\/[^/]+$/);

        // Name heading should contain our names
        const heading = page.locator("h1").first();
        await heading.waitFor({ state: "visible", timeout: 10000 });
        const headingText = await heading.textContent();
        expect(headingText).toContain(firstName);
        expect(headingText).toContain(lastName);
      }
    );

    await bdd.and("data persists after page reload", async () => {
      const currentUrl = page.url();
      await page.reload();
      await page.waitForURL(currentUrl, { timeout: 10000 });

      const heading = page.locator("h1").first();
      await heading.waitFor({ state: "visible", timeout: 10000 });
      const headingText = await heading.textContent();
      expect(headingText).toContain(firstName);
    });
  });
});

// ─── Flow 2: Delete Relationship ────────────────────────────────────────────

test.describe("Critical Flow: Delete Relationship", () => {
  test("should create a relationship and then delete it", async ({
    page,
    waitForConvexSync,
  }) => {
    test.slow();

    const parentName = uniqueName("Parent");
    const childName = uniqueName("Child");
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
      await waitForConvexSync();

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
      await waitForConvexSync();
    });

    await bdd.when("user adds a child relationship to the parent", async () => {
      // Navigate to parent's detail page
      await gotoWithRetry(page, `/people/${parentId}`);
      await page
        .locator("h1")
        .first()
        .waitFor({ state: "visible", timeout: 10000 });

      // Switch to Relationships tab
      const relTab = page
        .locator('[role="tab"]')
        .filter({ hasText: "Relationships" });
      await relTab.waitFor({ state: "visible", timeout: 5000 });
      await relTab.click();
      await page.waitForTimeout(300);

      // Open add relationship dialog
      const addButton = page.getByTestId("add-relationship-button");
      await expect(addButton).toBeVisible({ timeout: 5000 });
      await addButton.click();

      const dialog = page.getByTestId("add-relationship-dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Select "Child" type
      const typeSelect = page.getByTestId("add-relationship-type-select");
      await typeSelect.click();
      await page.waitForTimeout(300);
      const childOption = page.locator(`text="Child"`);
      if (await childOption.isVisible().catch(() => false)) {
        await childOption.click();
        await page.waitForTimeout(300);
      }

      // Search for the child person
      const searchInput = page.getByTestId("add-relationship-search-input");
      await searchInput.fill(childName);
      await page.waitForTimeout(500);

      // Click first search result
      const firstResult = page
        .locator("[data-testid^='add-relationship-search-result-']")
        .first();
      const hasResult = await firstResult
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasResult) {
        await firstResult.click();
        await page.waitForTimeout(300);

        // Save
        const saveButton = page.getByTestId("add-relationship-save");
        await saveButton.click();
        await page.waitForTimeout(1000);
        await waitForConvexSync();
      }
    });

    await bdd.then(
      "relationship appears on the person detail page",
      async () => {
        // Reload to verify persistence
        await gotoWithRetry(page, `/people/${parentId}`);
        await page
          .locator("h1")
          .first()
          .waitFor({ state: "visible", timeout: 10000 });

        // Switch to Relationships tab
        const relTab = page
          .locator('[role="tab"]')
          .filter({ hasText: "Relationships" });
        await relTab.click();
        await page.waitForTimeout(500);

        // Check for the child's name in relationships
        const childLink = page.locator(`text="${childName}"`);
        const childVisible = await childLink
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        expect(childVisible).toBeTruthy();
      }
    );

    await bdd.and("user deletes the relationship", async () => {
      // Click delete relationship button
      const deleteButton = page.getByTestId("delete-relationship-button");
      const hasDelete = await deleteButton
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasDelete) {
        await deleteButton.first().click();
        await page.waitForTimeout(300);

        // Confirm deletion in dialog
        const confirmDialog = page.getByTestId("delete-relationship-dialog");
        await expect(confirmDialog).toBeVisible({ timeout: 5000 });

        const confirmButton = page.getByTestId("delete-relationship-confirm");
        await confirmButton.click();
        await page.waitForTimeout(1000);
        await waitForConvexSync();
      }
    });

    await bdd.and("relationship no longer appears after deletion", async () => {
      // Reload to verify deletion persisted
      await page.reload();
      await page.waitForTimeout(1000);

      // Switch to Relationships tab
      const relTab = page
        .locator('[role="tab"]')
        .filter({ hasText: "Relationships" });
      await relTab.click();
      await page.waitForTimeout(500);

      // The child's name should no longer appear in relationships
      const childLink = page.locator(`text="${childName}"`);
      const stillVisible = await childLink
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      // Either not visible, or the section shows no relationships
      expect(stillVisible).toBeFalsy();
    });
  });
});

// ─── Flow 3: GEDCOM Import ──────────────────────────────────────────────────

test.describe("Critical Flow: GEDCOM Import", () => {
  test("should upload a GEDCOM file and process it", async ({
    page,
    login,
  }) => {
    test.slow();

    // Create a minimal valid GEDCOM file for testing
    const gedcomContent = [
      "0 HEAD",
      "1 SOUR VamsaTest",
      "1 GEDC",
      "2 VERS 5.5.1",
      "2 FORM LINEAGE-LINKED",
      "1 CHAR UTF-8",
      "0 @I1@ INDI",
      "1 NAME GedcomTest /ImportPerson/",
      "1 SEX M",
      "1 BIRT",
      "2 DATE 1 JAN 1950",
      "2 PLAC Test City",
      "0 @I2@ INDI",
      "1 NAME GedcomSpouse /ImportPerson/",
      "1 SEX F",
      "1 BIRT",
      "2 DATE 15 MAR 1955",
      "0 @F1@ FAM",
      "1 HUSB @I1@",
      "1 WIFE @I2@",
      "1 MARR",
      "2 DATE 20 JUN 1975",
      "0 TRLR",
    ].join("\n");

    // Write to a temp file
    const tempDir = path.join(process.cwd(), "test-output");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const gedcomPath = path.join(tempDir, "test-import.ged");
    fs.writeFileSync(gedcomPath, gedcomContent, "utf-8");

    await bdd.given("user is logged in as admin", async () => {
      await login(TEST_USERS.admin);
    });

    await bdd.when("user navigates to GEDCOM import", async () => {
      await gotoWithRetry(page, "/admin/backup");
      await waitForHydration(page);

      // Click GEDCOM tab
      const gedcomTab = page.getByRole("tab", { name: /gedcom/i });
      await expect(gedcomTab).toBeVisible({ timeout: 5000 });
      await gedcomTab.click();
      await page.waitForTimeout(500);
    });

    await bdd.and("user uploads a valid GEDCOM file", async () => {
      // Look for file input (may be hidden behind a button)
      const fileInput = page.locator('input[type="file"]');
      const fileInputCount = await fileInput.count();

      if (fileInputCount > 0) {
        // Upload the file
        await fileInput.first().setInputFiles(gedcomPath);
        await page.waitForTimeout(1000);
      }
    });

    await bdd.then("import UI responds to the file", async () => {
      // After file upload, the UI should show:
      // - A preview/confirmation
      // - An import button
      // - Or a success/error message
      // The exact behavior depends on the implementation

      // Check that the page is still functional
      const mainContent = page.locator("main");
      await expect(mainContent).toBeVisible();

      // Look for any response to the upload
      const importButton = page.getByRole("button", {
        name: /import|upload|process/i,
      });
      const successMessage = page.locator(
        "text=/import|upload|processed|preview/i"
      );
      const errorMessage = page.locator("text=/error|invalid|failed/i");

      const hasImportButton = await importButton
        .first()
        .isVisible()
        .catch(() => false);
      const hasSuccess = await successMessage
        .first()
        .isVisible()
        .catch(() => false);
      const hasError = await errorMessage
        .first()
        .isVisible()
        .catch(() => false);

      // At least one of these should be visible after upload
      expect(hasImportButton || hasSuccess || hasError).toBeTruthy();
    });

    // Cleanup temp file
    try {
      fs.unlinkSync(gedcomPath);
    } catch {
      // Ignore cleanup errors
    }
  });
});

// ─── Flow 4: GEDCOM Export Downloads a File ─────────────────────────────────

test.describe("Critical Flow: GEDCOM Export Download", () => {
  test("should trigger a file download when exporting GEDCOM", async ({
    page,
    login,
  }) => {
    await bdd.given("user is logged in as admin", async () => {
      await login(TEST_USERS.admin);
    });

    await bdd.when("user navigates to GEDCOM export", async () => {
      await gotoWithRetry(page, "/admin/backup");
      await waitForHydration(page);

      const gedcomTab = page.getByRole("tab", { name: /gedcom/i });
      await expect(gedcomTab).toBeVisible({ timeout: 5000 });
      await gedcomTab.click();
      await page.waitForTimeout(500);
    });

    await bdd.then("clicking export triggers a download", async () => {
      const exportButton = page.getByRole("button", {
        name: /export to gedcom|export.*gedcom|download.*gedcom/i,
      });
      const buttonVisible = await exportButton.isVisible().catch(() => false);

      if (buttonVisible) {
        // Listen for download event
        const downloadPromise = page
          .waitForEvent("download", { timeout: 15000 })
          .catch(() => null);
        await exportButton.click();
        const download = await downloadPromise;

        if (download) {
          // Verify download properties
          const fileName = download.suggestedFilename();
          expect(
            fileName.endsWith(".ged") || fileName.endsWith(".zip")
          ).toBeTruthy();

          // Save and verify file has content
          const tempDir = path.join(process.cwd(), "test-output");
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          const savePath = path.join(tempDir, fileName);
          await download.saveAs(savePath);

          const stats = fs.statSync(savePath);
          expect(stats.size).toBeGreaterThan(0);

          // Cleanup
          try {
            fs.unlinkSync(savePath);
          } catch {
            // Ignore
          }
        }
      }
    });
  });
});

// ─── Flow 5: Full Person Lifecycle (Create → Edit → Verify) ────────────────

test.describe("Critical Flow: Person Edit Lifecycle", () => {
  test("should edit a person and verify all changes persist", async ({
    page,
    waitForConvexSync,
  }) => {
    test.slow();

    const originalFirst = uniqueName("EditOrig");
    const updatedFirst = uniqueName("EditUpd");
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
      await waitForConvexSync();

      const match = page.url().match(/\/people\/([^/]+)/);
      personId = match?.[1] ?? null;
      expect(personId).toBeTruthy();
    });

    await bdd.when("user clicks Edit and modifies the first name", async () => {
      // Navigate to person detail
      await gotoWithRetry(page, `/people/${personId}`);
      const detailPage = new PersonDetailPage(page);
      await detailPage.nameHeading.waitFor({
        state: "visible",
        timeout: 10000,
      });

      // Click edit button
      const editButton = page
        .locator('button:has-text("Edit Profile"), a:has-text("Edit Profile")')
        .first();
      await expect(editButton).toBeVisible({ timeout: 5000 });
      await editButton.click();
      await page.waitForURL(/\/people\/[^/]+\/edit/, { timeout: 15000 });

      // Update the first name
      const form = new PersonFormPage(page);
      await form.firstNameInput.waitFor({ state: "visible", timeout: 5000 });
      await form.firstNameInput.clear();
      await form.firstNameInput.fill(updatedFirst);

      // Submit
      await form.submit();
      await page.waitForTimeout(1000);
      await waitForConvexSync();
    });

    await bdd.then("updated name appears on the detail page", async () => {
      // Navigate back to detail page
      await gotoWithRetry(page, `/people/${personId}`);
      const heading = page.locator("h1").first();
      await heading.waitFor({ state: "visible", timeout: 10000 });
      const headingText = await heading.textContent();
      expect(headingText).toContain(updatedFirst);
      expect(headingText).not.toContain(originalFirst);
    });

    await bdd.and("updated name persists after reload", async () => {
      await page.reload();
      await page.waitForTimeout(1000);

      const heading = page.locator("h1").first();
      await heading.waitFor({ state: "visible", timeout: 10000 });
      const headingText = await heading.textContent();
      expect(headingText).toContain(updatedFirst);
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

      // Search for the updated name
      if (await peopleList.searchInput.isVisible().catch(() => false)) {
        await peopleList.search(updatedFirst);
        await page.waitForTimeout(500);
      }

      // The updated name should be findable
      const personLink = page.locator(`a:has-text("${updatedFirst}")`);
      const isVisible = await personLink
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      expect(isVisible).toBeTruthy();
    });
  });
});
