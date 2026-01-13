import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { z } from "zod";
import { logger } from "@vamsa/lib/logger";
import { requireAuth } from "./middleware/require-auth";

// Get family settings
export const getFamilySettings = createServerFn({ method: "GET" }).handler(
  async () => {
    // Allow any authenticated user to read settings
    await requireAuth("VIEWER");

    const settings = await prisma.familySettings.findFirst();

    if (!settings) {
      // Return defaults if no settings exist
      return {
        id: null,
        familyName: "Our Family",
        description: "",
        allowSelfRegistration: true,
        requireApprovalForEdits: true,
      };
    }

    return {
      id: settings.id,
      familyName: settings.familyName,
      description: settings.description ?? "",
      allowSelfRegistration: settings.allowSelfRegistration,
      requireApprovalForEdits: settings.requireApprovalForEdits,
    };
  }
);

// Update settings schema
const updateSettingsSchema = z.object({
  familyName: z.string().min(1, "Family name is required"),
  description: z.string().optional(),
  allowSelfRegistration: z.boolean(),
  requireApprovalForEdits: z.boolean(),
});

// Language preference schema
const languagePreferenceSchema = z.object({
  language: z.enum(["en", "hi", "es"]),
});

// Update family settings (admin only)
export const updateFamilySettings = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof updateSettingsSchema>) => {
    return updateSettingsSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const currentUser = await requireAuth("ADMIN");

    logger.info({ updatedBy: currentUser.id }, "Updating family settings");

    // Check if settings exist
    const existing = await prisma.familySettings.findFirst();

    if (existing) {
      // Update existing settings
      const updated = await prisma.familySettings.update({
        where: { id: existing.id },
        data: {
          familyName: data.familyName,
          description: data.description ?? null,
          allowSelfRegistration: data.allowSelfRegistration,
          requireApprovalForEdits: data.requireApprovalForEdits,
        },
      });

      logger.info({ settingsId: updated.id }, "Settings updated");
      return { success: true, id: updated.id };
    } else {
      // Create new settings
      const created = await prisma.familySettings.create({
        data: {
          familyName: data.familyName,
          description: data.description ?? null,
          allowSelfRegistration: data.allowSelfRegistration,
          requireApprovalForEdits: data.requireApprovalForEdits,
        },
      });

      logger.info({ settingsId: created.id }, "Settings created");
      return { success: true, id: created.id };
    }
  });

// Get user's language preference
export const getUserLanguagePreference = createServerFn({
  method: "GET",
}).handler(async () => {
  const user = await requireAuth("VIEWER");

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { preferredLanguage: true },
  });

  if (!userData) {
    throw new Error("User not found");
  }

  return {
    language: userData.preferredLanguage ?? "en",
  };
});

// Set user's language preference
export const setUserLanguagePreference = createServerFn({
  method: "POST",
})
  .inputValidator((data: z.infer<typeof languagePreferenceSchema>) => {
    return languagePreferenceSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const user = await requireAuth("VIEWER");

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        preferredLanguage: data.language,
      },
      select: {
        id: true,
        preferredLanguage: true,
      },
    });

    logger.info(
      { userId: user.id, language: data.language },
      "Language preference updated"
    );

    return {
      success: true,
      language: updated.preferredLanguage ?? "en",
    };
  });
