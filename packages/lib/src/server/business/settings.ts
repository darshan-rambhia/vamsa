import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";
import type { UserRole } from "@vamsa/schemas";

const log = loggers.db;

/** Type for the database instance (for DI) */
export type SettingsDb = typeof drizzleDb;

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
  allowProfileClaiming: boolean;
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
  allowProfileClaiming?: boolean;
  metricsDashboardUrl?: string | null;
  metricsApiUrl?: string | null;
}

/**
 * Retrieves family settings from the database
 * Returns default settings if no settings exist in the database
 *
 * @param db - Database instance (defaults to drizzleDb for production)
 * @returns {Promise<FamilySettingsData>} Family settings data with defaults
 * @throws {Error} If database query fails
 */
export async function getFamilySettingsData(
  db: SettingsDb = drizzleDb
): Promise<FamilySettingsData> {
  const settings = await db.query.familySettings.findFirst();

  if (!settings) {
    log.debug({}, "No family settings found, returning defaults");
    return {
      id: null,
      familyName: "Our Family",
      description: "",
      allowSelfRegistration: true,
      requireApprovalForEdits: true,
      allowProfileClaiming: false,
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
    allowProfileClaiming: settings.allowProfileClaiming,
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
 * @param db - Database instance (defaults to drizzleDb for production)
 * @returns {Promise<FamilySettingsData>} Updated family settings data
 * @throws {Error} If database operation fails
 */
export async function updateFamilySettingsData(
  data: UpdateFamilySettingsInput,
  userRole: UserRole,
  userId: string,
  db: SettingsDb = drizzleDb
): Promise<FamilySettingsData> {
  log.info(
    { userId, userRole, updates: Object.keys(data) },
    "Updating family settings"
  );

  // Check if settings exist
  const existing = await db.query.familySettings.findFirst();

  let settings;

  if (existing) {
    // Update existing settings
    const [updated] = await db
      .update(drizzleSchema.familySettings)
      .set({
        familyName: data.familyName,
        description: data.description ?? null,
        allowSelfRegistration: data.allowSelfRegistration,
        requireApprovalForEdits: data.requireApprovalForEdits,
        // Undefined leaves the stored value unchanged
        ...(data.allowProfileClaiming !== undefined && {
          allowProfileClaiming: data.allowProfileClaiming,
        }),
        metricsDashboardUrl: data.metricsDashboardUrl ?? null,
        metricsApiUrl: data.metricsApiUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(drizzleSchema.familySettings.id, existing.id))
      .returning();

    settings = updated;
    log.info({ settingsId: settings.id }, "Family settings updated");
  } else {
    // Create new settings
    const newId = crypto.randomUUID();
    const [created] = await db
      .insert(drizzleSchema.familySettings)
      .values({
        id: newId,
        familyName: data.familyName,
        description: data.description ?? null,
        allowSelfRegistration: data.allowSelfRegistration,
        requireApprovalForEdits: data.requireApprovalForEdits,
        allowProfileClaiming: data.allowProfileClaiming ?? false,
        metricsDashboardUrl: data.metricsDashboardUrl ?? null,
        metricsApiUrl: data.metricsApiUrl ?? null,
        updatedAt: new Date(),
      })
      .returning();

    settings = created;
    log.info({ settingsId: settings.id }, "Family settings created");
  }

  return {
    id: settings.id,
    familyName: settings.familyName,
    description: settings.description ?? "",
    allowSelfRegistration: settings.allowSelfRegistration,
    requireApprovalForEdits: settings.requireApprovalForEdits,
    allowProfileClaiming: settings.allowProfileClaiming,
    metricsDashboardUrl: settings.metricsDashboardUrl ?? null,
    metricsApiUrl: settings.metricsApiUrl ?? null,
  };
}

/** Columns an admin may patch through the API. */
export type FamilySettingsPatch = Partial<{
  familyName: string;
  description: string;
  allowSelfRegistration: boolean;
  requireApprovalForEdits: boolean;
  allowProfileClaiming: boolean;
  metricsDashboardUrl: string | null;
  metricsApiUrl: string | null;
}>;

/**
 * Update only the supplied settings columns in a single UPDATE, so two
 * concurrent patches to different keys cannot overwrite each other (no
 * read-merge-write). Creates the row with defaults if none exists yet.
 */
export async function patchFamilySettingsData(
  patch: FamilySettingsPatch,
  userRole: UserRole,
  userId: string,
  db: SettingsDb = drizzleDb
): Promise<FamilySettingsData> {
  log.info(
    { userId, userRole, updates: Object.keys(patch) },
    "Patching family settings"
  );
  const columns = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  );

  const existing = await db.query.familySettings.findFirst({
    columns: { id: true },
  });

  if (existing) {
    await db
      .update(drizzleSchema.familySettings)
      .set({ ...columns, updatedAt: new Date() })
      .where(eq(drizzleSchema.familySettings.id, existing.id));
  } else {
    const defaults = await getFamilySettingsData(db);
    const { id: _id, ...base } = defaults;
    await db.insert(drizzleSchema.familySettings).values({
      id: crypto.randomUUID(),
      ...base,
      ...columns,
      updatedAt: new Date(),
    });
  }
  return getFamilySettingsData(db);
}

/**
 * Whether profile claiming (linking an account to an existing family profile)
 * is enabled by an admin. Off by default; off means the claim endpoints refuse.
 *
 * @param db - Database instance (defaults to drizzleDb for production)
 * @returns {Promise<boolean>} True only when an admin has enabled claiming
 */
export async function isProfileClaimingEnabledData(
  db: SettingsDb = drizzleDb
): Promise<boolean> {
  const settings = await db.query.familySettings.findFirst({
    columns: { allowProfileClaiming: true },
  });
  return settings?.allowProfileClaiming ?? false;
}

/**
 * Retrieves a user's language preference
 *
 * @param {string} userId - The ID of the user
 * @param db - Database instance (defaults to drizzleDb for production)
 * @returns {Promise<string>} The user's preferred language code (defaults to "en")
 * @throws {Error} If user not found or database query fails
 */
export async function getUserLanguagePreferenceData(
  userId: string,
  db: SettingsDb = drizzleDb
): Promise<string> {
  const userData = await db.query.users.findFirst({
    where: eq(drizzleSchema.users.id, userId),
    columns: { preferredLanguage: true },
  });

  if (!userData) {
    log.info({ userId }, "User not found when fetching language preference");
    throw new Error("User not found");
  }

  return userData.preferredLanguage ?? "en";
}

/**
 * Updates a user's language preference
 *
 * @param {string} userId - The ID of the user
 * @param {string} language - The language code to set ("en", "hi", or "es")
 * @param db - Database instance (defaults to drizzleDb for production)
 * @returns {Promise<string>} The updated language preference
 * @throws {Error} If database update fails
 */
export async function setUserLanguagePreferenceData(
  userId: string,
  language: string,
  db: SettingsDb = drizzleDb
): Promise<string> {
  const [updated] = await db
    .update(drizzleSchema.users)
    .set({
      preferredLanguage: language,
    })
    .where(eq(drizzleSchema.users.id, userId))
    .returning({
      id: drizzleSchema.users.id,
      preferredLanguage: drizzleSchema.users.preferredLanguage,
    });

  log.info({ userId, language }, "Language preference updated");

  return updated.preferredLanguage ?? "en";
}
