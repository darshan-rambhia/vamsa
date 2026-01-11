import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import {
  emailService,
  createSuggestionCreatedEmail,
  createSuggestionUpdatedEmail,
  createNewMemberEmail,
  createBirthdayReminderEmail,
} from "@vamsa/api";

const TOKEN_COOKIE_NAME = "vamsa-session";

/**
 * Internal helper to get current user from session
 */
async function requireAuth() {
  const { getCookie } = await import("@tanstack/react-start/server");

  const token = getCookie(TOKEN_COOKIE_NAME);
  if (!token) {
    throw new Error("Not authenticated");
  }

  const session = await prisma.session.findFirst({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new Error("Session expired");
  }

  return session.user;
}

/**
 * Get user's email notification preferences
 */
export const getEmailNotificationPreferences = createServerFn({
  method: "GET",
}).handler(async () => {
  const user = await requireAuth();

  const preferences = user.emailNotificationPreferences as Record<string, boolean> || {
    suggestionsCreated: true,
    suggestionsUpdated: true,
    newMemberJoined: true,
    birthdayReminders: true,
  };

  return preferences;
});

/**
 * Update user's email notification preferences
 */
export const updateEmailNotificationPreferences = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: {
      suggestionsCreated?: boolean;
      suggestionsUpdated?: boolean;
      newMemberJoined?: boolean;
      birthdayReminders?: boolean;
    }) => data
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const currentPrefs = user.emailNotificationPreferences as Record<string, boolean> || {
      suggestionsCreated: true,
      suggestionsUpdated: true,
      newMemberJoined: true,
      birthdayReminders: true,
    };

    const updatedPrefs = {
      ...currentPrefs,
      ...data,
    };

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailNotificationPreferences: updatedPrefs,
      },
    });

    return { success: true, preferences: updatedPrefs };
  });

/**
 * Send suggestion created notification to admins
 * This is called internally after a suggestion is created
 */
export async function notifySuggestionCreated(suggestionId: string) {
  try {
    const suggestion = await prisma.suggestion.findUnique({
      where: { id: suggestionId },
      include: {
        submittedBy: true,
        targetPerson: true,
      },
    });

    if (!suggestion) {
      console.error("[Notifications] Suggestion not found:", suggestionId);
      return;
    }

    // Get all admin users
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
    });

    if (admins.length === 0) {
      console.warn("[Notifications] No admins found to notify");
      return;
    }

    // Send notification to each admin
    for (const admin of admins) {
      const preferences = emailService.parseNotificationPreferences(
        admin.emailNotificationPreferences
      );

      if (!emailService.shouldSendNotification(preferences, "suggestionsCreated")) {
        continue;
      }

      const template = createSuggestionCreatedEmail(
        suggestion.submittedBy.name || suggestion.submittedBy.email,
        suggestion.targetPerson?.firstName && suggestion.targetPerson?.lastName
          ? `${suggestion.targetPerson.firstName} ${suggestion.targetPerson.lastName}`
          : "New Person",
        suggestion.type,
        `${process.env.APP_URL || "https://vamsa.family"}/admin/suggestions`
      );

      const systemUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });

      if (systemUser) {
        await emailService.sendEmail(
          admin.email,
          template,
          "suggestion_created",
          systemUser.id,
          {
            suggestionId,
            submittedById: suggestion.submittedById,
            targetPersonId: suggestion.targetPersonId,
          }
        );
      }
    }
  } catch (error) {
    console.error("[Notifications] Error notifying suggestion created:", error);
  }
}

/**
 * Send suggestion review notification to submitter
 * This is called internally after a suggestion is reviewed
 */
export async function notifySuggestionUpdated(
  suggestionId: string,
  status: "APPROVED" | "REJECTED"
) {
  try {
    const suggestion = await prisma.suggestion.findUnique({
      where: { id: suggestionId },
      include: {
        submittedBy: true,
        targetPerson: true,
      },
    });

    if (!suggestion) {
      console.error("[Notifications] Suggestion not found:", suggestionId);
      return;
    }

    const submitter = suggestion.submittedBy;
    const preferences = emailService.parseNotificationPreferences(
      submitter.emailNotificationPreferences
    );

    if (!emailService.shouldSendNotification(preferences, "suggestionsUpdated")) {
      return;
    }

    const template = createSuggestionUpdatedEmail(
      submitter.name || submitter.email,
      status,
      suggestion.reviewNote,
      suggestion.targetPerson?.firstName && suggestion.targetPerson?.lastName
        ? `${suggestion.targetPerson.firstName} ${suggestion.targetPerson.lastName}`
        : "New Person",
      `${process.env.APP_URL || "https://vamsa.family"}/suggestions`
    );

    const systemUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (systemUser) {
      await emailService.sendEmail(
        submitter.email,
        template,
        "suggestion_updated",
        systemUser.id,
        {
          suggestionId,
          status,
        }
      );
    }
  } catch (error) {
    console.error("[Notifications] Error notifying suggestion updated:", error);
  }
}

/**
 * Send new member joined notification to all active members
 * This is called internally after a new user joins
 */
export async function notifyNewMemberJoined(userId: string) {
  try {
    const newMember = await prisma.user.findUnique({
      where: { id: userId },
      include: { person: true },
    });

    if (!newMember) {
      console.error("[Notifications] User not found:", userId);
      return;
    }

    // Get all active members except the new member
    const members = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: userId },
        role: { in: ["ADMIN", "MEMBER"] },
      },
    });

    if (members.length === 0) {
      console.warn("[Notifications] No members found to notify");
      return;
    }

    const memberName = newMember.person
      ? `${newMember.person.firstName} ${newMember.person.lastName}`
      : newMember.name || newMember.email;

    // Get family settings for family name
    const familySettings = await prisma.familySettings.findFirst();
    const familyName = familySettings?.familyName || "Our Family";

    // Send notification to each member
    for (const member of members) {
      const preferences = emailService.parseNotificationPreferences(
        member.emailNotificationPreferences
      );

      if (!emailService.shouldSendNotification(preferences, "newMemberJoined")) {
        continue;
      }

      const template = createNewMemberEmail(
        memberName,
        newMember.email,
        familyName,
        `${process.env.APP_URL || "https://vamsa.family"}/tree`
      );

      const systemUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });

      if (systemUser) {
        await emailService.sendEmail(
          member.email,
          template,
          "new_member",
          systemUser.id,
          {
            newMemberId: userId,
            newMemberEmail: newMember.email,
          }
        );
      }
    }
  } catch (error) {
    console.error("[Notifications] Error notifying new member joined:", error);
  }
}

/**
 * Send birthday reminder emails for people with birthdays today
 * This should be called daily via a cron job
 */
export async function sendBirthdayReminders() {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Get all people with birthdays today
    // Note: This is a simplified query. You might need to adjust based on your date format
    const birthdays = await prisma.person.findMany({
      where: {
        dateOfBirth: {
          not: null,
        },
        isLiving: true,
      },
    });

    // Filter in application for birthdays today (to handle different year stored)
    const peopleWithBirthdayToday = birthdays.filter((person) => {
      if (!person.dateOfBirth) return false;
      const birthMonth = person.dateOfBirth.getMonth() + 1;
      const birthDay = person.dateOfBirth.getDate();
      return birthMonth === month && birthDay === day;
    });

    if (peopleWithBirthdayToday.length === 0) {
      // No birthdays today - silent success
      return;
    }

    // Get all active users to send reminders to
    const users = await prisma.user.findMany({
      where: { isActive: true },
    });

    const systemUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!systemUser) {
      console.warn("[Notifications] No system user found for birthday reminders");
      return;
    }

    // Send birthday reminder to each user for each person with birthday
    for (const person of peopleWithBirthdayToday) {
      for (const user of users) {
        const preferences = emailService.parseNotificationPreferences(
          user.emailNotificationPreferences
        );

        if (!emailService.shouldSendNotification(preferences, "birthdayReminders")) {
          continue;
        }

        const personName = `${person.firstName} ${person.lastName}`;

        const template = createBirthdayReminderEmail(
          user.name || user.email,
          personName,
          person.dateOfBirth!,
          `${process.env.APP_URL || "https://vamsa.family"}/person/${person.id}`
        );

        await emailService.sendEmail(
          user.email,
          template,
          "birthday_reminder",
          systemUser.id,
          {
            personId: person.id,
            personName,
          }
        );
      }
    }
  } catch (error) {
    console.error("[Notifications] Error sending birthday reminders:", error);
  }
}
