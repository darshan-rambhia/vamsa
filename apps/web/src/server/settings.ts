import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./db";
import { z } from "zod";

const TOKEN_COOKIE_NAME = "vamsa-session";

// Auth helper function
async function requireAuth(
  requiredRole: "VIEWER" | "MEMBER" | "ADMIN" = "VIEWER"
) {
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

  const roleHierarchy = { VIEWER: 0, MEMBER: 1, ADMIN: 2 };
  if (roleHierarchy[session.user.role] < roleHierarchy[requiredRole]) {
    throw new Error(`Requires ${requiredRole} role or higher`);
  }

  return session.user;
}

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
  language: z.enum(["en", "hi"]),
});

// Update family settings (admin only)
export const updateFamilySettings = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof updateSettingsSchema>) => {
    return updateSettingsSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const currentUser = await requireAuth("ADMIN");

    console.warn(
      "[Settings Server] Updating family settings by:",
      currentUser.id
    );

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

      console.warn("[Settings Server] Settings updated:", updated.id);
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

      console.warn("[Settings Server] Settings created:", created.id);
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

    console.warn(
      "[Settings Server] Language preference updated for user:",
      user.id,
      "to",
      data.language
    );

    return {
      success: true,
      language: updated.preferredLanguage ?? "en",
    };
  });
