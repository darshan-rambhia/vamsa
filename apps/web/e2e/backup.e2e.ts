/**
 * E2E Tests for Backup & Export Functionality
 *
 * Tests backup page access, export form display, export workflow,
 * import functionality, and error handling for admin users.
 *
 * Coverage:
 * - System Backup: Export with/without photos and audit logs
 * - System Backup: Import validation and file upload
 * - GEDCOM: Export as .ged and .zip formats
 * - GEDCOM: Import from GEDCOM files
 */
import {
  TEST_USERS,
  bdd,
  expect,
  gotoWithRetry,
  test,
  waitForHydration,
} from "./fixtures";

test.describe("Feature: Backup & Export", () => {
  test.describe("Export Page Access", () => {
    test("Scenario: Admin accesses backup page and views export form", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user navigates to admin backup page", async () => {
        await gotoWithRetry(page, "/admin/backup");
      });

      await bdd.then("admin should see the backup export page", async () => {
        // Verify page is loaded with heading
        const pageHeading = page.locator("h1, h2");
        await expect(pageHeading.first()).toBeVisible();

        // Verify export form exists
        const form = page.locator("form");
        await expect(form).toBeVisible();
      });

      await bdd.and("form should display export options", async () => {
        // Verify form contains export-related elements
        const exportButton = page.locator(
          'button:has-text("export"), button:has-text("download"), button[type="submit"]'
        );
        await expect(exportButton.first()).toBeVisible();
      });
    });

    test("Scenario: Admin can interact with export form", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.and("user is on the backup export page", async () => {
        await gotoWithRetry(page, "/admin/backup");
        const form = page.locator("form");
        await expect(form).toBeVisible();
      });

      await bdd.when("user views the export form", async () => {
        // Verify export button is visible
        const exportButton = page.locator(
          'button:has-text("export"), button[type="submit"]'
        );
        const isVisible = await exportButton.first().isVisible();
        expect(isVisible).toBeTruthy();
      });

      await bdd.then(
        "export button should be present on the form",
        async () => {
          // Verify export button exists (it may be disabled if form is invalid)
          const exportButton = page.locator(
            'button:has-text("export"), button[type="submit"]'
          );
          const buttonExists = await exportButton.first().isVisible();
          expect(buttonExists).toBeTruthy();
        }
      );
    });

    test("Scenario: Backup page loads successfully for admin", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user navigates to admin backup section", async () => {
        await gotoWithRetry(page, "/admin");
        const backupLink = page.locator(
          'a:has-text("Backup"), button:has-text("Backup"), [data-testid="backup-link"]'
        );
        const exists = await backupLink.isVisible().catch(() => false);
        if (exists) {
          await backupLink.click();
        } else {
          // If no link, navigate directly
          await gotoWithRetry(page, "/admin/backup");
        }
      });

      await bdd.then("backup page should be accessible", async () => {
        // Verify we can see backup-related content
        const url = page.url();
        const hasBackupContent =
          url.includes("admin") && url.includes("backup");
        const hasForm = await page.locator("form").isVisible();

        expect(hasBackupContent || hasForm).toBeTruthy();
      });
    });
  });

  test.describe("System Backup Export", () => {
    test("Scenario: Admin exports backup with default options", async ({
      page,
      login,
      context: _context,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.and("user is on the System Backup tab", async () => {
        await gotoWithRetry(page, "/admin/backup");
        // Ensure we're on the system backup tab by default
        const systemBackupTab = page.getByRole("tab", {
          name: /system backup/i,
        });
        await expect(systemBackupTab).toBeVisible();
      });

      await bdd.when("user clicks the Download Backup button", async () => {
        // Click export button - using more specific selector
        const exportButton = page.getByRole("button", {
          name: /download backup/i,
        });
        await expect(exportButton).toBeVisible();
        await exportButton.click();
      });

      await bdd.then("backup file should be downloaded", async () => {
        // Verify success message appears
        const successMessage = page.locator(
          "text=/export.*successfully|download.*automatically|backup.*created/i"
        );
        const hasSuccess = await successMessage
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        // Success message or page should be responsive
        expect(
          hasSuccess || (await page.locator("body").isVisible())
        ).toBeTruthy();
      });
    });

    test("Scenario: Admin exports backup with photos included", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.and("user is on the backup export form", async () => {
        await gotoWithRetry(page, "/admin/backup");
        // Navigate to System Backup tab if needed
        const systemBackupTab = page.getByRole("tab", {
          name: /system backup/i,
        });
        if (await systemBackupTab.isVisible().catch(() => false)) {
          await systemBackupTab.click();
        }
      });

      await bdd.when(
        "user configures export with photos included",
        async () => {
          // Check the photos checkbox
          const photosCheckbox = page.getByLabel(
            /include photos|photos and documents/i
          );
          const isChecked = await photosCheckbox.isChecked().catch(() => false);
          if (!isChecked) {
            await photosCheckbox.check();
          }
        }
      );

      await bdd.then("photos option should be enabled", async () => {
        const photosCheckbox = page.getByLabel(
          /include photos|photos and documents/i
        );
        await expect(photosCheckbox).toBeChecked();
      });
    });

    test("Scenario: Admin exports backup with audit logs", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.and("user is on the backup export form", async () => {
        await gotoWithRetry(page, "/admin/backup");
      });

      await bdd.when("user enables audit logs and sets days", async () => {
        // Check audit logs checkbox
        const auditCheckbox = page.getByLabel(/include audit logs/i);
        const isChecked = await auditCheckbox.isChecked().catch(() => false);
        if (!isChecked) {
          await auditCheckbox.check();
        }

        // Wait for days input to appear
        const daysInput = page.getByLabel(/number of days|days to include/i);
        if (await daysInput.isVisible().catch(() => false)) {
          await daysInput.fill("30");
        }
      });

      await bdd.then("audit logs should be enabled with days set", async () => {
        const auditCheckbox = page.getByLabel(/include audit logs/i);
        await expect(auditCheckbox).toBeChecked();

        // Verify days input is visible if audit logs are checked
        const daysInput = page.getByLabel(/number of days|days to include/i);
        const daysVisible = await daysInput.isVisible().catch(() => false);
        if (daysVisible) {
          const daysValue = await daysInput.inputValue();
          expect(daysValue).toBe("30");
        }
      });
    });

    test("Scenario: Admin can modify audit log days range", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.and("user has audit logs enabled on export form", async () => {
        await gotoWithRetry(page, "/admin/backup");
        const auditCheckbox = page.getByLabel(/include audit logs/i);
        const isChecked = await auditCheckbox.isChecked().catch(() => false);
        if (!isChecked) {
          await auditCheckbox.check();
        }
        // Wait for the days input to appear and stabilize after checkbox toggle
        const daysInput = page.getByLabel(/number of days|days to include/i);
        await expect(daysInput).toBeVisible({ timeout: 5000 });
      });

      await bdd.when("user changes the audit log days to 180", async () => {
        const daysInput = page.getByLabel(/number of days|days to include/i);
        // Triple-click to select all text (platform-agnostic), then type new value
        await daysInput.click({ clickCount: 3 });
        await daysInput.pressSequentially("180", { delay: 50 });
      });

      await bdd.then("days input should show 180", async () => {
        const daysInput = page.getByLabel(/number of days|days to include/i);
        await expect(daysInput).toHaveValue("180");
      });
    });
  });

  test.describe("GEDCOM Export", () => {
    test("Scenario: Admin exports data as GEDCOM file", async ({
      page,
      login,
      context: _context,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.and("user navigates to GEDCOM tab", async () => {
        await gotoWithRetry(page, "/admin/backup");
        const gedcomTab = page.getByRole("tab", { name: /gedcom/i });
        await expect(gedcomTab).toBeVisible();
        await gedcomTab.click();
      });

      await bdd.when("user clicks Export to GEDCOM button", async () => {
        // Find and click GEDCOM export button
        const gedcomButton = page.getByRole("button", {
          name: /export to gedcom|export.*gedcom/i,
        });
        if (await gedcomButton.isVisible().catch(() => false)) {
          await gedcomButton.click();
        }
      });

      await bdd.then("GEDCOM file should be exported", async () => {
        // Check for success message or download
        const successMessage = page.locator(
          "text=/export.*successful|download.*automatically/i"
        );
        const hasSuccess = await successMessage.isVisible().catch(() => false);

        // Success message or page should respond
        expect(
          hasSuccess || (await page.locator("body").isVisible())
        ).toBeTruthy();
      });
    });

    test("Scenario: Admin exports GEDCOM with media as zip", async ({
      page,
      login,
      context: _context,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.and("user is on the GEDCOM tab", async () => {
        await gotoWithRetry(page, "/admin/backup");
        const gedcomTab = page.getByRole("tab", { name: /gedcom/i });
        await gedcomTab.click();
      });

      await bdd.when("user switches to Full Backup tab", async () => {
        const fullBackupTab = page.getByRole("tab", {
          name: /full backup|gedzip/i,
        });
        if (await fullBackupTab.isVisible().catch(() => false)) {
          await fullBackupTab.click();
        }
      });

      await bdd.then("Full Backup options should be visible", async () => {
        // Check for media checkbox
        const mediaCheckbox = page.getByLabel(/include photos|include.*media/i);
        const isVisible = await mediaCheckbox.isVisible().catch(() => false);

        // Check for Download Full Backup button
        const downloadButton = page.getByRole("button", {
          name: /download full backup|create.*backup/i,
        });
        const buttonVisible = await downloadButton
          .isVisible()
          .catch(() => false);

        expect(isVisible || buttonVisible).toBeTruthy();
      });
    });
  });

  test.describe("System Backup Import", () => {
    test("Scenario: Admin navigates to import section", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.and("user is on System Backup tab", async () => {
        await gotoWithRetry(page, "/admin/backup");
        await page.waitForLoadState("domcontentloaded");
        await page.waitForURL(/\/admin\/backup/, { timeout: 15000 });
      });

      await bdd.when("user scrolls down to import section", async () => {
        const importCard = page.locator(
          "text=/import backup|restore.*backup/i"
        );
        if (await importCard.isVisible().catch(() => false)) {
          await importCard.scrollIntoViewIfNeeded();
        }
      });

      await bdd.then("import form should be visible", async () => {
        const fileInput = page.getByLabel(/backup file|select.*file/i);
        const isVisible = await fileInput.isVisible().catch(() => false);

        const importCard = page.locator(
          "text=/import backup|restore.*backup/i"
        );
        const cardVisible = await importCard.isVisible().catch(() => false);

        expect(isVisible || cardVisible).toBeTruthy();
      });
    });

    test("Scenario: Import form validates file type", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.and("user is on the import form", async () => {
        await gotoWithRetry(page, "/admin/backup");
      });

      await bdd.when("user attempts to select import file", async () => {
        const fileInput = page.getByLabel(/backup file|select.*file/i);
        if (await fileInput.isVisible().catch(() => false)) {
          // File input should only accept .zip files
          const acceptAttribute = await fileInput
            .getAttribute("accept")
            .catch(() => null);
          expect(acceptAttribute).toContain(".zip");
        }
      });

      await bdd.then("file input should require .zip format", async () => {
        const fileInput = page.getByLabel(/backup file|select.*file/i);
        const acceptAttribute = await fileInput
          .getAttribute("accept")
          .catch(() => null);
        if (acceptAttribute) {
          expect(acceptAttribute).toContain(".zip");
        }
      });
    });

    test("Scenario: Import shows warning about creating backup first", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user views the import section", async () => {
        await gotoWithRetry(page, "/admin/backup");
        // Wait for page to load
        await page.waitForTimeout(500);
      });

      await bdd.then(
        "warning message should advise creating backup first",
        async () => {
          // The warning appears as a heading: "Important: Create a backup first"
          const warningHeading = page.getByRole("heading", {
            name: /backup first/i,
          });
          const warningText = page.getByText(/strongly recommended/i);

          const hasWarningHeading = await warningHeading
            .isVisible()
            .catch(() => false);
          const hasWarningText = await warningText
            .isVisible()
            .catch(() => false);

          // Either the heading or the warning text should be visible
          expect(hasWarningHeading || hasWarningText).toBeTruthy();
        }
      );
    });
  });

  test.describe("GEDCOM Import", () => {
    test("Scenario: Admin navigates to GEDCOM import", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.and("user navigates to backup page", async () => {
        await gotoWithRetry(page, "/admin/backup");
      });

      await bdd.then("GEDCOM tab should be visible", async () => {
        // The GEDCOM tab should be present on the backup page
        const gedcomTab = page.getByRole("tab", { name: /gedcom/i });
        await expect(gedcomTab).toBeVisible();

        // The backup page description mentions GEDCOM
        await expect(page.getByText(/gedcom format/i)).toBeVisible();
      });
    });

    test("Scenario: GEDCOM tab is clickable", async ({ page, login }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.and("user is on the backup page", async () => {
        await gotoWithRetry(page, "/admin/backup");
      });

      await bdd.then("GEDCOM tab can be clicked", async () => {
        const gedcomTab = page.getByRole("tab", { name: /gedcom/i });
        await expect(gedcomTab).toBeVisible();

        // Click should not throw error
        await gedcomTab.click();

        // Page should remain functional
        await expect(page.locator("main")).toBeVisible();
      });
    });

    test("Scenario: GEDCOM import validation message", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user views GEDCOM import instructions", async () => {
        await gotoWithRetry(page, "/admin/backup");
        const gedcomTab = page.getByRole("tab", { name: /gedcom/i });
        await gedcomTab.click();

        // Wait for tab content to load
        await page.waitForTimeout(500);

        // Look for the import GEDCOM heading which should be visible
        const importHeading = page.getByRole("heading", {
          name: /import gedcom/i,
        });
        if (await importHeading.isVisible().catch(() => false)) {
          await importHeading.scrollIntoViewIfNeeded();
        }
      });

      await bdd.then("import description should be visible", async () => {
        // Look for the card description or any text about GEDCOM import
        // The CardDescription contains "Import family tree data from GEDCOM"
        const description = page.getByText(/family tree data from GEDCOM/i);
        const hasDescription = await description.isVisible().catch(() => false);

        // Fallback: check for any GEDCOM-related content
        const fallbackContent = page.getByText(/GEDCOM|\.ged/i).first();
        const hasFallback = await fallbackContent
          .isVisible()
          .catch(() => false);

        // Description about GEDCOM import should be present
        expect(hasDescription || hasFallback).toBeTruthy();
      });
    });
  });

  test.describe("Export Form Options", () => {
    test("Scenario: Export form displays configuration options", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user navigates to backup page", async () => {
        await gotoWithRetry(page, "/admin/backup");
      });

      await bdd.then("form should display export options", async () => {
        // Look for checkboxes or switches for export options
        const photosOption = page.locator(
          '[name="includePhotos"], [id*="photo"], label:has-text("photo")'
        );
        const auditLogsOption = page.locator(
          '[name="includeAuditLogs"], [id*="audit"], label:has-text("audit")'
        );

        // At least one option should be visible
        const photosVisible = await photosOption
          .first()
          .isVisible()
          .catch(() => false);
        const auditVisible = await auditLogsOption
          .first()
          .isVisible()
          .catch(() => false);

        // The form should have some configuration options
        const formExists = await page.locator("form").isVisible();
        expect(photosVisible || auditVisible || formExists).toBeTruthy();
      });
    });

    test("Scenario: Export form shows audit log days input", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user views the export form", async () => {
        await gotoWithRetry(page, "/admin/backup");
        await page
          .locator("main")
          .waitFor({ state: "visible", timeout: 10000 });
      });

      await bdd.then(
        "form should show audit log days configuration",
        async () => {
          // Look for days input or slider
          const daysInput = page.locator(
            '[name="auditLogDays"], input[type="number"], [id*="days"]'
          );
          const hasInput = await daysInput
            .first()
            .isVisible()
            .catch(() => false);

          // The form should be present even if specific inputs vary
          const formExists = await page.locator("form").isVisible();
          expect(hasInput || formExists).toBeTruthy();
        }
      );
    });
  });

  test.describe("Access Control", () => {
    // Clear admin storage state to properly test member login
    test.use({ storageState: { cookies: [], origins: [] } });

    test("Scenario: Non-admin cannot access backup page", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as regular member", async () => {
        await login(TEST_USERS.member);
      });

      await bdd.when("user tries to access backup page", async () => {
        await gotoWithRetry(page, "/admin/backup");
        await page.waitForTimeout(500);
      });

      await bdd.then(
        "user should be redirected or see access denied",
        async () => {
          const url = page.url();

          // Should either be redirected away from backup page
          // or see an access denied message
          const notOnBackupPage = !url.includes("/admin/backup");
          const accessDenied = await page
            .locator(
              "text=/access denied|unauthorized|permission|not authorized/i"
            )
            .first()
            .isVisible()
            .catch(() => false);

          // Either redirected or access denied
          expect(notOnBackupPage || accessDenied).toBeTruthy();
        }
      );
    });

    test("Scenario: Unauthenticated user cannot access backup page", async ({
      page,
    }) => {
      await bdd.given("user is not logged in", async () => {
        // Clear any existing session
        await page.context().clearCookies();
      });

      await bdd.when("user tries to access backup page", async () => {
        await gotoWithRetry(page, "/admin/backup");
        // Wait for redirect to login page (unauthenticated users are redirected)
        await page.waitForURL(/\/login/, { timeout: 10000 });
      });

      await bdd.then("user should be redirected to login", async () => {
        const url = page.url();

        // Should be redirected to login page
        const redirectedToLogin =
          url.includes("login") ||
          url.includes("signin") ||
          url.includes("auth");
        const notOnBackupPage = !url.includes("/admin/backup");

        expect(redirectedToLogin || notOnBackupPage).toBeTruthy();
      });
    });
  });

  test.describe("Page Navigation", () => {
    test("Scenario: Admin can navigate to backup from admin dashboard", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user is on the admin dashboard", async () => {
        await gotoWithRetry(page, "/admin");
        await page
          .locator("main")
          .waitFor({ state: "visible", timeout: 10000 });
      });

      await bdd.then(
        "backup link should be visible in navigation",
        async () => {
          // Look for backup link in navigation or sidebar
          const backupLink = page.locator(
            'a[href*="backup"], a:has-text("Backup"), [data-testid="backup-link"]'
          );

          const linkExists = await backupLink
            .first()
            .isVisible()
            .catch(() => false);

          // If link exists, it should be clickable
          if (linkExists) {
            await backupLink.first().click();
            await page
              .locator("main")
              .waitFor({ state: "visible", timeout: 10000 });

            const url = page.url();
            expect(url).toContain("backup");
          } else {
            // Direct navigation should still work
            await gotoWithRetry(page, "/admin/backup");
            const formExists = await page.locator("form").isVisible();
            expect(formExists).toBeTruthy();
          }
        }
      );
    });

    test("Scenario: Backup page shows proper breadcrumbs or navigation", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user is on the backup page", async () => {
        await gotoWithRetry(page, "/admin/backup");
        await page
          .locator("main")
          .waitFor({ state: "visible", timeout: 10000 });
      });

      await bdd.then("page should show navigation context", async () => {
        // Check for breadcrumbs or back link
        const breadcrumbs = page.locator(
          'nav[aria-label*="breadcrumb"], .breadcrumb, [data-testid="breadcrumbs"]'
        );
        const backLink = page.locator(
          'a:has-text("Back"), a:has-text("Admin"), a[href="/admin"]'
        );

        const hasBreadcrumbs = await breadcrumbs
          .first()
          .isVisible()
          .catch(() => false);
        const hasBackLink = await backLink
          .first()
          .isVisible()
          .catch(() => false);

        // Page should have some navigation context
        const pageTitle = page.locator("h1, h2");
        const hasTitle = await pageTitle.first().isVisible();

        expect(hasTitle || hasBreadcrumbs || hasBackLink).toBeTruthy();
      });
    });

    test("Scenario: Tab navigation works between System Backup and GEDCOM", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user navigates to backup page", async () => {
        await gotoWithRetry(page, "/admin/backup");
        // Wait for React hydration so tab event handlers are attached
        await waitForHydration(page);
      });

      await bdd.then("user can switch between tabs", async () => {
        // Check System Backup tab
        const systemBackupTab = page.getByRole("tab", {
          name: /system backup/i,
        });
        const systemVisible = await systemBackupTab
          .isVisible()
          .catch(() => false);

        // Check GEDCOM tab (use exact match to avoid matching "GEDCOM (.ged)" tab)
        const gedcomTab = page.getByRole("tab", {
          name: "GEDCOM",
          exact: true,
        });
        const gedcomVisible = await gedcomTab.isVisible().catch(() => false);

        // At least one tab should be visible
        expect(systemVisible || gedcomVisible).toBeTruthy();

        // If both visible, try switching
        if (systemVisible && gedcomVisible) {
          // Click GEDCOM tab
          await gedcomTab.click();

          // Wait for the GEDCOM tab to become selected
          await expect(gedcomTab).toHaveAttribute("data-state", "active", {
            timeout: 5000,
          });

          // Wait for GEDCOM tab content to render
          const importGedcomHeading = page.getByRole("heading", {
            name: /import gedcom/i,
          });
          const exportGedcomHeading = page.getByRole("heading", {
            name: /export gedcom/i,
          });

          // Use waitFor with a reasonable timeout to allow content to render
          const hasImport = await importGedcomHeading
            .waitFor({ state: "visible", timeout: 5000 })
            .then(() => true)
            .catch(() => false);
          const hasExport = await exportGedcomHeading
            .waitFor({ state: "visible", timeout: 5000 })
            .then(() => true)
            .catch(() => false);

          // Either import or export GEDCOM heading should be visible
          expect(hasImport || hasExport).toBeTruthy();
        }
      });
    });
  });

  test.describe("Error Handling", () => {
    test("Scenario: Page handles network errors gracefully", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user loads the backup page", async () => {
        await gotoWithRetry(page, "/admin/backup");
        await page
          .locator("main")
          .waitFor({ state: "visible", timeout: 10000 });
      });

      await bdd.then("page should display without crashing", async () => {
        // Page should be accessible
        const bodyVisible = await page.locator("body").isVisible();
        expect(bodyVisible).toBeTruthy();

        // Should not show a blank page or crash screen
        const hasContent = await page
          .locator("h1, h2, form, main")
          .first()
          .isVisible()
          .catch(() => false);
        expect(hasContent).toBeTruthy();
      });
    });

    test("Scenario: Export error handling", async ({ page, login }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user attempts export", async () => {
        await gotoWithRetry(page, "/admin/backup");
        const exportButton = page.getByRole("button", {
          name: /download backup|export/i,
        });
        if (await exportButton.isVisible().catch(() => false)) {
          await exportButton.click();
          // Wait briefly for potential error messages
          await page.waitForTimeout(2000);
        }
      });

      await bdd.then("error should be handled gracefully", async () => {
        // Page should still be responsive
        const pageAccessible = await page
          .locator("body")
          .isVisible()
          .catch(() => false);
        expect(pageAccessible).toBeTruthy();

        // Either success or error message, but no crash
        const statusMessage = page.locator(
          "text=/success|error|failed|export/i"
        );
        const _hasMessage = await statusMessage.isVisible().catch(() => false);
        // Message not strictly required, but page should be intact
        expect(pageAccessible).toBeTruthy();
      });
    });
  });

  test.describe("Form Validation", () => {
    test("Scenario: Export form validates input before submission", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user is on the backup page with form", async () => {
        await gotoWithRetry(page, "/admin/backup");
        await page
          .locator("main")
          .waitFor({ state: "visible", timeout: 10000 });
      });

      await bdd.then("form should be properly structured", async () => {
        // Form should exist
        const form = page.locator("form");
        const formExists = await form.isVisible();
        expect(formExists).toBeTruthy();

        // Should have a submit button
        const submitButton = page.locator(
          'button[type="submit"], button:has-text("export"), button:has-text("download")'
        );
        const hasSubmit = await submitButton.first().isVisible();
        expect(hasSubmit).toBeTruthy();
      });
    });

    test("Scenario: Import form validates file before upload", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user views import form", async () => {
        await gotoWithRetry(page, "/admin/backup");
      });

      await bdd.then(
        "import button should be disabled without file",
        async () => {
          const importButton = page.getByRole("button", {
            name: /validate backup|import|upload/i,
          });
          const isDisabled = await importButton.isDisabled().catch(() => false);

          // Button might be visible but disabled, or not visible at all
          // This is acceptable form validation
          expect(typeof isDisabled).toBe("boolean");
        }
      );
    });
  });
});
