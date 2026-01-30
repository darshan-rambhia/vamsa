import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getFamilySettingsData,
  getUserLanguagePreferenceData,
  setUserLanguagePreferenceData,
  updateFamilySettingsData,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";
import type { UpdateFamilySettingsInput } from "@vamsa/lib/server/business";

/**
 * Update family settings schema for input validation
 * Defines all required and optional fields for updating family settings
 */
const updateSettingsSchema = z.object({
  familyName: z.string().min(1, "Family name is required"),
  description: z.string().optional(),
  allowSelfRegistration: z.boolean(),
  requireApprovalForEdits: z.boolean(),
  metricsDashboardUrl: z.string().url().nullable().optional(),
  metricsApiUrl: z.string().url().nullable().optional(),
});

/**
 * Language preference schema for input validation
 * Restricts language codes to supported values
 */
const languagePreferenceSchema = z.object({
  language: z.enum(["en", "hi", "es"]),
});

/**
 * Server function to retrieve family settings
 *
 * Requires VIEWER role or higher
 * Returns family settings with defaults if none exist
 *
 * @returns {Promise<FamilySettingsData>} Family settings
 *
 * @example
 * const settings = await getFamilySettings();
 * console.log(settings.familyName);
 */
export const getFamilySettings = createServerFn({ method: "GET" }).handler(
  async () => {
    // Allow any authenticated user to read settings
    await requireAuth("VIEWER");

    return await getFamilySettingsData();
  }
);

/**
 * Server function to update family settings
 *
 * Requires ADMIN role
 * Updates existing settings or creates new ones if none exist
 *
 * @param {UpdateFamilySettingsInput} data - Settings data to update
 * @returns {Promise<{ success: true; id: string }>} Success response with settings ID
 *
 * @example
 * const result = await updateFamilySettings({
 *   familyName: "Smith Family",
 *   allowSelfRegistration: false,
 *   requireApprovalForEdits: true,
 * });
 */
export const updateFamilySettings = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof updateSettingsSchema>) => {
    return updateSettingsSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const currentUser = await requireAuth("ADMIN");

    await updateFamilySettingsData(
      data as UpdateFamilySettingsInput,
      currentUser.role,
      currentUser.id
    );

    return { success: true, id: currentUser.id };
  });

/**
 * Server function to get user's language preference
 *
 * Requires VIEWER role or higher
 * Returns user's preferred language or "en" as default
 *
 * @returns {Promise<{ language: string }>} User's language preference
 *
 * @example
 * const pref = await getUserLanguagePreference();
 * console.log(pref.language); // "en", "hi", or "es"
 */
export const getUserLanguagePreference = createServerFn({
  method: "GET",
}).handler(async () => {
  const user = await requireAuth("VIEWER");

  const language = await getUserLanguagePreferenceData(user.id);

  return {
    language,
  };
});

/**
 * Server function to set user's language preference
 *
 * Requires VIEWER role or higher
 * Updates the user's preferred language setting
 *
 * @param {string} language - Language code to set ("en", "hi", or "es")
 * @returns {Promise<{ success: true; language: string }>} Success response with updated language
 *
 * @example
 * const result = await setUserLanguagePreference({ language: "hi" });
 * console.log(result.language); // "hi"
 */
export const setUserLanguagePreference = createServerFn({
  method: "POST",
})
  .inputValidator((data: z.infer<typeof languagePreferenceSchema>) => {
    return languagePreferenceSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("VIEWER");

    const language = await setUserLanguagePreferenceData(
      user.id,
      data.language
    );

    return {
      success: true,
      language,
    };
  });
