/**
 * Unit Tests for EmailService
 *
 * Tests cover:
 * - Email sending via Resend
 * - Email logging to database
 * - Error handling for failed sends
 * - Notification preference parsing
 * - Password reset email flow
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Import after mocks
import { EmailService } from "./service";
import type { EmailTemplate } from "./templates";

// Use vi.hoisted to ensure mocks are available during module evaluation
const { mockDrizzleDb, mockResendSend, MockResend, mockConfig } = vi.hoisted(
  () => {
    const mockInsertChain = () => ({
      values: vi.fn(() => Promise.resolve()),
    });

    const db = {
      insert: vi.fn(() => mockInsertChain()),
    };

    const send = vi.fn();

    // Create a proper mock constructor
    class ResendMock {
      emails = {
        send,
      };
    }

    const config = {
      enabled: true,
      apiKey: "test-api-key",
      from: "test@vamsa.local",
    };

    return {
      mockDrizzleDb: db,
      mockResendSend: send,
      MockResend: ResendMock,
      mockConfig: config,
    };
  }
);

// Mock the dependencies
vi.mock("../client", () => ({
  drizzleDb: mockDrizzleDb,
}));

vi.mock("resend", () => ({
  Resend: MockResend,
}));

vi.mock("./config", () => ({
  EMAIL_CONFIG: mockConfig,
}));

describe("EmailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockDrizzleDb.insert as any).mockClear();
  });

  describe("sendEmail", () => {
    it("should send email successfully via Resend", async () => {
      const emailService = new EmailService();

      const template: EmailTemplate = {
        subject: "Test Email",
        html: "<p>Test</p>",
        text: "Test",
      };

      mockResendSend.mockResolvedValueOnce({
        data: { id: "msg-123" },
        error: null,
      });

      const result = await emailService.sendEmail(
        "test@example.com",
        template,
        "test",
        "user-123",
        { foo: "bar" }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-123");
      expect(mockResendSend).toHaveBeenCalledWith({
        from: "test@vamsa.local",
        to: "test@example.com",
        subject: "Test Email",
        html: "<p>Test</p>",
        text: "Test",
      });
      expect(mockDrizzleDb.insert).toHaveBeenCalledTimes(1);
    });

    it("should handle Resend API errors", async () => {
      const emailService = new EmailService();

      const template: EmailTemplate = {
        subject: "Test Email",
        html: "<p>Test</p>",
        text: "Test",
      };

      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid API key" },
      });

      const result = await emailService.sendEmail(
        "test@example.com",
        template,
        "test",
        "user-123",
        null
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid API key");
      expect(mockDrizzleDb.insert).toHaveBeenCalledTimes(1); // Error logged
    });

    it("should handle exceptions during send", async () => {
      const emailService = new EmailService();

      const template: EmailTemplate = {
        subject: "Test Email",
        html: "<p>Test</p>",
        text: "Test",
      };

      mockResendSend.mockRejectedValueOnce(new Error("Network error"));

      const result = await emailService.sendEmail(
        "test@example.com",
        template,
        "test",
        "user-123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(mockDrizzleDb.insert).toHaveBeenCalledTimes(1);
    });

    it("should handle non-Error exceptions", async () => {
      const emailService = new EmailService();

      const template: EmailTemplate = {
        subject: "Test Email",
        html: "<p>Test</p>",
        text: "Test",
      };

      mockResendSend.mockRejectedValueOnce("String error");

      const result = await emailService.sendEmail(
        "test@example.com",
        template,
        "test",
        "user-123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("should log even if database logging fails", async () => {
      const emailService = new EmailService();

      const template: EmailTemplate = {
        subject: "Test Email",
        html: "<p>Test</p>",
        text: "Test",
      };

      mockResendSend.mockRejectedValueOnce(new Error("Send failed"));

      // First insert (logging the error) should fail
      (mockDrizzleDb.insert as any).mockReturnValueOnce({
        values: vi.fn(() => {
          throw new Error("DB error");
        }),
      });

      const result = await emailService.sendEmail(
        "test@example.com",
        template,
        "test",
        "user-123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Send failed");
    });
  });

  describe("sendEmail with disabled email", () => {
    it("should skip sending when Resend is not initialized", async () => {
      // Re-mock config with disabled email
      vi.doMock("./config", () => ({
        EMAIL_CONFIG: {
          enabled: false,
          apiKey: null,
          from: "test@vamsa.local",
        },
      }));

      // Create a service with no Resend instance
      const emailService = new EmailService();
      (emailService as any).resend = null;

      const template: EmailTemplate = {
        subject: "Test Email",
        html: "<p>Test</p>",
        text: "Test",
      };

      const result = await emailService.sendEmail(
        "test@example.com",
        template,
        "test",
        "user-123"
      );

      expect(result.success).toBe(true);
      expect(mockResendSend).not.toHaveBeenCalled();
      expect(mockDrizzleDb.insert).toHaveBeenCalledTimes(1); // Still logs
    });
  });

  describe("parseNotificationPreferences", () => {
    const emailService = new EmailService();

    it("should return defaults for null input", () => {
      const prefs = emailService.parseNotificationPreferences(null);

      expect(prefs).toEqual({
        suggestionsCreated: true,
        suggestionsUpdated: true,
        newMemberJoined: true,
        birthdayReminders: true,
      });
    });

    it("should return defaults for non-object input", () => {
      const prefs = emailService.parseNotificationPreferences("string");

      expect(prefs).toEqual({
        suggestionsCreated: true,
        suggestionsUpdated: true,
        newMemberJoined: true,
        birthdayReminders: true,
      });
    });

    it("should parse object with all false values", () => {
      const prefs = emailService.parseNotificationPreferences({
        suggestionsCreated: false,
        suggestionsUpdated: false,
        newMemberJoined: false,
        birthdayReminders: false,
      });

      expect(prefs).toEqual({
        suggestionsCreated: false,
        suggestionsUpdated: false,
        newMemberJoined: false,
        birthdayReminders: false,
      });
    });

    it("should parse partial object with defaults", () => {
      const prefs = emailService.parseNotificationPreferences({
        suggestionsCreated: false,
      });

      expect(prefs).toEqual({
        suggestionsCreated: false,
        suggestionsUpdated: true,
        newMemberJoined: true,
        birthdayReminders: true,
      });
    });
  });

  describe("shouldSendNotification", () => {
    const emailService = new EmailService();

    it("should return true when preference is enabled", () => {
      const prefs = {
        suggestionsCreated: true,
        suggestionsUpdated: false,
        newMemberJoined: true,
        birthdayReminders: false,
      };

      expect(
        emailService.shouldSendNotification(prefs, "suggestionsCreated")
      ).toBe(true);
      expect(
        emailService.shouldSendNotification(prefs, "newMemberJoined")
      ).toBe(true);
    });

    it("should return false when preference is disabled", () => {
      const prefs = {
        suggestionsCreated: true,
        suggestionsUpdated: false,
        newMemberJoined: true,
        birthdayReminders: false,
      };

      expect(
        emailService.shouldSendNotification(prefs, "suggestionsUpdated")
      ).toBe(false);
      expect(
        emailService.shouldSendNotification(prefs, "birthdayReminders")
      ).toBe(false);
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("should send password reset email", async () => {
      const emailService = new EmailService();

      mockResendSend.mockResolvedValueOnce({
        data: { id: "msg-456" },
        error: null,
      });

      const result = await emailService.sendPasswordResetEmail(
        "user@example.com",
        "https://reset.link/token",
        "user-999"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-456");
      expect(mockResendSend).toHaveBeenCalled();
      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.to).toBe("user@example.com");
      expect(callArgs.subject).toBe("Reset your Vamsa password");
      expect(callArgs.from).toBe("test@vamsa.local");
    });

    it("should use system as default userId", async () => {
      const emailService = new EmailService();

      mockResendSend.mockResolvedValueOnce({
        data: { id: "msg-789" },
        error: null,
      });

      const result = await emailService.sendPasswordResetEmail(
        "user@example.com",
        "https://reset.link/token"
      );

      expect(result.success).toBe(true);
    });
  });
});
