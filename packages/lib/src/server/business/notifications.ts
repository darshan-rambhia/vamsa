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
 *
 * All functions use Dependency Injection for the database connection to enable
 * clean unit testing without mock.module() hacks.
 */

import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.email;

/** Type for the database instance (for DI) */
export type NotificationsDb = typeof drizzleDb;

/**
 * Get user's email notification preferences
 *
 * @param userId - ID of the user to retrieve preferences for
 * @param db - Database instance (defaults to drizzleDb for production)
 * @returns Object with notification preference flags
 * @throws Error if user not found
 */
export async function getEmailNotificationPreferences(
  userId: string,
  db: NotificationsDb = drizzleDb
) {
  const user = await db.query.users.findFirst({
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
 * @param db - Database instance (defaults to drizzleDb for production)
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
  },
  db: NotificationsDb = drizzleDb
) {
  const user = await db.query.users.findFirst({
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

  await db
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
 * @param db - Database instance (defaults to drizzleDb for production)
 * @returns Void. Errors are logged but don't throw
 */
export async function notifySuggestionCreated(
  suggestionId: string,
  db: NotificationsDb = drizzleDb
) {
  try {
    const suggestion = await db.query.suggestions.findFirst({
      where: eq(drizzleSchema.suggestions.id, suggestionId),
    });

    if (!suggestion) {
      log.info({ suggestionId }, "Suggestion not found for notification");
      return;
    }

    // Get all admin users
    const admins = await db.query.users.findMany({
      where: eq(drizzleSchema.users.isActive, true),
    });

    if (admins.length === 0) {
      log.info({}, "No admins found to notify");
      return;
    }

    // TODO: Implement email sending logic
    log.info({ suggestionId }, "Suggestion created notification queued");
  } catch (error) {
    log.withErr(error).msg("Error notifying suggestion created");
  }
}

/**
 * Send suggestion review notification to submitter
 *
 * @param suggestionId - ID of the suggestion that was reviewed
 * @param status - Review status: "APPROVED" or "REJECTED"
 * @param db - Database instance (defaults to drizzleDb for production)
 * @returns Void. Errors are logged but don't throw
 */
export async function notifySuggestionUpdated(
  suggestionId: string,
  status: "APPROVED" | "REJECTED",
  db: NotificationsDb = drizzleDb
) {
  try {
    const suggestion = await db.query.suggestions.findFirst({
      where: eq(drizzleSchema.suggestions.id, suggestionId),
    });

    if (!suggestion) {
      log.info(
        { suggestionId },
        "Suggestion not found for update notification"
      );
      return;
    }

    // TODO: Implement email sending logic
    log.info(
      { suggestionId, status },
      "Suggestion updated notification queued"
    );
  } catch (error) {
    log.withErr(error).msg("Error notifying suggestion updated");
  }
}

/**
 * Send new member joined notification to all active members
 *
 * @param userId - ID of the new user that joined
 * @param db - Database instance (defaults to drizzleDb for production)
 * @returns Void. Errors are logged but don't throw
 */
export async function notifyNewMemberJoined(
  userId: string,
  db: NotificationsDb = drizzleDb
) {
  try {
    const newMember = await db.query.users.findFirst({
      where: eq(drizzleSchema.users.id, userId),
    });

    if (!newMember) {
      log.info({ userId }, "User not found for new member notification");
      return;
    }

    // Get all active members except the new member
    const members = await db.query.users.findMany({
      where: eq(drizzleSchema.users.isActive, true),
    });

    if (members.length === 0) {
      log.info({}, "No members found to notify");
      return;
    }

    // TODO: Implement email sending logic
    log.info({ userId }, "New member notification queued");
  } catch (error) {
    log.withErr(error).msg("Error notifying new member joined");
  }
}

/**
 * Send birthday reminder emails for people with birthdays today
 *
 * @param db - Database instance (defaults to drizzleDb for production)
 * @returns Void. Silently succeeds if no birthdays today or errors are logged without throwing
 */
export async function sendBirthdayReminders(db: NotificationsDb = drizzleDb) {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Get all people with birthdays
    const birthdays = await db.query.persons.findMany({
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
    const systemUser = await db.query.users.findFirst({
      where: eq(drizzleSchema.users.role, "ADMIN"),
    });

    if (!systemUser) {
      log.info({}, "No system user found for birthday reminders");
      return;
    }

    // TODO: Implement email sending logic
    log.info(
      { count: peopleWithBirthdayToday.length },
      "Birthday reminders queued"
    );
  } catch (error) {
    log.withErr(error).msg("Error sending birthday reminders");
  }
}
