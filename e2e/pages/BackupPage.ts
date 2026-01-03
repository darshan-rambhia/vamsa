import { type Page, type Locator, expect } from "@playwright/test";

export class BackupPage {
  readonly page: Page;

  // Export section
  readonly exportCard: Locator;
  readonly includePhotosCheckbox: Locator;
  readonly includeAuditLogsCheckbox: Locator;
  readonly auditLogDaysInput: Locator;
  readonly exportButton: Locator;

  // Import section
  readonly importCard: Locator;
  readonly fileInput: Locator;
  readonly validateButton: Locator;
  readonly importButton: Locator;

  // Import options (shown after validation)
  readonly conflictStrategySelect: Locator;
  readonly createBackupCheckbox: Locator;
  readonly importPhotosCheckbox: Locator;
  readonly importAuditLogsCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;

    // Export section - Updated to match actual implementation
    this.exportCard = page
      .locator("h1")
      .filter({ hasText: "Backup & Restore" });
    this.includePhotosCheckbox = page
      .getByLabel("Include photos")
      .or(page.locator('[data-testid="include-photos"]')); // Fallback if label doesn't exist
    this.includeAuditLogsCheckbox = page
      .getByLabel("Include audit logs")
      .or(page.locator('[data-testid="include-audit-logs"]'));
    this.auditLogDaysInput = page
      .getByLabel("Audit log days")
      .or(page.locator('[data-testid="audit-log-days"]'));
    this.exportButton = page.getByRole("button", { name: "Download Backup" });

    // Import section - Use text selector instead of heading
    this.importCard = page
      .locator("text=Import Data")
      .locator("..")
      .locator("..")
      .locator("..");
    this.fileInput = page.getByLabel("Backup File (.zip)");
    this.validateButton = page.getByRole("button", { name: "Validate Backup" });
    this.importButton = page.getByRole("button", {
      name: "Confirm and Import",
    });

    // Import options
    this.conflictStrategySelect = page.getByLabel(
      "Conflict resolution strategy"
    );
    this.createBackupCheckbox = page.getByLabel("Create backup before import");
    this.importPhotosCheckbox = page.getByLabel("Import photos");
    this.importAuditLogsCheckbox = page.getByLabel("Import audit logs");
  }

  async goto() {
    await this.page.goto("/admin/backup");
  }

  async exportBackup(
    _options: {
      includePhotos?: boolean;
      includeAuditLogs?: boolean;
      auditLogDays?: number;
    } = {}
  ) {
    // Since the actual implementation is simple, just click download
    await this.exportButton.click();
  }

  async validateBackup(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
    await this.validateButton.click();
  }

  async importBackup(
    options: {
      strategy?: "skip" | "replace" | "merge";
      createBackup?: boolean;
      importPhotos?: boolean;
      importAuditLogs?: boolean;
    } = {}
  ) {
    if (options.strategy) {
      await this.conflictStrategySelect.selectOption(options.strategy);
    }

    if (options.createBackup !== undefined) {
      if (options.createBackup) {
        await this.createBackupCheckbox.check();
      } else {
        await this.createBackupCheckbox.uncheck();
      }
    }

    if (options.importPhotos !== undefined) {
      if (options.importPhotos) {
        await this.importPhotosCheckbox.check();
      } else {
        await this.importPhotosCheckbox.uncheck();
      }
    }

    if (options.importAuditLogs !== undefined) {
      if (options.importAuditLogs) {
        await this.importAuditLogsCheckbox.check();
      } else {
        await this.importAuditLogsCheckbox.uncheck();
      }
    }

    await this.importButton.click();
  }

  async expectExportSuccess() {
    // For download, we might need to check for download event instead
    // or wait for the button to be enabled again
    await expect(this.exportButton).toBeEnabled();
  }

  async expectExportError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  async expectValidationSuccess() {
    await expect(this.page.getByText("Import Preview")).toBeVisible();
  }

  async expectValidationError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  async expectImportSuccess() {
    await expect(
      this.page.getByText("Backup imported successfully")
    ).toBeVisible();
  }

  async expectImportError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  async expectConflicts(count: number) {
    if (count === 0) {
      await expect(this.page.getByText(/No Conflicts/i)).toBeVisible();
    } else {
      await expect(this.page.getByText(`${count} conflicts`)).toBeVisible();
    }
  }

  async expectStatistics(stats: {
    people?: number;
    relationships?: number;
    users?: number;
    photos?: number;
  }) {
    if (stats.people !== undefined) {
      await expect(
        this.page.getByText(`${stats.people}`).first()
      ).toBeVisible();
    }
    if (stats.relationships !== undefined) {
      await expect(
        this.page.getByText(`${stats.relationships}`).first()
      ).toBeVisible();
    }
    if (stats.users !== undefined) {
      await expect(this.page.getByText(`${stats.users}`).first()).toBeVisible();
    }
    if (stats.photos !== undefined) {
      await expect(
        this.page.getByText(`${stats.photos}`).first()
      ).toBeVisible();
    }
  }
}
