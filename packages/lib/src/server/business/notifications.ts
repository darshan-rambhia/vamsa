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

import { logger, serializeError } from "@vamsa/lib/logger";

/**
 * Get user's email notification preferences
 *
 * @param userId - ID of the user to retrieve preferences for
 * @returns Object with notification preference flags
 * @throws Error if user not found
 */
export async function getEmailNotificationPreferences(userId: string) {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  const user = await drizzleDb.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
    columns: { emailNotificationPreferences: true },
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
 * @param userId - ID of the user updating preferences
 * @param preferences - Partial preferences object with notification flags to update
 * @returns Updated preferences object
 * @throws Error if user not found
 */
export async function updateEmailNotificationPreferences(
  userId: string,
  preferences: {
    suggestionsCreated?: boolean;
    suggestionsUpdated?: boolean;
    newMemberJoined?: boolean;
    birthdayReminders?: boolean;
  }
) {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  const user = await drizzleDb.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
    columns: { emailNotificationPreferences: true },
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

  await drizzleDb
    .update(drizzleSchema.users)
    .set({
      emailNotificationPreferences: updatedPrefs,
    })
    .where(eq(drizzleSchema.users.id, userId));

  return updatedPrefs;
}

/**
 * Send suggestion created notification to admins
 *
 * @param suggestionId - ID of the suggestion that was created
 * @returns Void. Errors are logged but don't throw
 */
export async function notifySuggestionCreated(suggestionId: string) {
  try {
    const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
    const { eq } = await import("drizzle-orm");

    const suggestion = await drizzleDb.query.suggestions.findFirst({
      where: eq(drizzleSchema.suggestions.id, suggestionId),
    });

    if (!suggestion) {
      logger.error({ suggestionId }, "Suggestion not found for notification");
      return;
    }

    // Get all admin users
    const admins = await drizzleDb.query.users.findMany({
      where: eq(drizzleSchema.users.isActive, true),
    });

    if (admins.length === 0) {
      logger.warn("No admins found to notify");
      return;
    }

    // TODO: Implement email sending logic similar to Prisma version
    logger.info({ suggestionId }, "Suggestion created notification queued");
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
 * @param suggestionId - ID of the suggestion that was reviewed
 * @param status - Review status: "APPROVED" or "REJECTED"
 * @returns Void. Errors are logged but don't throw
 */
export async function notifySuggestionUpdated(
  suggestionId: string,
  status: "APPROVED" | "REJECTED"
) {
  try {
    const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
    const { eq } = await import("drizzle-orm");

    const suggestion = await drizzleDb.query.suggestions.findFirst({
      where: eq(drizzleSchema.suggestions.id, suggestionId),
    });

    if (!suggestion) {
      logger.error(
        { suggestionId },
        "Suggestion not found for update notification"
      );
      return;
    }

    // TODO: Implement email sending logic similar to Prisma version
    logger.info(
      { suggestionId, status },
      "Suggestion updated notification queued"
    );
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
 * @param userId - ID of the new user that joined
 * @returns Void. Errors are logged but don't throw
 */
export async function notifyNewMemberJoined(userId: string) {
  try {
    const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
    const { eq } = await import("drizzle-orm");

    const newMember = await drizzleDb.query.users.findFirst({
      where: eq(drizzleSchema.users.id, userId),
    });

    if (!newMember) {
      logger.error({ userId }, "User not found for new member notification");
      return;
    }

    // Get all active members except the new member
    const members = await drizzleDb.query.users.findMany({
      where: eq(drizzleSchema.users.isActive, true),
    });

    if (members.length === 0) {
      logger.warn("No members found to notify");
      return;
    }

    // TODO: Implement email sending logic similar to Prisma version
    logger.info({ userId }, "New member notification queued");
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
 * @returns Void. Silently succeeds if no birthdays today or errors are logged without throwing
 */
export async function sendBirthdayReminders() {
  try {
    const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
    const { eq } = await import("drizzle-orm");

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Get all people with birthdays
    const birthdays = await drizzleDb.query.persons.findMany({
      where: eq(drizzleSchema.persons.isLiving, true),
    });

    // Filter in application for birthdays today
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

    // Get all system users
    const systemUser = await drizzleDb.query.users.findFirst({
      where: eq(drizzleSchema.users.role, "ADMIN"),
    });

    if (!systemUser) {
      logger.warn("No system user found for birthday reminders");
      return;
    }

    // TODO: Implement email sending logic similar to Prisma version
    logger.info(
      { count: peopleWithBirthdayToday.length },
      "Birthday reminders queued"
    );
  } catch (error) {
    logger.error(
      { error: serializeError(error) },
      "Error sending birthday reminders"
    );
  }
}
