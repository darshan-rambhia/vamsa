import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { BackupPage } from "./pages/BackupPage";

test.describe("Backup and Restore", () => {
  let loginPage: LoginPage;
  let backupPage: BackupPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    backupPage = new BackupPage(page);

    // Login as admin
    await loginPage.goto();
    await loginPage.login("admin@family.local", "admin123");
    await expect(page).toHaveURL("/tree");
  });

  test.describe("Backup Export", () => {
    test("should navigate to backup page", async ({ page }) => {
      await backupPage.goto();
      await expect(page).toHaveURL("/admin/backup");
      await expect(
        page.getByRole("heading", { name: "Backup & Restore" })
      ).toBeVisible();
    });

    test("should display export form", async ({ page }) => {
      await backupPage.goto();

      await expect(backupPage.exportCard).toBeVisible();
      await expect(backupPage.includePhotosCheckbox).toBeVisible();
      await expect(backupPage.includeAuditLogsCheckbox).toBeVisible();
      await expect(backupPage.auditLogDaysInput).toBeVisible();
      await expect(backupPage.exportButton).toBeVisible();
    });

    test("should have default export options selected", async ({ page }) => {
      await backupPage.goto();

      await expect(backupPage.includePhotosCheckbox).toBeChecked();
      await expect(backupPage.includeAuditLogsCheckbox).toBeChecked();
      await expect(backupPage.auditLogDaysInput).toHaveValue("90");
    });

    test("should validate audit log days input", async ({ page }) => {
      await backupPage.goto();

      // Test minimum value
      await backupPage.auditLogDaysInput.fill("0");
      await backupPage.exportButton.click();
      await expect(page.getByText("must be at least 1")).toBeVisible();

      // Test maximum value
      await backupPage.auditLogDaysInput.fill("366");
      await backupPage.exportButton.click();
      await expect(page.getByText("must be at most 365")).toBeVisible();

      // Test valid value
      await backupPage.auditLogDaysInput.fill("30");
      await backupPage.exportButton.click();
      // Should not show validation error
      await expect(page.getByText("must be at least 1")).not.toBeVisible();
    });

    test("should initiate backup export", async ({ page }) => {
      await backupPage.goto();

      // Configure export options
      await backupPage.includePhotosCheckbox.uncheck();
      await backupPage.auditLogDaysInput.fill("30");

      // Start export
      await backupPage.exportButton.click();

      // Should show loading state
      await expect(backupPage.exportButton).toBeDisabled();
      await expect(page.getByText("Creating backup...")).toBeVisible();

      // Wait for download to complete (or error)
      await page.waitForTimeout(5000);
    });

    test("should handle export errors gracefully", async ({ page }) => {
      await backupPage.goto();

      // Mock a server error by intercepting the request
      await page.route("/api/admin/backup/export", (route) => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Server error" }),
        });
      });

      await backupPage.exportButton.click();

      await expect(page.getByText("Failed to create backup")).toBeVisible();
      await expect(backupPage.exportButton).toBeEnabled();
    });

    test("should handle rate limiting", async ({ page }) => {
      await backupPage.goto();

      // Mock rate limiting response
      await page.route("/api/admin/backup/export", (route) => {
        route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Please wait 300 seconds before creating another export",
            remainingTime: 300,
          }),
        });
      });

      await backupPage.exportButton.click();

      await expect(page.getByText("Please wait 300 seconds")).toBeVisible();
      await expect(backupPage.exportButton).toBeEnabled();
    });
  });

  test.describe("Backup Import", () => {
    test("should display import form", async ({ page }) => {
      await backupPage.goto();

      await expect(backupPage.importCard).toBeVisible();
      await expect(backupPage.fileInput).toBeVisible();
      await expect(backupPage.validateButton).toBeVisible();
    });

    test("should validate file selection", async ({ page }) => {
      await backupPage.goto();

      // Try to validate without selecting a file
      await backupPage.validateButton.click();
      await expect(page.getByText("Please select a backup file")).toBeVisible();
    });

    test("should validate file type", async ({ page }) => {
      await backupPage.goto();

      // Create a test file with wrong extension
      const fileContent = "test content";
      await backupPage.fileInput.setInputFiles({
        name: "test.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(fileContent),
      });

      await backupPage.validateButton.click();
      await expect(page.getByText("File must be a ZIP archive")).toBeVisible();
    });

    test("should validate file size", async ({ page }) => {
      await backupPage.goto();

      // Mock a large file (over 100MB)
      await page.route("/api/admin/backup/validate", (route) => {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "File size exceeds 100MB limit" }),
        });
      });

      await backupPage.fileInput.setInputFiles({
        name: "large-backup.zip",
        mimeType: "application/zip",
        buffer: Buffer.from("fake zip content"),
      });

      await backupPage.validateButton.click();
      await expect(
        page.getByText("File size exceeds 100MB limit")
      ).toBeVisible();
    });

    test("should validate backup file successfully", async ({ page }) => {
      await backupPage.goto();

      // Mock successful validation
      const mockValidationResult = {
        isValid: true,
        metadata: {
          version: "1.0.0",
          exportedAt: "2024-01-01T12:00:00.000Z",
          exportedBy: {
            id: "admin",
            email: "admin@example.com",
            name: "Admin User",
          },
          statistics: {
            totalPeople: 5,
            totalRelationships: 3,
            totalUsers: 2,
            totalSuggestions: 0,
            totalPhotos: 1,
            auditLogDays: 90,
            totalAuditLogs: 10,
          },
        },
        conflicts: [],
        statistics: {
          totalConflicts: 0,
          conflictsByType: {},
          conflictsBySeverity: {},
        },
        errors: [],
        warnings: [],
      };

      await page.route("/api/admin/backup/validate", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockValidationResult),
        });
      });

      await backupPage.fileInput.setInputFiles({
        name: "backup.zip",
        mimeType: "application/zip",
        buffer: Buffer.from("fake zip content"),
      });

      await backupPage.validateButton.click();

      // Should show validation results
      await expect(
        page.getByText("Backup validation successful")
      ).toBeVisible();
      await expect(page.getByText("5 people")).toBeVisible();
      await expect(page.getByText("3 relationships")).toBeVisible();
      await expect(page.getByText("2 users")).toBeVisible();
      await expect(page.getByText("No conflicts detected")).toBeVisible();

      // Should show import options
      await expect(backupPage.conflictStrategySelect).toBeVisible();
      await expect(backupPage.createBackupCheckbox).toBeVisible();
      await expect(backupPage.importPhotosCheckbox).toBeVisible();
      await expect(backupPage.importAuditLogsCheckbox).toBeVisible();
      await expect(backupPage.importButton).toBeVisible();
    });

    test("should display conflicts when detected", async ({ page }) => {
      await backupPage.goto();

      // Mock validation with conflicts
      const mockValidationResult = {
        isValid: true,
        metadata: {
          version: "1.0.0",
          exportedAt: "2024-01-01T12:00:00.000Z",
          exportedBy: {
            id: "admin",
            email: "admin@example.com",
            name: "Admin User",
          },
          statistics: {
            totalPeople: 3,
            totalRelationships: 1,
            totalUsers: 1,
            totalSuggestions: 0,
            totalPhotos: 0,
            auditLogDays: 90,
            totalAuditLogs: 5,
          },
        },
        conflicts: [
          {
            type: "person",
            action: "update",
            existingId: "person-1",
            severity: "medium",
            description: "Person with ID person-1 already exists",
            conflictFields: ["firstName", "email"],
          },
          {
            type: "user",
            action: "create",
            existingId: "user-1",
            severity: "high",
            description: "User with email admin@example.com already exists",
            conflictFields: ["email"],
          },
        ],
        statistics: {
          totalConflicts: 2,
          conflictsByType: { person: 1, user: 1 },
          conflictsBySeverity: { medium: 1, high: 1 },
        },
        errors: [],
        warnings: [],
      };

      await page.route("/api/admin/backup/validate", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockValidationResult),
        });
      });

      await backupPage.fileInput.setInputFiles({
        name: "backup.zip",
        mimeType: "application/zip",
        buffer: Buffer.from("fake zip content"),
      });

      await backupPage.validateButton.click();

      // Should show conflict information
      await expect(page.getByText("2 conflicts detected")).toBeVisible();
      await expect(page.getByText("1 high severity")).toBeVisible();
      await expect(page.getByText("1 medium severity")).toBeVisible();

      // Should show individual conflicts
      await expect(
        page.getByText("Person with ID person-1 already exists")
      ).toBeVisible();
      await expect(
        page.getByText("User with email admin@example.com already exists")
      ).toBeVisible();

      // Should show conflict resolution strategy selector
      await expect(backupPage.conflictStrategySelect).toBeVisible();
    });

    test("should handle validation errors", async ({ page }) => {
      await backupPage.goto();

      // Mock validation error
      await page.route("/api/admin/backup/validate", (route) => {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid backup format" }),
        });
      });

      await backupPage.fileInput.setInputFiles({
        name: "invalid-backup.zip",
        mimeType: "application/zip",
        buffer: Buffer.from("invalid content"),
      });

      await backupPage.validateButton.click();

      await expect(page.getByText("Invalid backup format")).toBeVisible();
      await expect(backupPage.importButton).not.toBeVisible();
    });

    test("should import backup successfully", async ({ page }) => {
      await backupPage.goto();

      // First validate the backup
      await page.route("/api/admin/backup/validate", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            isValid: true,
            metadata: {
              version: "1.0.0",
              exportedAt: "2024-01-01T12:00:00.000Z",
              exportedBy: {
                id: "admin",
                email: "admin@example.com",
                name: "Admin",
              },
              statistics: {
                totalPeople: 2,
                totalRelationships: 1,
                totalUsers: 1,
                totalSuggestions: 0,
                totalPhotos: 0,
                auditLogDays: 90,
                totalAuditLogs: 5,
              },
            },
            conflicts: [],
            statistics: {
              totalConflicts: 0,
              conflictsByType: {},
              conflictsBySeverity: {},
            },
            errors: [],
            warnings: [],
          }),
        });
      });

      // Mock successful import
      await page.route("/api/admin/backup/import", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            importedAt: "2024-01-01T12:00:00.000Z",
            importedBy: {
              id: "admin",
              email: "admin@example.com",
              name: "Admin",
            },
            strategy: "skip",
            statistics: {
              peopleImported: 2,
              relationshipsImported: 1,
              usersImported: 1,
              suggestionsImported: 0,
              photosImported: 0,
              auditLogsImported: 5,
              conflictsResolved: 0,
              skippedItems: 0,
            },
            errors: [],
            warnings: [],
          }),
        });
      });

      await backupPage.fileInput.setInputFiles({
        name: "backup.zip",
        mimeType: "application/zip",
        buffer: Buffer.from("fake zip content"),
      });

      await backupPage.validateButton.click();
      await expect(
        page.getByText("Backup validation successful")
      ).toBeVisible();

      // Configure import options
      await backupPage.conflictStrategySelect.selectOption("skip");
      await backupPage.createBackupCheckbox.check();
      await backupPage.importPhotosCheckbox.uncheck();

      // Start import
      await backupPage.importButton.click();

      // Should show loading state
      await expect(backupPage.importButton).toBeDisabled();
      await expect(page.getByText("Importing backup...")).toBeVisible();

      // Should show success message
      await expect(
        page.getByText("Backup imported successfully")
      ).toBeVisible();
      await expect(page.getByText("2 people imported")).toBeVisible();
      await expect(page.getByText("1 relationship imported")).toBeVisible();
      await expect(page.getByText("1 user imported")).toBeVisible();
    });

    test("should handle import errors", async ({ page }) => {
      await backupPage.goto();

      // First validate the backup
      await page.route("/api/admin/backup/validate", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            isValid: true,
            metadata: {
              version: "1.0.0",
              exportedAt: "2024-01-01T12:00:00.000Z",
              exportedBy: {
                id: "admin",
                email: "admin@example.com",
                name: "Admin",
              },
              statistics: {
                totalPeople: 2,
                totalRelationships: 1,
                totalUsers: 1,
                totalSuggestions: 0,
                totalPhotos: 0,
                auditLogDays: 90,
                totalAuditLogs: 5,
              },
            },
            conflicts: [],
            statistics: {
              totalConflicts: 0,
              conflictsByType: {},
              conflictsBySeverity: {},
            },
            errors: [],
            warnings: [],
          }),
        });
      });

      // Mock import error
      await page.route("/api/admin/backup/import", (route) => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Database connection failed" }),
        });
      });

      await backupPage.fileInput.setInputFiles({
        name: "backup.zip",
        mimeType: "application/zip",
        buffer: Buffer.from("fake zip content"),
      });

      await backupPage.validateButton.click();
      await backupPage.importButton.click();

      await expect(page.getByText("Database connection failed")).toBeVisible();
      await expect(backupPage.importButton).toBeEnabled();
    });

    test("should test all conflict resolution strategies", async ({ page }) => {
      await backupPage.goto();

      // Mock validation with conflicts
      await page.route("/api/admin/backup/validate", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            isValid: true,
            metadata: {
              version: "1.0.0",
              exportedAt: "2024-01-01T12:00:00.000Z",
              exportedBy: {
                id: "admin",
                email: "admin@example.com",
                name: "Admin",
              },
              statistics: {
                totalPeople: 2,
                totalRelationships: 1,
                totalUsers: 1,
                totalSuggestions: 0,
                totalPhotos: 0,
                auditLogDays: 90,
                totalAuditLogs: 5,
              },
            },
            conflicts: [
              {
                type: "person",
                action: "update",
                existingId: "person-1",
                severity: "medium",
                description: "Person conflict",
                conflictFields: ["firstName"],
              },
            ],
            statistics: {
              totalConflicts: 1,
              conflictsByType: { person: 1 },
              conflictsBySeverity: { medium: 1 },
            },
            errors: [],
            warnings: [],
          }),
        });
      });

      await backupPage.fileInput.setInputFiles({
        name: "backup.zip",
        mimeType: "application/zip",
        buffer: Buffer.from("fake zip content"),
      });

      await backupPage.validateButton.click();

      // Test each strategy option
      await expect(backupPage.conflictStrategySelect).toBeVisible();

      const strategies = ["skip", "replace", "merge"];
      for (const strategy of strategies) {
        await backupPage.conflictStrategySelect.selectOption(strategy);
        expect(await backupPage.conflictStrategySelect.inputValue()).toBe(
          strategy
        );
      }
    });
  });

  test.describe("Access Control", () => {
    test("should require admin access", async ({ page }) => {
      // Logout and login as non-admin user
      await page.goto("/login");
      await loginPage.login("member@family.local", "member123");

      // Try to access backup page
      await page.goto("/admin/backup");

      // Should be redirected or show access denied
      await expect(page).not.toHaveURL("/admin/backup");
    });
  });
});
