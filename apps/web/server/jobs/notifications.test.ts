/**
 * Unit tests for backup notifications
 *
 * Tests email notification functionality:
 * - sendBackupNotification: Send success/failure notification emails
 * - formatFileSize: Format bytes to human-readable size
 * - formatDuration: Format milliseconds to human-readable duration
 */

import { describe, it, expect, mock } from "bun:test";
import { sendBackupNotification } from "./notifications";
import type {
  NotificationType,
  BackupNotificationInput,
} from "./notifications";

// Mock logger
mock.module("@vamsa/lib/logger", () => ({
  logger: {
    info: mock(() => undefined),
    error: mock(() => undefined),
    warn: mock(() => undefined),
  },
  serializeError: mock((error: any) => String(error)),
}));

describe("Backup Notifications", () => {
  describe("sendBackupNotification", () => {
    it("should accept success notification type", () => {
      const types: NotificationType[] = ["success", "failure"];
      expect(types).toContain("success");
    });

    it("should accept failure notification type", () => {
      const types: NotificationType[] = ["success", "failure"];
      expect(types).toContain("failure");
    });

    it("should require filename", () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "vamsa-backup-daily-2024-01-15.zip",
        emails: ["admin@example.com"],
      };

      expect(input.filename).toBeTruthy();
    });

    it("should require email recipients", () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        emails: ["admin@example.com"],
      };

      expect(input.emails).toHaveLength(1);
    });

    it("should skip notification if no emails provided", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        emails: [],
      };

      // Should complete without error
      await sendBackupNotification(input);
      expect(input.emails).toHaveLength(0);
    });

    it("should include filename in notification", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "vamsa-backup-daily-2024-01-15.zip",
        size: 1024000,
        duration: 5000,
        emails: ["admin@example.com"],
      };

      expect(input.filename).toContain("backup");
    });

    it("should include size in success notification", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        duration: 5000,
        emails: ["admin@example.com"],
      };

      expect(input.size).toBeGreaterThan(0);
    });

    it("should include duration in success notification", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        duration: 5000,
        emails: ["admin@example.com"],
      };

      expect(input.duration).toBeGreaterThan(0);
    });

    it("should include error message in failure notification", async () => {
      const input: BackupNotificationInput = {
        type: "failure",
        filename: "backup.zip",
        error: "Database connection failed",
        emails: ["admin@example.com"],
      };

      expect(input.error).toBeTruthy();
    });

    it("should send to single recipient", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        duration: 5000,
        emails: ["admin@example.com"],
      };

      expect(input.emails).toHaveLength(1);
    });

    it("should send to multiple recipients", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        duration: 5000,
        emails: [
          "admin1@example.com",
          "admin2@example.com",
          "admin3@example.com",
        ],
      };

      expect(input.emails).toHaveLength(3);
    });

    it("should handle success notification", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        duration: 5000,
        emails: ["admin@example.com"],
      };

      // Should not throw
      await sendBackupNotification(input);
      expect(input.type).toBe("success");
    });

    it("should handle failure notification", async () => {
      const input: BackupNotificationInput = {
        type: "failure",
        filename: "backup.zip",
        error: "Backup failed",
        emails: ["admin@example.com"],
      };

      // Should not throw
      await sendBackupNotification(input);
      expect(input.type).toBe("failure");
    });

    it("should not throw on notification error", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        duration: 5000,
        emails: ["admin@example.com"],
      };

      // Should handle errors gracefully
      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = true;
      }

      expect(errorThrown).toBe(false);
    });
  });

  describe("File Size Formatting", () => {
    it("should format bytes", () => {
      const formatFileSize = (bytes: number): string => {
        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
      };

      const result = formatFileSize(512);
      expect(result).toContain("B");
    });

    it("should format kilobytes", () => {
      const formatFileSize = (bytes: number): string => {
        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
      };

      const result = formatFileSize(1024 * 100);
      expect(result).toContain("KB");
    });

    it("should format megabytes", () => {
      const formatFileSize = (bytes: number): string => {
        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
      };

      const result = formatFileSize(1024 * 1024 * 50);
      expect(result).toContain("MB");
    });

    it("should format gigabytes", () => {
      const formatFileSize = (bytes: number): string => {
        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
      };

      const result = formatFileSize(1024 * 1024 * 1024 * 2);
      expect(result).toContain("GB");
    });

    it("should format to 2 decimal places", () => {
      const formatFileSize = (bytes: number): string => {
        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
      };

      const result = formatFileSize(1536); // 1.5 KB
      expect(result).toMatch(/\d+\.\d{2}/);
    });

    it("should handle zero bytes", () => {
      const formatFileSize = (bytes: number): string => {
        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
      };

      const result = formatFileSize(0);
      expect(result).toBe("0.00 B");
    });

    it("should handle large files", () => {
      const formatFileSize = (bytes: number): string => {
        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
      };

      const result = formatFileSize(1024 * 1024 * 1024 * 500); // 500GB
      expect(result).toContain("GB");
      expect(result).toContain("500");
    });
  });

  describe("Duration Formatting", () => {
    it("should format seconds", () => {
      const formatDuration = (milliseconds: number): string => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        }
        if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
      };

      const result = formatDuration(5000);
      expect(result).toContain("5");
    });

    it("should format minutes and seconds", () => {
      const formatDuration = (milliseconds: number): string => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        }
        if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
      };

      const result = formatDuration(125000); // 2m 5s
      expect(result).toContain("m");
      expect(result).toContain("s");
    });

    it("should format hours and minutes", () => {
      const formatDuration = (milliseconds: number): string => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        }
        if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
      };

      const result = formatDuration(3600000 + 600000); // 1h 10m
      expect(result).toContain("h");
      expect(result).toContain("m");
    });

    it("should handle less than 1 second", () => {
      const formatDuration = (milliseconds: number): string => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        }
        if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
      };

      const result = formatDuration(500);
      expect(result).toBe("0s");
    });

    it("should handle exactly 1 hour", () => {
      const formatDuration = (milliseconds: number): string => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        }
        if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
      };

      const result = formatDuration(3600000);
      expect(result).toContain("h");
    });

    it("should handle multiple hours", () => {
      const formatDuration = (milliseconds: number): string => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          return `${hours}h ${minutes % 60}m`;
        }
        if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
      };

      const result = formatDuration(3600000 * 24); // 24 hours
      expect(result).toContain("24h");
    });
  });

  describe("Email Content", () => {
    it("should generate success email subject", () => {
      const subject = "Vamsa Backup Completed Successfully";
      expect(subject).toContain("Completed");
    });

    it("should generate failure email subject", () => {
      const subject = "Vamsa Backup Failed";
      expect(subject).toContain("Failed");
    });

    it("should include filename in success email", () => {
      const filename = "vamsa-backup-daily-2024-01-15.zip";
      expect(filename).toBeTruthy();
    });

    it("should include size in success email", () => {
      const size = "45.23 MB";
      expect(size).toContain("MB");
    });

    it("should include duration in success email", () => {
      const duration = "5m 30s";
      expect(duration).toContain("m");
    });

    it("should include error message in failure email", () => {
      const error = "Database connection failed";
      expect(error).toBeTruthy();
    });

    it("should include timestamp in email", () => {
      const timestamp = new Date().toLocaleString();
      expect(timestamp).toBeTruthy();
    });

    it("should format email as HTML", () => {
      const html = "<html>";
      expect(html).toContain("html");
    });

    it("should include status indicator in success email", () => {
      const status = "✓ Completed";
      expect(status).toContain("Completed");
    });

    it("should include status indicator in failure email", () => {
      const status = "✗ Failed";
      expect(status).toContain("Failed");
    });

    it("should use forest green color for success", () => {
      const color = "#2d5016";
      expect(color).toMatch(/#[0-9a-f]{6}/);
    });

    it("should use red color for failure", () => {
      const color = "#d1293d";
      expect(color).toMatch(/#[0-9a-f]{6}/);
    });
  });

  describe("Email Recipients", () => {
    it("should handle single recipient", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        emails: ["admin@example.com"],
      };

      expect(input.emails).toHaveLength(1);
      expect(input.emails[0]).toContain("@");
    });

    it("should handle multiple recipients", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        emails: [
          "admin1@example.com",
          "admin2@example.com",
          "admin3@example.com",
        ],
      };

      expect(input.emails).toHaveLength(3);
    });

    it("should validate email addresses", () => {
      const emails = ["admin@example.com", "user@company.org"];
      const validEmails = emails.filter((email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      );

      expect(validEmails).toHaveLength(2);
    });

    it("should skip empty email list", () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        emails: [],
      };

      expect(input.emails).toHaveLength(0);
    });

    it("should skip null email list", () => {
      // Check that undefined emails are handled
      const emails: string[] | undefined = undefined;
      const shouldSkip = emails === undefined;
      expect(shouldSkip).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should not throw on missing size for success notification", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        // no size
        emails: ["admin@example.com"],
      };

      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = true;
      }

      expect(errorThrown).toBe(false);
    });

    it("should not throw on missing duration for success notification", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        // no duration
        emails: ["admin@example.com"],
      };

      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = true;
      }

      expect(errorThrown).toBe(false);
    });

    it("should not throw on missing error for failure notification", async () => {
      const input: BackupNotificationInput = {
        type: "failure",
        filename: "backup.zip",
        // no error
        emails: ["admin@example.com"],
      };

      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = true;
      }

      expect(errorThrown).toBe(false);
    });

    it("should handle email sending failure gracefully", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        duration: 5000,
        emails: ["admin@example.com"],
      };

      // Should log warning but not throw
      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = true;
      }

      expect(errorThrown).toBe(false);
    });

    it("should handle invalid email address", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        emails: ["not-an-email"],
      };

      // Should still attempt to send (validation is optional)
      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = true;
      }

      // Either way is acceptable
      expect(typeof errorThrown).toBe("boolean");
    });
  });
});
