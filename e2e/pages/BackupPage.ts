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

    // Export section
    this.exportCard = page
      .locator('[data-testid="export-card"]')
      .or(page.getByRole("heading", { name: "Export Data" }).locator(".."));
    this.includePhotosCheckbox = page.getByLabel("Include photos");
    this.includeAuditLogsCheckbox = page.getByLabel("Include audit logs");
    this.auditLogDaysInput = page.getByLabel("Audit log days");
    this.exportButton = page.getByRole("button", { name: "Create Backup" });

    // Import section
    this.importCard = page
      .locator('[data-testid="import-card"]')
      .or(page.getByRole("heading", { name: "Import Data" }).locator(".."));
    this.fileInput = page.getByLabel("Backup file");
    this.validateButton = page.getByRole("button", { name: "Validate Backup" });
    this.importButton = page.getByRole("button", { name: "Import Backup" });

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
    options: {
      includePhotos?: boolean;
      includeAuditLogs?: boolean;
      auditLogDays?: number;
    } = {}
  ) {
    if (options.includePhotos !== undefined) {
      if (options.includePhotos) {
        await this.includePhotosCheckbox.check();
      } else {
        await this.includePhotosCheckbox.uncheck();
      }
    }

    if (options.includeAuditLogs !== undefined) {
      if (options.includeAuditLogs) {
        await this.includeAuditLogsCheckbox.check();
      } else {
        await this.includeAuditLogsCheckbox.uncheck();
      }
    }

    if (options.auditLogDays !== undefined) {
      await this.auditLogDaysInput.fill(options.auditLogDays.toString());
    }

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
    await expect(
      this.page.getByText("Backup created successfully")
    ).toBeVisible();
  }

  async expectExportError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  async expectValidationSuccess() {
    await expect(
      this.page.getByText("Backup validation successful")
    ).toBeVisible();
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
      await expect(this.page.getByText("No conflicts detected")).toBeVisible();
    } else {
      await expect(
        this.page.getByText(`${count} conflicts detected`)
      ).toBeVisible();
    }
  }

  async expectStatistics(stats: {
    people?: number;
    relationships?: number;
    users?: number;
    photos?: number;
  }) {
    if (stats.people !== undefined) {
      await expect(this.page.getByText(`${stats.people} people`)).toBeVisible();
    }
    if (stats.relationships !== undefined) {
      await expect(
        this.page.getByText(`${stats.relationships} relationships`)
      ).toBeVisible();
    }
    if (stats.users !== undefined) {
      await expect(this.page.getByText(`${stats.users} users`)).toBeVisible();
    }
    if (stats.photos !== undefined) {
      await expect(this.page.getByText(`${stats.photos} photos`)).toBeVisible();
    }
  }
}
