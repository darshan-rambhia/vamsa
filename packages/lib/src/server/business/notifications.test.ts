/**
 * Unit tests for Notifications Server Business Logic
 *
 * Tests cover:
 * - getEmailNotificationPreferences: Retrieve user's notification preferences
 * - updateEmailNotificationPreferences: Update user's notification settings
 * - notifySuggestionCreated: Send notification to admins when suggestion is created
 * - notifySuggestionUpdated: Send notification to submitter when suggestion is reviewed
 * - notifyNewMemberJoined: Send notification to members when new user joins
 * - sendBirthdayReminders: Send birthday reminder emails for today's birthdays
 *
 * Uses module mocking to inject mocked Drizzle ORM instance and logger
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { mockLogger, clearAllMocks } from "../../testing/shared-mocks";

// Mock logger module
mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: (error: unknown) => {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }
    return error;
  },
}));

// Mock Drizzle database and schema
const mockDrizzleSchema = {
  users: {
    id: {} as any,
    emailNotificationPreferences: {} as any,
    isActive: {} as any,
    role: {} as any,
  },
  suggestions: {
    id: {} as any,
  },
  persons: {
    id: {} as any,
    isLiving: {} as any,
    dateOfBirth: {} as any,
  },
};

const createMockDb = () => {
  let findFirstResult: unknown = null;
  let findManyResults: unknown[] = [];

  return {
    query: {
      users: {
        findFirst: mock(async () => findFirstResult),
        findMany: mock(async () => findManyResults),
      },
      suggestions: {
        findFirst: mock(async () => findFirstResult),
      },
      persons: {
        findMany: mock(async () => findManyResults),
      },
    },
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    })),
    setFindFirstResult: (result: unknown) => {
      findFirstResult = result;
    },
    setFindManyResults: (results: unknown[]) => {
      findManyResults = results;
    },
  };
};

const mockDrizzleDb = createMockDb();

mock.module("@vamsa/api", () => ({
  drizzleDb: mockDrizzleDb,
  drizzleSchema: mockDrizzleSchema,
}));

// Import after mocks are set up
import {
  getEmailNotificationPreferences,
  updateEmailNotificationPreferences,
  notifySuggestionCreated,
  notifySuggestionUpdated,
  notifyNewMemberJoined,
  sendBirthdayReminders,
} from "./notifications";

describe("notifications business logic", () => {
  beforeEach(() => {
    clearAllMocks();
    mockDrizzleDb.setFindFirstResult(null);
    mockDrizzleDb.setFindManyResults([]);
  });

  describe("getEmailNotificationPreferences", () => {
    it("should return default preferences when user has no saved preferences", async () => {
      const user = { id: "user-1", emailNotificationPreferences: null };
      mockDrizzleDb.setFindFirstResult(user);

      const result = await getEmailNotificationPreferences("user-1");

      expect(result).toEqual({
        suggestionsCreated: true,
        suggestionsUpdated: true,
        newMemberJoined: true,
        birthdayReminders: true,
      });
    });

    it("should return saved preferences when user has customized settings", async () => {
      const preferences = {
        suggestionsCreated: false,
        suggestionsUpdated: true,
        newMemberJoined: false,
        birthdayReminders: true,
      };
      const user = { id: "user-1", emailNotificationPreferences: preferences };
      mockDrizzleDb.setFindFirstResult(user);

      const result = await getEmailNotificationPreferences("user-1");

      expect(result).toEqual(preferences);
    });

    it("should return empty object as default preferences when null", async () => {
      const user = { id: "user-1", emailNotificationPreferences: {} };
      mockDrizzleDb.setFindFirstResult(user);

      const result = await getEmailNotificationPreferences("user-1");

      expect(result).toBeDefined();
    });

    it("should throw error when user not found", async () => {
      mockDrizzleDb.setFindFirstResult(null);

      await expect(
        getEmailNotificationPreferences("nonexistent-user")
      ).rejects.toThrow("User not found");
    });
  });

  describe("updateEmailNotificationPreferences", () => {
    it("should update preferences with partial data", async () => {
      const user = {
        id: "user-1",
        emailNotificationPreferences: {
          suggestionsCreated: true,
          suggestionsUpdated: true,
          newMemberJoined: true,
          birthdayReminders: true,
        },
      };
      mockDrizzleDb.setFindFirstResult(user);

      const result = await updateEmailNotificationPreferences("user-1", {
        suggestionsCreated: false,
        birthdayReminders: false,
      });

      expect(result).toEqual({
        suggestionsCreated: false,
        suggestionsUpdated: true,
        newMemberJoined: true,
        birthdayReminders: false,
      });
    });

    it("should merge updates with existing preferences", async () => {
      const user = {
        id: "user-1",
        emailNotificationPreferences: {
          suggestionsCreated: false,
          suggestionsUpdated: false,
          newMemberJoined: true,
          birthdayReminders: true,
        },
      };
      mockDrizzleDb.setFindFirstResult(user);

      const result = await updateEmailNotificationPreferences("user-1", {
        suggestionsCreated: true,
      });

      expect(result).toEqual({
        suggestionsCreated: true,
        suggestionsUpdated: false,
        newMemberJoined: true,
        birthdayReminders: true,
      });
    });

    it("should use default preferences if user has none", async () => {
      const user = { id: "user-1", emailNotificationPreferences: null };
      mockDrizzleDb.setFindFirstResult(user);

      const result = await updateEmailNotificationPreferences("user-1", {
        suggestionsCreated: false,
      });

      expect(result).toEqual({
        suggestionsCreated: false,
        suggestionsUpdated: true,
        newMemberJoined: true,
        birthdayReminders: true,
      });
    });

    it("should throw error when user not found", async () => {
      mockDrizzleDb.setFindFirstResult(null);

      await expect(
        updateEmailNotificationPreferences("nonexistent-user", {
          suggestionsCreated: false,
        })
      ).rejects.toThrow("User not found");
    });

    it("should update all preferences when all provided", async () => {
      const user = {
        id: "user-1",
        emailNotificationPreferences: {
          suggestionsCreated: true,
          suggestionsUpdated: true,
          newMemberJoined: true,
          birthdayReminders: true,
        },
      };
      mockDrizzleDb.setFindFirstResult(user);

      const result = await updateEmailNotificationPreferences("user-1", {
        suggestionsCreated: false,
        suggestionsUpdated: false,
        newMemberJoined: false,
        birthdayReminders: false,
      });

      expect(result).toEqual({
        suggestionsCreated: false,
        suggestionsUpdated: false,
        newMemberJoined: false,
        birthdayReminders: false,
      });
    });
  });

  describe("notifySuggestionCreated", () => {
    it("should log when suggestion is found and admins exist", async () => {
      const suggestion = { id: "suggestion-1", content: "Test suggestion" };
      const admins = [
        { id: "admin-1", email: "admin1@test.com" },
        { id: "admin-2", email: "admin2@test.com" },
      ];

      let callCount = 0;
      mockDrizzleDb.query.suggestions.findFirst = mock(async () => {
        callCount++;
        return suggestion;
      }) as any;

      mockDrizzleDb.query.users.findMany = mock(async () => {
        callCount++;
        return admins;
      }) as any;

      await notifySuggestionCreated("suggestion-1");

      expect(mockLogger.info).toHaveBeenCalledWith(
        { suggestionId: "suggestion-1" },
        "Suggestion created notification queued"
      );
      expect(callCount).toBe(2);
    });

    it("should log error when suggestion not found", async () => {
      mockDrizzleDb.query.suggestions.findFirst = mock(async () => null) as any;

      await notifySuggestionCreated("nonexistent-suggestion");

      expect(mockLogger.error).toHaveBeenCalledWith(
        { suggestionId: "nonexistent-suggestion" },
        "Suggestion not found for notification"
      );
    });

    it("should log warning when no admins found", async () => {
      const suggestion = { id: "suggestion-1", content: "Test suggestion" };

      mockDrizzleDb.query.suggestions.findFirst = mock(
        async () => suggestion
      ) as any;
      mockDrizzleDb.query.users.findMany = mock(async () => []) as any;

      await notifySuggestionCreated("suggestion-1");

      expect(mockLogger.warn).toHaveBeenCalledWith("No admins found to notify");
    });

    it("should not throw on database error", async () => {
      mockDrizzleDb.query.suggestions.findFirst = mock(async () =>
        Promise.reject(new Error("DB Error"))
      ) as any;

      // Should not throw
      await notifySuggestionCreated("suggestion-1");

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("notifySuggestionUpdated", () => {
    it("should log when suggestion is found with APPROVED status", async () => {
      const suggestion = { id: "suggestion-1", content: "Test suggestion" };

      mockDrizzleDb.query.suggestions.findFirst = mock(
        async () => suggestion
      ) as any;

      await notifySuggestionUpdated("suggestion-1", "APPROVED");

      expect(mockLogger.info).toHaveBeenCalledWith(
        { suggestionId: "suggestion-1", status: "APPROVED" },
        "Suggestion updated notification queued"
      );
    });

    it("should log when suggestion is found with REJECTED status", async () => {
      const suggestion = { id: "suggestion-1", content: "Test suggestion" };

      mockDrizzleDb.query.suggestions.findFirst = mock(
        async () => suggestion
      ) as any;

      await notifySuggestionUpdated("suggestion-1", "REJECTED");

      expect(mockLogger.info).toHaveBeenCalledWith(
        { suggestionId: "suggestion-1", status: "REJECTED" },
        "Suggestion updated notification queued"
      );
    });

    it("should log error when suggestion not found", async () => {
      mockDrizzleDb.query.suggestions.findFirst = mock(async () => null) as any;

      await notifySuggestionUpdated("nonexistent-suggestion", "APPROVED");

      expect(mockLogger.error).toHaveBeenCalledWith(
        { suggestionId: "nonexistent-suggestion" },
        "Suggestion not found for update notification"
      );
    });

    it("should not throw on database error", async () => {
      mockDrizzleDb.query.suggestions.findFirst = mock(async () =>
        Promise.reject(new Error("DB Error"))
      ) as any;

      // Should not throw
      await notifySuggestionUpdated("suggestion-1", "APPROVED");

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("notifyNewMemberJoined", () => {
    it("should log when new member is found and members exist", async () => {
      const newMember = { id: "user-1", email: "user1@test.com" };
      const members = [
        { id: "user-1", email: "user1@test.com" },
        { id: "user-2", email: "user2@test.com" },
      ];

      let callCount = 0;
      mockDrizzleDb.query.users.findFirst = mock(async () => {
        callCount++;
        return newMember;
      }) as any;

      mockDrizzleDb.query.users.findMany = mock(async () => {
        callCount++;
        return members;
      }) as any;

      await notifyNewMemberJoined("user-1");

      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: "user-1" },
        "New member notification queued"
      );
      expect(callCount).toBe(2);
    });

    it("should log error when new member not found", async () => {
      mockDrizzleDb.query.users.findFirst = mock(async () => null) as any;

      await notifyNewMemberJoined("nonexistent-user");

      expect(mockLogger.error).toHaveBeenCalledWith(
        { userId: "nonexistent-user" },
        "User not found for new member notification"
      );
    });

    it("should log warning when no members found to notify", async () => {
      const newMember = { id: "user-1", email: "user1@test.com" };

      mockDrizzleDb.query.users.findFirst = mock(async () => newMember) as any;
      mockDrizzleDb.query.users.findMany = mock(async () => []) as any;

      await notifyNewMemberJoined("user-1");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "No members found to notify"
      );
    });

    it("should not throw on database error", async () => {
      mockDrizzleDb.query.users.findFirst = mock(async () =>
        Promise.reject(new Error("DB Error"))
      ) as any;

      // Should not throw
      await notifyNewMemberJoined("user-1");

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("sendBirthdayReminders", () => {
    it("should silently return when no birthdays today", async () => {
      mockDrizzleDb.query.persons.findMany = mock(async () => []) as any;

      await sendBirthdayReminders();

      // Should not log anything when no birthdays
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should find people with birthdays today", async () => {
      const today = new Date();
      const month = today.getMonth();
      const day = today.getDate();

      const peopleWithBirthday = [
        {
          id: "person-1",
          isLiving: true,
          dateOfBirth: new Date(1990, month, day),
        },
        {
          id: "person-2",
          isLiving: true,
          dateOfBirth: new Date(1985, month, day),
        },
      ];

      const adminUser = {
        id: "admin-1",
        role: "ADMIN",
        email: "admin@test.com",
      };

      let findManyCallCount = 0;
      mockDrizzleDb.query.persons.findMany = mock(async () => {
        findManyCallCount++;
        return peopleWithBirthday;
      }) as any;

      mockDrizzleDb.query.users.findFirst = mock(async () => {
        return adminUser;
      }) as any;

      await sendBirthdayReminders();

      expect(mockLogger.info).toHaveBeenCalledWith(
        { count: 2 },
        "Birthday reminders queued"
      );
      expect(findManyCallCount).toBe(1);
    });

    it("should exclude people without birthdays today", async () => {
      const today = new Date();
      const differentMonth = today.getMonth() === 0 ? 1 : 0;

      const personsData = [
        {
          id: "person-1",
          isLiving: true,
          dateOfBirth: new Date(1990, differentMonth, 15),
        },
        {
          id: "person-2",
          isLiving: true,
          dateOfBirth: new Date(1985, differentMonth, 20),
        },
      ];

      mockDrizzleDb.query.persons.findMany = mock(
        async () => personsData
      ) as any;

      await sendBirthdayReminders();

      // No logger calls for no birthdays
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should log warning when no admin user found", async () => {
      const today = new Date();
      const month = today.getMonth();
      const day = today.getDate();

      const peopleWithBirthday = [
        {
          id: "person-1",
          isLiving: true,
          dateOfBirth: new Date(1990, month, day),
        },
      ];

      mockDrizzleDb.query.persons.findMany = mock(
        async () => peopleWithBirthday
      ) as any;
      mockDrizzleDb.query.users.findFirst = mock(async () => null) as any;

      await sendBirthdayReminders();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "No system user found for birthday reminders"
      );
    });

    it("should handle null dateOfBirth gracefully", async () => {
      const personsWithNullBirthday = [
        {
          id: "person-1",
          isLiving: true,
          dateOfBirth: null,
        },
        {
          id: "person-2",
          isLiving: true,
          dateOfBirth: null,
        },
      ];

      mockDrizzleDb.query.persons.findMany = mock(
        async () => personsWithNullBirthday
      ) as any;

      await sendBirthdayReminders();

      // Should not log anything when no valid birthdays
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should not throw on database error", async () => {
      mockDrizzleDb.query.persons.findMany = mock(async () =>
        Promise.reject(new Error("DB Error"))
      ) as any;

      // Should not throw
      await sendBirthdayReminders();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
