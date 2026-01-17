import { prisma as defaultPrisma } from "../db";
import { logger } from "@vamsa/lib/logger";
import type { UserRole } from "@vamsa/schemas";
import type { FamilySettings, PrismaClient } from "@vamsa/api";

/**
 * Type for the database client used by settings functions.
 * This allows dependency injection for testing.
 */
export type SettingsDb = Pick<PrismaClient, "familySettings" | "user">;

/**
 * Family settings data transfer object
 * Represents the shape of family settings returned to clients
 */
export interface FamilySettingsData {
  id: string | null;
  familyName: string;
  description: string;
  allowSelfRegistration: boolean;
  requireApprovalForEdits: boolean;
  metricsDashboardUrl: string | null;
  metricsApiUrl: string | null;
}

/**
 * Input data for updating family settings
 * Used to validate and process update requests
 */
export interface UpdateFamilySettingsInput {
  familyName: string;
  description?: string;
  allowSelfRegistration: boolean;
  requireApprovalForEdits: boolean;
  metricsDashboardUrl?: string | null;
  metricsApiUrl?: string | null;
}

/**
 * Retrieves family settings from the database
 * Returns default settings if no settings exist in the database
 *
 * @param db - Optional database client (defaults to prisma)
 * @returns {Promise<FamilySettingsData>} Family settings data with defaults
 * @throws {Error} If database query fails
 *
 * @example
 * const settings = await getFamilySettingsData();
 * console.log(settings.familyName); // "Our Family" or configured name
 */
export async function getFamilySettingsData(
  db: SettingsDb = defaultPrisma
): Promise<FamilySettingsData> {
  const settings = await db.familySettings.findFirst();

  if (!settings) {
    // Return defaults if no settings exist
    logger.debug("No family settings found, returning defaults");
    return {
      id: null,
      familyName: "Our Family",
      description: "",
      allowSelfRegistration: true,
      requireApprovalForEdits: true,
      metricsDashboardUrl: null,
      metricsApiUrl: null,
    };
  }

  return {
    id: settings.id,
    familyName: settings.familyName,
    description: settings.description ?? "",
    allowSelfRegistration: settings.allowSelfRegistration,
    requireApprovalForEdits: settings.requireApprovalForEdits,
    metricsDashboardUrl: settings.metricsDashboardUrl ?? null,
    metricsApiUrl: settings.metricsApiUrl ?? null,
  };
}

/**
 * Updates family settings in the database
 * Creates a new settings record if none exists, otherwise updates the existing one
 *
 * @param {UpdateFamilySettingsInput} data - The settings data to update
 * @param {UserRole} userRole - The role of the user making the update (for audit logging)
 * @param {string} userId - The ID of the user making the update (for audit logging)
 * @param db - Optional database client (defaults to prisma)
 * @returns {Promise<FamilySettingsData>} Updated family settings data
 * @throws {Error} If database operation fails
 *
 * @example
 * const updated = await updateFamilySettingsData(
 *   {
 *     familyName: "Smith Family",
 *     allowSelfRegistration: false,
 *     requireApprovalForEdits: true,
 *   },
 *   "ADMIN",
 *   "user-123"
 * );
 */
export async function updateFamilySettingsData(
  data: UpdateFamilySettingsInput,
  userRole: UserRole,
  userId: string,
  db: SettingsDb = defaultPrisma
): Promise<FamilySettingsData> {
  logger.info(
    { userId, userRole, updates: Object.keys(data) },
    "Updating family settings"
  );

  // Check if settings exist
  const existing = await db.familySettings.findFirst();

  let settings: FamilySettings;

  if (existing) {
    // Update existing settings
    settings = await db.familySettings.update({
      where: { id: existing.id },
      data: {
        familyName: data.familyName,
        description: data.description ?? null,
        allowSelfRegistration: data.allowSelfRegistration,
        requireApprovalForEdits: data.requireApprovalForEdits,
        metricsDashboardUrl: data.metricsDashboardUrl ?? null,
        metricsApiUrl: data.metricsApiUrl ?? null,
      },
    });

    logger.info({ settingsId: settings.id }, "Family settings updated");
  } else {
    // Create new settings
    settings = await db.familySettings.create({
      data: {
        familyName: data.familyName,
        description: data.description ?? null,
        allowSelfRegistration: data.allowSelfRegistration,
        requireApprovalForEdits: data.requireApprovalForEdits,
        metricsDashboardUrl: data.metricsDashboardUrl ?? null,
        metricsApiUrl: data.metricsApiUrl ?? null,
      },
    });

    logger.info({ settingsId: settings.id }, "Family settings created");
  }

  return {
    id: settings.id,
    familyName: settings.familyName,
    description: settings.description ?? "",
    allowSelfRegistration: settings.allowSelfRegistration,
    requireApprovalForEdits: settings.requireApprovalForEdits,
    metricsDashboardUrl: settings.metricsDashboardUrl ?? null,
    metricsApiUrl: settings.metricsApiUrl ?? null,
  };
}

/**
 * Retrieves a user's language preference
 *
 * @param {string} userId - The ID of the user
 * @param db - Optional database client (defaults to prisma)
 * @returns {Promise<string>} The user's preferred language code (defaults to "en")
 * @throws {Error} If user not found or database query fails
 *
 * @example
 * const language = await getUserLanguagePreferenceData("user-123");
 * console.log(language); // "hi" or "en" or "es"
 */
export async function getUserLanguagePreferenceData(
  userId: string,
  db: SettingsDb = defaultPrisma
): Promise<string> {
  const userData = await db.user.findUnique({
    where: { id: userId },
    select: { preferredLanguage: true },
  });

  if (!userData) {
    logger.warn({ userId }, "User not found when fetching language preference");
    throw new Error("User not found");
  }

  return userData.preferredLanguage ?? "en";
}

/**
 * Updates a user's language preference
 *
 * @param {string} userId - The ID of the user
 * @param {string} language - The language code to set ("en", "hi", or "es")
 * @param db - Optional database client (defaults to prisma)
 * @returns {Promise<string>} The updated language preference
 * @throws {Error} If database update fails
 *
 * @example
 * const language = await setUserLanguagePreferenceData("user-123", "hi");
 * console.log(language); // "hi"
 */
export async function setUserLanguagePreferenceData(
  userId: string,
  language: string,
  db: SettingsDb = defaultPrisma
): Promise<string> {
  const updated = await db.user.update({
    where: { id: userId },
    data: {
      preferredLanguage: language,
    },
    select: {
      id: true,
      preferredLanguage: true,
    },
  });

  logger.info({ userId, language }, "Language preference updated");

  return updated.preferredLanguage ?? "en";
}
