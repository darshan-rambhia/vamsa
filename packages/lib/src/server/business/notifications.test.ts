/**
 * Unit tests for notifications server business logic
 *
 * Tests cover:
 * - Retrieving user email notification preferences (with defaults)
 * - Updating user email notification preferences (partial updates)
 * - Sending suggestion created notifications to admins
 * - Sending suggestion updated notifications to submitter
 * - Sending new member joined notifications to members
 * - Sending birthday reminder notifications
 * - Error handling and preference checking
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { NotificationsDb } from "@vamsa/lib/server/business";

// Mock logger for this test file
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../testing/shared-mocks";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

// Mock emailService and email template creators
const mockEmailService = {
  parseNotificationPreferences: mock((prefs: unknown) => {
    if (!prefs || typeof prefs !== "object") {
      return {
        suggestionsCreated: true,
        suggestionsUpdated: true,
        newMemberJoined: true,
        birthdayReminders: true,
      };
    }
    return prefs as Record<string, boolean>;
  }),
  shouldSendNotification: mock(
    (prefs: Record<string, boolean>, type: string) => {
      return (prefs as Record<string, boolean>)[type] !== false;
    }
  ),
  sendEmail: mock(() => Promise.resolve()),
};

const mockCreateSuggestionCreatedEmail = mock(() => ({
  subject: "New Suggestion",
  html: "<p>A new suggestion has been created</p>",
}));

const mockCreateSuggestionUpdatedEmail = mock(() => ({
  subject: "Suggestion Reviewed",
  html: "<p>Your suggestion has been reviewed</p>",
}));

const mockCreateNewMemberEmail = mock(() => ({
  subject: "New Member",
  html: "<p>A new member has joined</p>",
}));

const mockCreateBirthdayReminderEmail = mock(() => ({
  subject: "Birthday Reminder",
  html: "<p>Someone has a birthday today</p>",
}));

mock.module("@vamsa/api", () => ({
  emailService: mockEmailService,
  createSuggestionCreatedEmail: mockCreateSuggestionCreatedEmail,
  createSuggestionUpdatedEmail: mockCreateSuggestionUpdatedEmail,
  createNewMemberEmail: mockCreateNewMemberEmail,
  createBirthdayReminderEmail: mockCreateBirthdayReminderEmail,
}));

// Import the functions to test
import {
  getEmailNotificationPreferences,
  updateEmailNotificationPreferences,
  notifySuggestionCreated,
  notifySuggestionUpdated,
  notifyNewMemberJoined,
  sendBirthdayReminders,
} from "@vamsa/lib/server/business";

// Create mock database client
function createMockDb(): NotificationsDb {
  return {
    user: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      findFirst: mock(() => Promise.resolve(null)),
      update: mock(() => Promise.resolve({})),
    },
    suggestion: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    person: {
      findMany: mock(() => Promise.resolve([])),
    },
    familySettings: {
      findFirst: mock(() => Promise.resolve(null)),
    },
  } as unknown as NotificationsDb;
}

describe("Notifications Server Functions", () => {
  let mockDb: NotificationsDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    mockEmailService.sendEmail.mockClear();
    mockCreateSuggestionCreatedEmail.mockClear();
    mockCreateSuggestionUpdatedEmail.mockClear();
    mockCreateNewMemberEmail.mockClear();
    mockCreateBirthdayReminderEmail.mockClear();
  });

  describe("getEmailNotificationPreferences", () => {
    it("should throw error when user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue(
        null
      );

      try {
        await getEmailNotificationPreferences("user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("User not found");
      }
    });

    it("should return default preferences when none exist", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        emailNotificationPreferences: null,
      });

      const result = await getEmailNotificationPreferences("user-1", mockDb);

      expect(result.suggestionsCreated).toBe(true);
      expect(result.suggestionsUpdated).toBe(true);
      expect(result.newMemberJoined).toBe(true);
      expect(result.birthdayReminders).toBe(true);
    });

    it("should return empty object preferences as-is", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        emailNotificationPreferences: {},
      });

      const result = await getEmailNotificationPreferences("user-1", mockDb);

      expect(result).toEqual({});
    });

    it("should return existing preferences", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        emailNotificationPreferences: {
          suggestionsCreated: false,
          suggestionsUpdated: true,
          newMemberJoined: false,
          birthdayReminders: true,
        },
      });

      const result = await getEmailNotificationPreferences("user-1", mockDb);

      expect(result.suggestionsCreated).toBe(false);
      expect(result.suggestionsUpdated).toBe(true);
      expect(result.newMemberJoined).toBe(false);
      expect(result.birthdayReminders).toBe(true);
    });
  });

  describe("updateEmailNotificationPreferences", () => {
    it("should throw error when user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue(
        null
      );

      try {
        await updateEmailNotificationPreferences("user-1", {}, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("User not found");
      }
    });

    it("should update single preference", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
        emailNotificationPreferences: {
          suggestionsCreated: true,
          suggestionsUpdated: true,
          newMemberJoined: true,
          birthdayReminders: true,
        },
      });
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
      });

      const result = await updateEmailNotificationPreferences(
        "user-1",
        { suggestionsCreated: false },
        mockDb
      );

      expect(result.suggestionsCreated).toBe(false);
      expect(result.suggestionsUpdated).toBe(true);
      expect(result.newMemberJoined).toBe(true);
      expect(result.birthdayReminders).toBe(true);
    });

    it("should update multiple preferences", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
        emailNotificationPreferences: {
          suggestionsCreated: true,
          suggestionsUpdated: true,
          newMemberJoined: true,
          birthdayReminders: true,
        },
      });
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
      });

      const result = await updateEmailNotificationPreferences(
        "user-1",
        {
          suggestionsCreated: false,
          birthdayReminders: false,
        },
        mockDb
      );

      expect(result.suggestionsCreated).toBe(false);
      expect(result.suggestionsUpdated).toBe(true);
      expect(result.newMemberJoined).toBe(true);
      expect(result.birthdayReminders).toBe(false);
    });

    it("should call update with correct data", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
        emailNotificationPreferences: {
          suggestionsCreated: true,
          suggestionsUpdated: true,
          newMemberJoined: true,
          birthdayReminders: true,
        },
      });
      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
      });

      await updateEmailNotificationPreferences(
        "user-1",
        { suggestionsCreated: false },
        mockDb
      );

      const call = (mockDb.user.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]).toEqual({
        where: { id: "user-1" },
        data: {
          emailNotificationPreferences: {
            suggestionsCreated: false,
            suggestionsUpdated: true,
            newMemberJoined: true,
            birthdayReminders: true,
          },
        },
      });
    });
  });

  describe("notifySuggestionCreated", () => {
    it("should log error when suggestion not found", async () => {
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await notifySuggestionCreated("suggestion-1", mockDb);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should log warning when no admins found", async () => {
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: "suggestion-1",
        submittedBy: {
          id: "user-1",
          name: "John Doe",
          email: "john@example.com",
        },
        targetPerson: { firstName: "Jane", lastName: "Doe" },
      });
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      await notifySuggestionCreated("suggestion-1", mockDb);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should send notification to eligible admins", async () => {
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: "suggestion-1",
        submittedBy: {
          id: "user-1",
          name: "John Doe",
          email: "john@example.com",
        },
        targetPerson: { firstName: "Jane", lastName: "Doe" },
        type: "BIRTH",
        submittedById: "user-1",
        targetPersonId: "person-1",
      });
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "admin-1",
          email: "admin@example.com",
          emailNotificationPreferences: {
            suggestionsCreated: true,
          },
        },
      ]);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
      });

      await notifySuggestionCreated("suggestion-1", mockDb);

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it("should skip admin with disabled preferences", async () => {
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: "suggestion-1",
        submittedBy: {
          id: "user-1",
          name: "John Doe",
          email: "john@example.com",
        },
        targetPerson: { firstName: "Jane", lastName: "Doe" },
        type: "BIRTH",
      });
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "admin-1",
          email: "admin@example.com",
          emailNotificationPreferences: {
            suggestionsCreated: false,
          },
        },
      ]);

      await notifySuggestionCreated("suggestion-1", mockDb);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      const error = new Error("Database error");
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockRejectedValue(error);

      await notifySuggestionCreated("suggestion-1", mockDb);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should prefer submitter name over email when available", async () => {
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: "suggestion-1",
        submittedBy: {
          id: "user-1",
          name: "John Doe",
          email: "john@example.com",
        },
        targetPerson: { firstName: "Jane", lastName: "Doe" },
        type: "BIRTH",
        submittedById: "user-1",
        targetPersonId: "person-1",
      });
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "admin-1",
          email: "admin@example.com",
          emailNotificationPreferences: { suggestionsCreated: true },
        },
      ]);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValue({
        id: "admin-1",
      });

      await notifySuggestionCreated("suggestion-1", mockDb);

      const call = (mockCreateSuggestionCreatedEmail as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(call?.[0]).toBe("John Doe");
    });

    it("should use email when submitter name is null", async () => {
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: "suggestion-1",
        submittedBy: {
          id: "user-1",
          name: null,
          email: "john@example.com",
        },
        targetPerson: { firstName: "Jane", lastName: "Doe" },
        type: "BIRTH",
        submittedById: "user-1",
        targetPersonId: "person-1",
      });
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "admin-1",
          email: "admin@example.com",
          emailNotificationPreferences: { suggestionsCreated: true },
        },
      ]);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValue({
        id: "admin-1",
      });

      await notifySuggestionCreated("suggestion-1", mockDb);

      const call = (mockCreateSuggestionCreatedEmail as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(call?.[0]).toBe("john@example.com");
    });
  });

  describe("notifySuggestionUpdated", () => {
    it("should log error when suggestion not found", async () => {
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await notifySuggestionUpdated("suggestion-1", "APPROVED", mockDb);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should skip when submitter has disabled notifications", async () => {
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: "suggestion-1",
        submittedBy: {
          id: "user-1",
          name: "John",
          email: "john@example.com",
          emailNotificationPreferences: { suggestionsUpdated: false },
        },
        targetPerson: { firstName: "Jane", lastName: "Doe" },
        reviewNote: "Looks good",
        status: "APPROVED",
      });

      await notifySuggestionUpdated("suggestion-1", "APPROVED", mockDb);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it("should send notification to submitter with APPROVED status", async () => {
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: "suggestion-1",
        submittedBy: {
          id: "user-1",
          name: "John",
          email: "john@example.com",
          emailNotificationPreferences: { suggestionsUpdated: true },
        },
        targetPerson: { firstName: "Jane", lastName: "Doe" },
        reviewNote: "Looks good",
        submittedById: "user-1",
        targetPersonId: "person-1",
      });
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValue({
        id: "admin-1",
      });

      await notifySuggestionUpdated("suggestion-1", "APPROVED", mockDb);

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      const call = (mockCreateSuggestionUpdatedEmail as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(call?.[1]).toBe("APPROVED");
    });

    it("should send notification to submitter with REJECTED status", async () => {
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: "suggestion-1",
        submittedBy: {
          id: "user-1",
          name: "John",
          email: "john@example.com",
          emailNotificationPreferences: { suggestionsUpdated: true },
        },
        targetPerson: { firstName: "Jane", lastName: "Doe" },
        reviewNote: "Not approved",
        submittedById: "user-1",
        targetPersonId: "person-1",
      });
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValue({
        id: "admin-1",
      });

      await notifySuggestionUpdated("suggestion-1", "REJECTED", mockDb);

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      const call = (mockCreateSuggestionUpdatedEmail as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(call?.[1]).toBe("REJECTED");
    });

    it("should handle database errors gracefully", async () => {
      const error = new Error("Database error");
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockRejectedValue(error);

      await notifySuggestionUpdated("suggestion-1", "APPROVED", mockDb);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("notifyNewMemberJoined", () => {
    it("should log error when user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue(
        null
      );

      await notifyNewMemberJoined("user-1", mockDb);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should log warning when no members found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({
          id: "user-1",
          email: "newuser@example.com",
          person: { firstName: "New", lastName: "User" },
        })
        .mockResolvedValueOnce([]);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      await notifyNewMemberJoined("user-1", mockDb);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should send notification to eligible members", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
        email: "newuser@example.com",
        person: { firstName: "New", lastName: "User" },
      });
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "member-1",
          email: "member@example.com",
          emailNotificationPreferences: { newMemberJoined: true },
        },
      ]);
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValue({
        familyName: "Smith Family",
      });
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValue({
        id: "admin-1",
      });

      await notifyNewMemberJoined("user-1", mockDb);

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it("should skip member with disabled preferences", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
        email: "newuser@example.com",
        person: { firstName: "New", lastName: "User" },
      });
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "member-1",
          email: "member@example.com",
          emailNotificationPreferences: { newMemberJoined: false },
        },
      ]);

      await notifyNewMemberJoined("user-1", mockDb);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it("should use default family name when settings not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
        email: "newuser@example.com",
        person: { firstName: "New", lastName: "User" },
      });
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "member-1",
          email: "member@example.com",
          emailNotificationPreferences: { newMemberJoined: true },
        },
      ]);
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValue(null);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValue({
        id: "admin-1",
      });

      await notifyNewMemberJoined("user-1", mockDb);

      const call = (mockCreateNewMemberEmail as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[2]).toBe("Our Family");
    });

    it("should use custom family name when available", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "user-1",
        email: "newuser@example.com",
        person: { firstName: "New", lastName: "User" },
      });
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "member-1",
          email: "member@example.com",
          emailNotificationPreferences: { newMemberJoined: true },
        },
      ]);
      (
        mockDb.familySettings.findFirst as ReturnType<typeof mock>
      ).mockResolvedValue({
        familyName: "Smith Family",
      });
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValue({
        id: "admin-1",
      });

      await notifyNewMemberJoined("user-1", mockDb);

      const call = (mockCreateNewMemberEmail as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[2]).toBe("Smith Family");
    });

    it("should handle database errors gracefully", async () => {
      const error = new Error("Database error");
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockRejectedValue(
        error
      );

      await notifyNewMemberJoined("user-1", mockDb);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("sendBirthdayReminders", () => {
    it("should return silently when no birthdays today", async () => {
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("2000-01-15"),
        },
      ]);

      await sendBirthdayReminders(mockDb);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it("should log warning when no system user found", async () => {
      const today = new Date();
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date(
            today.getFullYear() - 50,
            today.getMonth(),
            today.getDate()
          ),
          isLiving: true,
        },
      ]);
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "user-1",
          email: "user@example.com",
          emailNotificationPreferences: { birthdayReminders: true },
          isActive: true,
        },
      ]);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValue(
        null
      );

      await sendBirthdayReminders(mockDb);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("should send birthday reminders for today's birthdays", async () => {
      const today = new Date();
      const birthdayPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date(
          today.getFullYear() - 50,
          today.getMonth(),
          today.getDate()
        ),
        isLiving: true,
      };

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValue([
        birthdayPerson,
      ]);
      (mockDb.user.findMany as ReturnType<typeof mock>)
        .mockResolvedValueOnce([
          {
            id: "user-1",
            email: "user@example.com",
            isActive: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "user-1",
            email: "user@example.com",
            emailNotificationPreferences: { birthdayReminders: true },
            isActive: true,
          },
        ]);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValue({
        id: "admin-1",
      });

      await sendBirthdayReminders(mockDb);

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it("should skip user with disabled preferences", async () => {
      const today = new Date();
      const birthdayPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: new Date(
          today.getFullYear() - 50,
          today.getMonth(),
          today.getDate()
        ),
        isLiving: true,
      };

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValue([
        birthdayPerson,
      ]);
      (mockDb.user.findMany as ReturnType<typeof mock>)
        .mockResolvedValueOnce([
          {
            id: "user-1",
            email: "user@example.com",
            isActive: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "user-1",
            email: "user@example.com",
            emailNotificationPreferences: { birthdayReminders: false },
            isActive: true,
          },
        ]);

      await sendBirthdayReminders(mockDb);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it("should send reminders for multiple birthdays", async () => {
      const today = new Date();
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date(
            today.getFullYear() - 50,
            today.getMonth(),
            today.getDate()
          ),
          isLiving: true,
        },
        {
          id: "person-2",
          firstName: "Jane",
          lastName: "Smith",
          dateOfBirth: new Date(
            today.getFullYear() - 40,
            today.getMonth(),
            today.getDate()
          ),
          isLiving: true,
        },
      ]);
      (mockDb.user.findMany as ReturnType<typeof mock>)
        .mockResolvedValueOnce([
          {
            id: "user-1",
            email: "user@example.com",
            isActive: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "user-1",
            email: "user@example.com",
            emailNotificationPreferences: { birthdayReminders: true },
            isActive: true,
          },
        ]);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValue({
        id: "admin-1",
      });

      await sendBirthdayReminders(mockDb);

      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(2);
    });

    it("should handle database errors gracefully", async () => {
      const error = new Error("Database error");
      (mockDb.person.findMany as ReturnType<typeof mock>).mockRejectedValue(
        error
      );

      await sendBirthdayReminders(mockDb);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should only include living people", async () => {
      const today = new Date();
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date(
            today.getFullYear() - 50,
            today.getMonth(),
            today.getDate()
          ),
          isLiving: false,
        },
      ]);

      await sendBirthdayReminders(mockDb);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });
  });
});
