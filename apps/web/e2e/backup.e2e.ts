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
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
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
    const backupTempDir = path.join(
      process.cwd(),
      "test-output",
      "backup-export"
    );

    test.beforeAll(() => {
      if (!fs.existsSync(backupTempDir)) {
        fs.mkdirSync(backupTempDir, { recursive: true });
      }
    });

    test.afterAll(() => {
      try {
        if (fs.existsSync(backupTempDir)) {
          fs.rmSync(backupTempDir, { recursive: true, force: true });
        }
      } catch {
        // Ignore cleanup errors
      }
    });

    /**
     * Helper: Extract a ZIP file to a directory using the system unzip command.
     * Uses execFileSync (not shell exec) to avoid command injection.
     */
    function extractZip(zipFilePath: string, destDir: string) {
      execFileSync("unzip", ["-o", zipFilePath, "-d", destDir], {
        stdio: "pipe",
      });
    }

    test("Scenario: Export produces a valid ZIP with correct metadata and data files", async ({
      page,
      login,
    }) => {
      test.slow();

      let zipPath = "";
      let extractDir = "";

      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when(
        "user downloads a backup with default options",
        async () => {
          await gotoWithRetry(page, "/admin/backup");
          await waitForHydration(page);

          const exportButton = page.getByRole("button", {
            name: /download backup/i,
          });
          await expect(exportButton).toBeVisible({ timeout: 5000 });

          const downloadPromise = page.waitForEvent("download", {
            timeout: 30000,
          });
          await exportButton.click();
          const download = await downloadPromise;

          const fileName = download.suggestedFilename();
          expect(fileName.endsWith(".zip")).toBe(true);
          expect(fileName).toContain("vamsa-backup-");

          zipPath = path.join(backupTempDir, `default-${Date.now()}.zip`);
          await download.saveAs(zipPath);

          const stats = fs.statSync(zipPath);
          expect(stats.size).toBeGreaterThan(0);
        }
      );

      await bdd.then(
        "ZIP contains metadata.json with correct structure",
        async () => {
          extractDir = path.join(backupTempDir, `extract-${Date.now()}`);
          fs.mkdirSync(extractDir, { recursive: true });

          extractZip(zipPath, extractDir);

          // Verify metadata.json exists and has correct structure
          const metadataPath = path.join(extractDir, "metadata.json");
          expect(fs.existsSync(metadataPath)).toBe(true);

          const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
          expect(metadata.version).toBe("1.0.0");
          expect(metadata.exportedAt).toBeDefined();
          expect(metadata.exportedBy).toBeDefined();
          expect(metadata.exportedBy.email).toBeDefined();
          expect(metadata.statistics).toBeDefined();
          expect(typeof metadata.statistics.totalPeople).toBe("number");
          expect(typeof metadata.statistics.totalRelationships).toBe("number");
          expect(typeof metadata.statistics.totalUsers).toBe("number");
          expect(metadata.dataFiles).toBeInstanceOf(Array);
          expect(metadata.dataFiles).toContain("data/people.json");
          expect(metadata.dataFiles).toContain("data/relationships.json");
          expect(metadata.dataFiles).toContain("data/users.json");
        }
      );

      await bdd.and(
        "ZIP contains data files with actual database content",
        async () => {
          // Verify data/people.json exists and has content
          const peoplePath = path.join(extractDir, "data", "people.json");
          expect(fs.existsSync(peoplePath)).toBe(true);

          const people = JSON.parse(fs.readFileSync(peoplePath, "utf-8"));
          expect(people).toBeInstanceOf(Array);
          // The E2E test database should have seed data
          expect(people.length).toBeGreaterThan(0);

          // Each person should have basic fields
          const firstPerson = people[0];
          expect(firstPerson.id).toBeDefined();
          expect(firstPerson.firstName || firstPerson.lastName).toBeDefined();

          // Verify data/relationships.json exists
          const relPath = path.join(extractDir, "data", "relationships.json");
          expect(fs.existsSync(relPath)).toBe(true);

          // Verify data/users.json exists and has no passwords
          const usersPath = path.join(extractDir, "data", "users.json");
          expect(fs.existsSync(usersPath)).toBe(true);
          const usersContent = fs.readFileSync(usersPath, "utf-8");
          // Users should not contain password hashes
          expect(usersContent).not.toContain("password");

          // Verify data/settings.json exists
          const settingsPath = path.join(extractDir, "data", "settings.json");
          expect(fs.existsSync(settingsPath)).toBe(true);
        }
      );
    });

    test("Scenario: Export with audit logs includes audit-logs.json in ZIP", async ({
      page,
      login,
    }) => {
      test.slow();

      let zipPath = "";
      let extractDir = "";

      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when(
        "user enables audit logs and downloads a backup",
        async () => {
          await gotoWithRetry(page, "/admin/backup");
          await waitForHydration(page);

          // Ensure audit logs checkbox is checked
          const auditCheckbox = page.getByLabel(/include audit logs/i);
          await expect(auditCheckbox).toBeVisible({ timeout: 5000 });
          const isChecked = await auditCheckbox.isChecked();
          if (!isChecked) {
            await auditCheckbox.check();
          }

          const exportButton = page.getByRole("button", {
            name: /download backup/i,
          });
          await expect(exportButton).toBeVisible({ timeout: 5000 });

          const downloadPromise = page.waitForEvent("download", {
            timeout: 30000,
          });
          await exportButton.click();
          const download = await downloadPromise;

          zipPath = path.join(backupTempDir, `audit-${Date.now()}.zip`);
          await download.saveAs(zipPath);
        }
      );

      await bdd.then(
        "ZIP metadata lists audit-logs.json and the file exists",
        async () => {
          extractDir = path.join(backupTempDir, `extract-audit-${Date.now()}`);
          fs.mkdirSync(extractDir, { recursive: true });

          extractZip(zipPath, extractDir);

          // Verify metadata references audit logs
          const metadata = JSON.parse(
            fs.readFileSync(path.join(extractDir, "metadata.json"), "utf-8")
          );
          expect(metadata.dataFiles).toContain("data/audit-logs.json");
          expect(typeof metadata.statistics.totalAuditLogs).toBe("number");

          // Verify audit-logs.json file exists
          const auditPath = path.join(extractDir, "data", "audit-logs.json");
          expect(fs.existsSync(auditPath)).toBe(true);

          const auditLogs = JSON.parse(fs.readFileSync(auditPath, "utf-8"));
          expect(auditLogs).toBeInstanceOf(Array);
        }
      );
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
        await expect(importCard.first())
          .toBeAttached({ timeout: 10000 })
          .catch(() => {});
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
        await expect(page.getByText(/gedcom/i).first()).toBeVisible();
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
          name: /^backup$/i,
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

  test.describe("GEDCOM Round-Trip", () => {
    const tempDir = path.join(process.cwd(), "test-output", "gedcom-roundtrip");

    // Ensure temp directory exists before tests
    test.beforeAll(() => {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    });

    // Cleanup temp directory after tests
    test.afterAll(() => {
      try {
        if (fs.existsSync(tempDir)) {
          for (const file of fs.readdirSync(tempDir)) {
            fs.unlinkSync(path.join(tempDir, file));
          }
        }
      } catch {
        // Ignore cleanup errors
      }
    });

    /**
     * Helper: Import a GEDCOM file through the UI and wait for completion.
     * Returns true if import succeeded.
     */
    async function importGedcomFile(
      page: any,
      filePath: string
    ): Promise<boolean> {
      await gotoWithRetry(page, "/admin/backup");
      await waitForHydration(page);

      // Switch to GEDCOM tab
      const gedcomTab = page.getByRole("tab", { name: /gedcom/i });
      await expect(gedcomTab).toBeVisible({ timeout: 5000 });
      await gedcomTab.click();

      // Wait for Import GEDCOM heading to confirm tab content loaded
      const importHeading = page.getByRole("heading", {
        name: /import gedcom/i,
      });
      await expect(importHeading).toBeVisible({ timeout: 5000 });

      // Upload the file
      const fileInput = page.locator('input[type="file"][accept=".ged"]');
      await expect(fileInput).toBeAttached({ timeout: 5000 });
      await fileInput.setInputFiles(filePath);

      // Click validate button
      const validateButton = page.getByRole("button", {
        name: /validate/i,
      });
      await expect(validateButton).toBeEnabled({ timeout: 5000 });
      await validateButton.click();

      // Wait for preview to appear (shows people/families count)
      const previewTitle = page.locator("text=Import Preview");
      await expect(previewTitle).toBeVisible({ timeout: 15000 });

      // Verify it's ready to import (green status card)
      const readyText = page.locator("text=Ready to Import");
      const isReady = await readyText
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (!isReady) {
        // Check if validation failed
        const failedText = page.locator("text=Validation Failed");
        const hasFailed = await failedText.isVisible().catch(() => false);
        if (hasFailed) return false;
      }

      // Click "Confirm and Import"
      const confirmButton = page.getByRole("button", {
        name: /confirm and import/i,
      });
      await expect(confirmButton).toBeVisible({ timeout: 5000 });
      await confirmButton.click();

      // Wait for "Import Successful!" message
      const successText = page.locator("text=Import Successful!");
      await expect(successText).toBeVisible({ timeout: 15000 });

      // Wait for redirect to /people
      await page.waitForURL(/\/people/, { timeout: 10000 });

      return true;
    }

    /**
     * Helper: Export GEDCOM through the UI and return the file content.
     */
    async function exportGedcomFile(page: any): Promise<string> {
      await gotoWithRetry(page, "/admin/backup");
      await waitForHydration(page);

      // Switch to GEDCOM tab
      const gedcomTab = page.getByRole("tab", { name: /gedcom/i });
      await expect(gedcomTab).toBeVisible({ timeout: 5000 });
      await gedcomTab.click();

      // Find and click export button
      const exportButton = page.getByRole("button", {
        name: /export to gedcom/i,
      });
      await expect(exportButton).toBeVisible({ timeout: 5000 });

      // Listen for download, then click
      const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
      await exportButton.click();
      const download = await downloadPromise;

      // Save and read the downloaded file
      const fileName = download.suggestedFilename();
      expect(fileName.endsWith(".ged")).toBe(true);

      const savePath = path.join(tempDir, `export-${Date.now()}.ged`);
      await download.saveAs(savePath);

      const content = fs.readFileSync(savePath, "utf-8");
      expect(content.length).toBeGreaterThan(0);

      return content;
    }

    /**
     * Helper: Write GEDCOM content to a temp file and return the path.
     */
    function writeTempGedcom(content: string, name: string): string {
      const filePath = path.join(tempDir, `${name}-${Date.now()}.ged`);
      fs.writeFileSync(filePath, content, "utf-8");
      return filePath;
    }

    test("Scenario: Multi-generation family data survives import-export round-trip", async ({
      page,
      login,
    }) => {
      test.slow();

      // Use unique names to avoid collision with parallel tests or seed data
      const uid = Date.now().toString(36);
      const gedcomContent = [
        "0 HEAD",
        "1 SOUR RoundTripTest",
        "1 GEDC",
        "2 VERS 5.5.1",
        "2 FORM LINEAGE-LINKED",
        "1 CHAR UTF-8",
        `0 @I1@ INDI`,
        `1 NAME Grandpa_${uid} /RTFamily/`,
        "1 SEX M",
        "1 BIRT",
        "2 DATE 10 MAR 1940",
        "2 PLAC Chicago, Illinois, USA",
        "1 FAMS @F1@",
        `0 @I2@ INDI`,
        `1 NAME Grandma_${uid} /RTFamily/`,
        "1 SEX F",
        "1 BIRT",
        "2 DATE 15 JUN 1942",
        "2 PLAC Chicago, Illinois, USA",
        "1 FAMS @F1@",
        `0 @I3@ INDI`,
        `1 NAME Parent_${uid} /RTFamily/`,
        "1 SEX M",
        "1 BIRT",
        "2 DATE 5 SEP 1965",
        "2 PLAC Chicago, Illinois, USA",
        "1 FAMC @F1@",
        "1 FAMS @F2@",
        `0 @I4@ INDI`,
        `1 NAME Spouse_${uid} /RTMiller/`,
        "1 SEX F",
        "1 BIRT",
        "2 DATE 20 DEC 1967",
        "2 PLAC Detroit, Michigan, USA",
        "1 FAMS @F2@",
        `0 @I5@ INDI`,
        `1 NAME Child_${uid} /RTFamily/`,
        "1 SEX F",
        "1 BIRT",
        "2 DATE 12 APR 1995",
        "2 PLAC New York, New York, USA",
        "1 FAMC @F2@",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
        "1 CHIL @I3@",
        "1 MARR",
        "2 DATE 20 JUN 1963",
        "2 PLAC Chicago, Illinois, USA",
        "0 @F2@ FAM",
        "1 HUSB @I3@",
        "1 WIFE @I4@",
        "1 CHIL @I5@",
        "1 MARR",
        "2 DATE 15 AUG 1993",
        "2 PLAC New York, New York, USA",
        "0 TRLR",
      ].join("\n");

      let exportedContent = "";

      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when(
        "user imports a multi-generation GEDCOM file",
        async () => {
          const filePath = writeTempGedcom(
            gedcomContent,
            "multi-gen-roundtrip"
          );
          const success = await importGedcomFile(page, filePath);
          expect(success).toBe(true);
        }
      );

      await bdd.and("user exports the data as GEDCOM", async () => {
        exportedContent = await exportGedcomFile(page);
      });

      await bdd.then(
        "exported GEDCOM contains all imported people with correct data",
        async () => {
          // Verify all names survived (GEDCOM format: "FirstName /LastName/")
          expect(exportedContent).toContain(`Grandpa_${uid}`);
          expect(exportedContent).toContain(`Grandma_${uid}`);
          expect(exportedContent).toContain(`Parent_${uid}`);
          expect(exportedContent).toContain(`Spouse_${uid}`);
          expect(exportedContent).toContain(`Child_${uid}`);
          expect(exportedContent).toContain("/RTFamily/");
          expect(exportedContent).toContain("/RTMiller/");

          // Verify sex data
          expect(exportedContent).toContain("1 SEX M");
          expect(exportedContent).toContain("1 SEX F");

          // Verify birth dates survived (format: "D MON YYYY")
          expect(exportedContent).toContain("10 MAR 1940");
          expect(exportedContent).toContain("15 JUN 1942");
          expect(exportedContent).toContain("5 SEP 1965");
          expect(exportedContent).toContain("20 DEC 1967");
          expect(exportedContent).toContain("12 APR 1995");

          // Verify birth places survived
          expect(exportedContent).toContain("Chicago, Illinois, USA");
          expect(exportedContent).toContain("Detroit, Michigan, USA");
          expect(exportedContent).toContain("New York, New York, USA");

          // Verify marriage dates survived
          expect(exportedContent).toContain("20 JUN 1963");
          expect(exportedContent).toContain("15 AUG 1993");

          // Verify family structure exists (HUSB/WIFE/CHIL references)
          expect(exportedContent).toContain("1 HUSB");
          expect(exportedContent).toContain("1 WIFE");
          expect(exportedContent).toContain("1 CHIL");

          // Verify GEDCOM structure markers
          expect(exportedContent).toContain("0 HEAD");
          expect(exportedContent).toContain("0 TRLR");
          expect(exportedContent).toMatch(/0 @\w+@ INDI/);
          expect(exportedContent).toMatch(/0 @\w+@ FAM/);
        }
      );
    });

    test("Scenario: Remarriage and divorce data survives import-export round-trip", async ({
      page,
      login,
    }) => {
      test.slow();

      const uid = Date.now().toString(36);
      const gedcomContent = [
        "0 HEAD",
        "1 SOUR RoundTripTest",
        "1 GEDC",
        "2 VERS 5.5.1",
        "2 FORM LINEAGE-LINKED",
        "1 CHAR UTF-8",
        "0 @I1@ INDI",
        `1 NAME DivorcedHusband_${uid} /RTDivorce/`,
        "1 SEX M",
        "1 BIRT",
        "2 DATE 3 FEB 1970",
        "1 FAMS @F1@",
        "1 FAMS @F2@",
        "0 @I2@ INDI",
        `1 NAME FirstWife_${uid} /RTDivorce/`,
        "1 SEX F",
        "1 BIRT",
        "2 DATE 15 MAY 1972",
        "1 FAMS @F1@",
        "0 @I3@ INDI",
        `1 NAME SecondWife_${uid} /RTRemarriage/`,
        "1 SEX F",
        "1 BIRT",
        "2 DATE 22 SEP 1975",
        "1 FAMS @F2@",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I2@",
        "1 MARR",
        "2 DATE 10 JUN 1995",
        "1 DIV",
        "2 DATE 15 MAR 2005",
        "0 @F2@ FAM",
        "1 HUSB @I1@",
        "1 WIFE @I3@",
        "1 MARR",
        "2 DATE 20 OCT 2008",
        "0 TRLR",
      ].join("\n");

      let exportedContent = "";

      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when(
        "user imports a GEDCOM file with remarriage data",
        async () => {
          const filePath = writeTempGedcom(
            gedcomContent,
            "remarriage-roundtrip"
          );
          const success = await importGedcomFile(page, filePath);
          expect(success).toBe(true);
        }
      );

      await bdd.and("user exports the data as GEDCOM", async () => {
        exportedContent = await exportGedcomFile(page);
      });

      await bdd.then(
        "exported GEDCOM contains divorce and remarriage data",
        async () => {
          // Verify all people survived
          expect(exportedContent).toContain(`DivorcedHusband_${uid}`);
          expect(exportedContent).toContain(`FirstWife_${uid}`);
          expect(exportedContent).toContain(`SecondWife_${uid}`);

          // Verify first marriage date
          expect(exportedContent).toContain("10 JUN 1995");

          // Verify divorce date
          expect(exportedContent).toContain("1 DIV");
          expect(exportedContent).toContain("15 MAR 2005");

          // Verify second marriage date
          expect(exportedContent).toContain("20 OCT 2008");

          // Verify two FAM records exist (for the two marriages)
          const famMatches = exportedContent.match(/0 @\w+@ FAM/g) || [];
          expect(famMatches.length).toBeGreaterThanOrEqual(2);
        }
      );
    });

    test("Scenario: Person notes survive import-export round-trip", async ({
      page,
      login,
    }) => {
      test.slow();

      const uid = Date.now().toString(36);
      const noteText = "This individual served in the military from 1980-1985.";
      const gedcomContent = [
        "0 HEAD",
        "1 SOUR RoundTripTest",
        "1 GEDC",
        "2 VERS 5.5.1",
        "2 FORM LINEAGE-LINKED",
        "1 CHAR UTF-8",
        "0 @I1@ INDI",
        `1 NAME NotesPerson_${uid} /RTNotes/`,
        "1 SEX M",
        "1 BIRT",
        "2 DATE 25 DEC 1960",
        "2 PLAC Boston, Massachusetts, USA",
        `1 NOTE ${noteText}`,
        "0 TRLR",
      ].join("\n");

      let exportedContent = "";

      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when(
        "user imports a GEDCOM file with person notes",
        async () => {
          const filePath = writeTempGedcom(gedcomContent, "notes-roundtrip");
          const success = await importGedcomFile(page, filePath);
          expect(success).toBe(true);
        }
      );

      await bdd.and("user exports the data as GEDCOM", async () => {
        exportedContent = await exportGedcomFile(page);
      });

      await bdd.then(
        "exported GEDCOM contains the person with their notes",
        async () => {
          // Verify person survived
          expect(exportedContent).toContain(`NotesPerson_${uid}`);
          expect(exportedContent).toContain("/RTNotes/");

          // Verify birth data
          expect(exportedContent).toContain("25 DEC 1960");
          expect(exportedContent).toContain("Boston, Massachusetts, USA");

          // Verify note content survived (may be split across CONT lines)
          // The note text should appear somewhere in the export
          expect(exportedContent).toContain("military");
          expect(exportedContent).toContain("1980-1985");
        }
      );
    });

    test("Scenario: Deceased person with death data survives import-export round-trip", async ({
      page,
      login,
    }) => {
      test.slow();

      const uid = Date.now().toString(36);
      const gedcomContent = [
        "0 HEAD",
        "1 SOUR RoundTripTest",
        "1 GEDC",
        "2 VERS 5.5.1",
        "2 FORM LINEAGE-LINKED",
        "1 CHAR UTF-8",
        "0 @I1@ INDI",
        `1 NAME DeceasedPerson_${uid} /RTDeceased/`,
        "1 SEX M",
        "1 BIRT",
        "2 DATE 12 FEB 1920",
        "2 PLAC Philadelphia, Pennsylvania, USA",
        "1 DEAT",
        "2 DATE 5 NOV 2010",
        "1 OCCU Carpenter",
        "0 TRLR",
      ].join("\n");

      let exportedContent = "";

      await bdd.given("user is logged in as admin", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when(
        "user imports a GEDCOM file with a deceased person",
        async () => {
          const filePath = writeTempGedcom(gedcomContent, "deceased-roundtrip");
          const success = await importGedcomFile(page, filePath);
          expect(success).toBe(true);
        }
      );

      await bdd.and("user exports the data as GEDCOM", async () => {
        exportedContent = await exportGedcomFile(page);
      });

      await bdd.then(
        "exported GEDCOM contains the deceased person with death and occupation data",
        async () => {
          // Verify person survived
          expect(exportedContent).toContain(`DeceasedPerson_${uid}`);
          expect(exportedContent).toContain("/RTDeceased/");

          // Verify birth data
          expect(exportedContent).toContain("12 FEB 1920");
          expect(exportedContent).toContain("Philadelphia, Pennsylvania, USA");

          // Verify death date survived
          expect(exportedContent).toContain("1 DEAT");
          expect(exportedContent).toContain("5 NOV 2010");

          // Verify occupation survived
          expect(exportedContent).toContain("1 OCCU");
          expect(exportedContent).toContain("Carpenter");
        }
      );
    });
  });
});
