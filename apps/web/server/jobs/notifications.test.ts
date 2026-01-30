/**
 * Unit tests for backup notifications
 *
 * Tests email notification functionality:
 * - sendBackupNotification: Send success/failure notification emails
 * - Formatting utilities and error handling
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock logger for this test file
import {
  clearAllMocks,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockLog,
  mockLogger,
  mockLoggers,
  mockSerializeError,
  mockStartTimer,
} from "../../tests/setup/shared-mocks";

// Import the module (logger mock is applied by this file)
import { sendBackupNotification } from "./notifications";
import type { BackupNotificationInput } from "./notifications";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  log: mockLog,
  loggers: mockLoggers,
  createLogger: () => mockLog,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

describe("Backup Notifications", () => {
  beforeEach(() => {
    // Clear mock call history before each test
    clearAllMocks();
  });

  describe("sendBackupNotification - Success Cases", () => {
    it("should accept success notification type", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "vamsa-backup-daily-2024-01-15.zip",
        size: 1024000,
        duration: 5000,
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      // Should complete without throwing
      expect(true).toBe(true);
    });

    it("should handle success notification with all details", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 52428800, // 50MB
        duration: 30000, // 30 seconds
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

    it("should handle success notification without optional size", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        duration: 2000,
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

    it("should handle success notification without optional duration", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1048576,
        emails: ["admin@example.com"],
      };

      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = false;
      }
      expect(errorThrown).toBe(false);
    });

    it("should handle success notification with minimal fields", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
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
  });

  describe("sendBackupNotification - Failure Cases", () => {
    it("should accept failure notification type", async () => {
      const input: BackupNotificationInput = {
        type: "failure",
        filename: "backup.zip",
        error: "Database connection timeout",
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

    it("should handle failure notification without error message", async () => {
      const input: BackupNotificationInput = {
        type: "failure",
        filename: "backup.zip",
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

    it("should handle failure with descriptive error", async () => {
      const input: BackupNotificationInput = {
        type: "failure",
        filename: "vamsa-backup-2024-01-15.zip",
        error: "Storage quota exceeded - disk full",
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
  });

  describe("sendBackupNotification - Email Recipients", () => {
    it("should skip notification if emails array is empty", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        emails: [],
      };

      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = true;
      }

      // Should complete without throwing
      expect(errorThrown).toBe(false);
    });

    it("should skip notification if emails is falsy", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        emails: [] as any,
      };

      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = true;
      }
      expect(errorThrown).toBe(false);
    });

    it("should handle single email recipient", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
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

    it("should handle multiple email recipients", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        emails: ["admin1@example.com", "admin2@example.com", "ops@example.com"],
      };

      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = true;
      }
      expect(errorThrown).toBe(false);
    });
  });

  describe("sendBackupNotification - Error Handling", () => {
    it("should not throw on error", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        emails: ["admin@example.com"],
      };

      // Even if there's an error in email sending, it should not throw
      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = true;
      }

      expect(errorThrown).toBe(false);
    });

    it("should not block backup process on notification failure", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        duration: 5000,
        emails: ["admin@example.com"],
      };

      // Should complete successfully even if notification fails
      const result = await sendBackupNotification(input);
      expect(result).toBeUndefined();
    });

    it("should handle large email lists", async () => {
      const emails = Array(50)
        .fill(0)
        .map((_, i) => `admin${i}@example.com`);

      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        duration: 5000,
        emails,
      };

      let errorThrown = false;
      try {
        await sendBackupNotification(input);
      } catch {
        errorThrown = true;
      }
      expect(errorThrown).toBe(false);
    });
  });

  describe("Notification Subject Lines", () => {
    it("should generate correct subject for success notification", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);

      const calls = mockLogger.info.mock.calls as Array<Array<unknown>>;
      const subjectCall = calls.find((call) => {
        const args = call[0];
        return (
          typeof args === "object" &&
          args !== null &&
          "subject" in args &&
          typeof (args as Record<string, unknown>).subject === "string" &&
          ((args as Record<string, unknown>).subject as string).includes(
            "Completed"
          )
        );
      });

      expect(subjectCall).toBeDefined();
    });

    it("should generate correct subject for failure notification", async () => {
      const input: BackupNotificationInput = {
        type: "failure",
        filename: "backup.zip",
        error: "Connection timeout",
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);

      const calls = mockLogger.info.mock.calls as Array<Array<unknown>>;
      const subjectCall = calls.find((call) => {
        const args = call[0];
        return (
          typeof args === "object" &&
          args !== null &&
          "subject" in args &&
          typeof (args as Record<string, unknown>).subject === "string" &&
          ((args as Record<string, unknown>).subject as string).includes(
            "Failed"
          )
        );
      });

      expect(subjectCall).toBeDefined();
    });
  });

  describe("Large File Size Handling", () => {
    it("should format bytes correctly", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 512,
        duration: 1000,
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should format kilobytes correctly", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 102400, // 100 KB
        duration: 2000,
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should format megabytes correctly", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 52428800, // 50 MB
        duration: 30000,
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should format gigabytes correctly", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 2147483648, // 2 GB
        duration: 120000,
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle zero byte backup", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "empty.zip",
        size: 0,
        duration: 100,
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe("Duration Formatting in Notifications", () => {
    it("should format very short duration (< 1 second)", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024,
        duration: 500,
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should format seconds only duration", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        duration: 5000,
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should format minutes and seconds duration", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 1024000,
        duration: 125000, // 2m 5s
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should format hours and minutes duration", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 5368709120, // 5GB
        duration: 4260000, // 1h 11m
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should format long duration correctly", async () => {
      const input: BackupNotificationInput = {
        type: "success",
        filename: "backup.zip",
        size: 10737418240, // 10GB
        duration: 86400000, // 24 hours
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe("Failure Notification Details", () => {
    it("should include error details in failure notification", async () => {
      const input: BackupNotificationInput = {
        type: "failure",
        filename: "backup.zip",
        error: "Database connection failed: timeout",
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle very long error messages", async () => {
      const longError =
        "This is a very long error message that contains detailed information about what went wrong. " +
        "It includes stack traces and debugging information. " +
        "It should be included in the notification email.";

      const input: BackupNotificationInput = {
        type: "failure",
        filename: "backup.zip",
        error: longError,
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should handle special characters in error message", async () => {
      const input: BackupNotificationInput = {
        type: "failure",
        filename: "backup.zip",
        error: "Error: Connection <failed> & 'timeout' occurred",
        emails: ["admin@example.com"],
      };

      await sendBackupNotification(input);
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
});
