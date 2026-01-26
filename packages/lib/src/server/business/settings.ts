import { logger } from "@vamsa/lib/logger";
import type { UserRole } from "@vamsa/schemas";

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
 * @returns {Promise<FamilySettingsData>} Family settings data with defaults
 * @throws {Error} If database query fails
 */
export async function getFamilySettingsData(): Promise<FamilySettingsData> {
  const { drizzleDb } = await import("@vamsa/api");

  const settings = await drizzleDb.query.familySettings.findFirst();

  if (!settings) {
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
 * @returns {Promise<FamilySettingsData>} Updated family settings data
 * @throws {Error} If database operation fails
 */
export async function updateFamilySettingsData(
  data: UpdateFamilySettingsInput,
  userRole: UserRole,
  userId: string
): Promise<FamilySettingsData> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  logger.info(
    { userId, userRole, updates: Object.keys(data) },
    "Updating family settings"
  );

  // Check if settings exist
  const existing = await drizzleDb.query.familySettings.findFirst();

  let settings;

  if (existing) {
    // Update existing settings
    const [updated] = await drizzleDb
      .update(drizzleSchema.familySettings)
      .set({
        familyName: data.familyName,
        description: data.description ?? null,
        allowSelfRegistration: data.allowSelfRegistration,
        requireApprovalForEdits: data.requireApprovalForEdits,
        metricsDashboardUrl: data.metricsDashboardUrl ?? null,
        metricsApiUrl: data.metricsApiUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(drizzleSchema.familySettings.id, existing.id))
      .returning();

    settings = updated;
    logger.info({ settingsId: settings.id }, "Family settings updated");
  } else {
    // Create new settings
    const newId = crypto.randomUUID();
    const [created] = await drizzleDb
      .insert(drizzleSchema.familySettings)
      .values({
        id: newId,
        familyName: data.familyName,
        description: data.description ?? null,
        allowSelfRegistration: data.allowSelfRegistration,
        requireApprovalForEdits: data.requireApprovalForEdits,
        metricsDashboardUrl: data.metricsDashboardUrl ?? null,
        metricsApiUrl: data.metricsApiUrl ?? null,
        updatedAt: new Date(),
      })
      .returning();

    settings = created;
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
 * @returns {Promise<string>} The user's preferred language code (defaults to "en")
 * @throws {Error} If user not found or database query fails
 */
export async function getUserLanguagePreferenceData(
  userId: string
): Promise<string> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  const userData = await drizzleDb.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
    columns: { preferredLanguage: true },
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
 * @returns {Promise<string>} The updated language preference
 * @throws {Error} If database update fails
 */
export async function setUserLanguagePreferenceData(
  userId: string,
  language: string
): Promise<string> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  const [updated] = await drizzleDb
    .update(drizzleSchema.users)
    .set({
      preferredLanguage: language,
    })
    .where(eq(drizzleSchema.users.id, userId))
    .returning({
      id: drizzleSchema.users.id,
      preferredLanguage: drizzleSchema.users.preferredLanguage,
    });

  logger.info({ userId, language }, "Language preference updated");

  return updated.preferredLanguage ?? "en";
}
