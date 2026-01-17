/**
 * Notifications Server Functions - Framework Wrappers
 *
 * This module contains thin `createServerFn` wrappers that call the business logic
 * functions from notifications.server.ts. These wrappers handle:
 * - Input validation with Zod schemas
 * - Calling the corresponding server function
 * - Authentication (delegated to server layer via requireAuth)
 * - Error handling
 *
 * This layer is excluded from unit test coverage as it's framework integration code.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./middleware/require-auth";
import {
  getEmailNotificationPreferences as getPrefs,
  updateEmailNotificationPreferences as updatePrefs,
} from "@vamsa/lib/server/business";

/**
 * Get user's email notification preferences
 */
export const getEmailNotificationPreferences = createServerFn({
  method: "GET",
}).handler(async () => {
  const user = await requireAuth();
  return getPrefs(user.id);
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
    const preferences = await updatePrefs(user.id, data);
    return { success: true, preferences };
  });
