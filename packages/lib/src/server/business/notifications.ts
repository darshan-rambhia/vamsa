/**
 * Notifications Server Module - Business Logic for Email Notifications
 *
 * This module contains the business logic orchestration layer for all notification
 * operations. Each function:
 * - Performs database queries and data aggregation
 * - Handles notification preference checks
 * - Constructs email templates
 * - Manages email delivery through the email service
 * - Records audit logs for notification sends
 * - Includes comprehensive error handling and logging
 *
 * Exported Functions:
 * - getEmailNotificationPreferences: Retrieves current user's notification preferences
 * - updateEmailNotificationPreferences: Updates user's email notification settings
 * - notifySuggestionCreated: Sends notification to admins when suggestion is created
 * - notifySuggestionUpdated: Sends notification to submitter when suggestion is reviewed
 * - notifyNewMemberJoined: Sends notification to members when new user joins
 * - sendBirthdayReminders: Sends birthday reminder emails for today's birthdays
 */

import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";
import {
  emailService,
  createSuggestionCreatedEmail,
  createSuggestionUpdatedEmail,
  createNewMemberEmail,
  createBirthdayReminderEmail,
} from "@vamsa/api";
import { logger, serializeError } from "@vamsa/lib/logger";

/**
 * Type for the database client used by notification functions.
 * This allows dependency injection for testing.
 */
export type NotificationsDb = Pick<
  PrismaClient,
  "user" | "suggestion" | "person" | "familySettings"
>;

/**
 * Get user's email notification preferences
 *
 * Retrieves the email notification preferences for the currently authenticated user.
 * Defaults to all notifications enabled if not yet configured.
 *
 * @param userId - ID of the user to retrieve preferences for
 * @param db - Optional database client (defaults to prisma)
 * @returns Object with notification preference flags (suggestionsCreated, suggestionsUpdated, newMemberJoined, birthdayReminders)
 * @throws Error if user not found or database query fails
 */
export async function getEmailNotificationPreferences(
  userId: string,
  db: NotificationsDb = defaultPrisma
) {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const preferences = (user.emailNotificationPreferences as Record<
    string,
    boolean
  >) || {
    suggestionsCreated: true,
    suggestionsUpdated: true,
    newMemberJoined: true,
    birthdayReminders: true,
  };

  return preferences;
}

/**
 * Update user's email notification preferences
 *
 * Updates the email notification preferences for a user, merging provided
 * preferences with existing ones. Only provided fields are updated, others remain unchanged.
 *
 * @param userId - ID of the user updating preferences
 * @param preferences - Partial preferences object with notification flags to update
 * @param db - Optional database client (defaults to prisma)
 * @returns Updated preferences object
 * @throws Error if user not found or database update fails
 */
export async function updateEmailNotificationPreferences(
  userId: string,
  preferences: {
    suggestionsCreated?: boolean;
    suggestionsUpdated?: boolean;
    newMemberJoined?: boolean;
    birthdayReminders?: boolean;
  },
  db: NotificationsDb = defaultPrisma
) {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const currentPrefs = (user.emailNotificationPreferences as Record<
    string,
    boolean
  >) || {
    suggestionsCreated: true,
    suggestionsUpdated: true,
    newMemberJoined: true,
    birthdayReminders: true,
  };

  const updatedPrefs = {
    ...currentPrefs,
    ...preferences,
  };

  await db.user.update({
    where: { id: userId },
    data: {
      emailNotificationPreferences: updatedPrefs,
    },
  });

  return updatedPrefs;
}

/**
 * Send suggestion created notification to admins
 *
 * Called internally after a suggestion is created. Retrieves the suggestion details,
 * queries for active admins, checks their preferences, constructs email template,
 * and sends notification to each eligible admin.
 *
 * @param suggestionId - ID of the suggestion that was created
 * @param db - Optional database client (defaults to prisma)
 * @returns Void. Errors are logged but don't throw to prevent blocking suggestion creation
 */
export async function notifySuggestionCreated(
  suggestionId: string,
  db: NotificationsDb = defaultPrisma
) {
  try {
    const suggestion = await db.suggestion.findUnique({
      where: { id: suggestionId },
      include: {
        submittedBy: true,
        targetPerson: true,
      },
    });

    if (!suggestion) {
      logger.error({ suggestionId }, "Suggestion not found for notification");
      return;
    }

    // Get all admin users
    const admins = await db.user.findMany({
      where: { role: "ADMIN", isActive: true },
    });

    if (admins.length === 0) {
      logger.warn("No admins found to notify");
      return;
    }

    // Send notification to each admin
    for (const admin of admins) {
      const preferences = emailService.parseNotificationPreferences(
        admin.emailNotificationPreferences
      );

      if (
        !emailService.shouldSendNotification(preferences, "suggestionsCreated")
      ) {
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

      const systemUser = await db.user.findFirst({
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
    logger.error(
      { error: serializeError(error) },
      "Error notifying suggestion created"
    );
  }
}

/**
 * Send suggestion review notification to submitter
 *
 * Called internally after a suggestion is reviewed (approved or rejected).
 * Retrieves the suggestion, checks submitter's notification preferences,
 * constructs email with review result, and sends to submitter.
 *
 * @param suggestionId - ID of the suggestion that was reviewed
 * @param status - Review status: "APPROVED" or "REJECTED"
 * @param db - Optional database client (defaults to prisma)
 * @returns Void. Errors are logged but don't throw to prevent blocking suggestion processing
 */
export async function notifySuggestionUpdated(
  suggestionId: string,
  status: "APPROVED" | "REJECTED",
  db: NotificationsDb = defaultPrisma
) {
  try {
    const suggestion = await db.suggestion.findUnique({
      where: { id: suggestionId },
      include: {
        submittedBy: true,
        targetPerson: true,
      },
    });

    if (!suggestion) {
      logger.error(
        { suggestionId },
        "Suggestion not found for update notification"
      );
      return;
    }

    const submitter = suggestion.submittedBy;
    const preferences = emailService.parseNotificationPreferences(
      submitter.emailNotificationPreferences
    );

    if (
      !emailService.shouldSendNotification(preferences, "suggestionsUpdated")
    ) {
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

    const systemUser = await db.user.findFirst({
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
    logger.error(
      { error: serializeError(error) },
      "Error notifying suggestion updated"
    );
  }
}

/**
 * Send new member joined notification to all active members
 *
 * Called internally after a new user joins. Retrieves the new member details,
 * queries for all active members (except the new member), checks their preferences,
 * constructs personalized email template with family name, and sends notification.
 *
 * @param userId - ID of the new user that joined
 * @param db - Optional database client (defaults to prisma)
 * @returns Void. Errors are logged but don't throw to prevent blocking user creation
 */
export async function notifyNewMemberJoined(
  userId: string,
  db: NotificationsDb = defaultPrisma
) {
  try {
    const newMember = await db.user.findUnique({
      where: { id: userId },
      include: { person: true },
    });

    if (!newMember) {
      logger.error({ userId }, "User not found for new member notification");
      return;
    }

    // Get all active members except the new member
    const members = await db.user.findMany({
      where: {
        isActive: true,
        id: { not: userId },
        role: { in: ["ADMIN", "MEMBER"] },
      },
    });

    if (members.length === 0) {
      logger.warn("No members found to notify");
      return;
    }

    const memberName = newMember.person
      ? `${newMember.person.firstName} ${newMember.person.lastName}`
      : newMember.name || newMember.email;

    // Get family settings for family name
    const familySettings = await db.familySettings.findFirst();
    const familyName = familySettings?.familyName || "Our Family";

    // Send notification to each member
    for (const member of members) {
      const preferences = emailService.parseNotificationPreferences(
        member.emailNotificationPreferences
      );

      if (
        !emailService.shouldSendNotification(preferences, "newMemberJoined")
      ) {
        continue;
      }

      const template = createNewMemberEmail(
        memberName,
        newMember.email,
        familyName,
        `${process.env.APP_URL || "https://vamsa.family"}/tree`
      );

      const systemUser = await db.user.findFirst({
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
    logger.error(
      { error: serializeError(error) },
      "Error notifying new member joined"
    );
  }
}

/**
 * Send birthday reminder emails for people with birthdays today
 *
 * Queries for all living people with birth dates, filters for today's birthday matches,
 * then sends a reminder email to all active users (respecting their notification preferences).
 * Typically called daily via cron job.
 *
 * @param db - Optional database client (defaults to prisma). First positional parameter.
 * @returns Void. Silently succeeds if no birthdays today or errors are logged without throwing
 */
export async function sendBirthdayReminders(
  db: NotificationsDb = defaultPrisma
) {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Get all people with birthdays
    // Note: This retrieves all living people and filters in-app to handle different year formats
    const birthdays = await db.person.findMany({
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
    const users = await db.user.findMany({
      where: { isActive: true },
    });

    const systemUser = await db.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!systemUser) {
      logger.warn("No system user found for birthday reminders");
      return;
    }

    // Send birthday reminder to each user for each person with birthday
    for (const person of peopleWithBirthdayToday) {
      for (const user of users) {
        const preferences = emailService.parseNotificationPreferences(
          user.emailNotificationPreferences
        );

        if (
          !emailService.shouldSendNotification(preferences, "birthdayReminders")
        ) {
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
    logger.error(
      { error: serializeError(error) },
      "Error sending birthday reminders"
    );
  }
}
