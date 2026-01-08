import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireAdmin } from "./auth";

const defaultLabels = {
  dateOfPassing: "Date of Passing",
  dateOfBirth: "Date of Birth",
  nativePlace: "Native Place",
  birthPlace: "Birth Place",
  spouse: "Spouse",
  father: "Father",
  mother: "Mother",
  children: "Children",
  siblings: "Siblings",
  profession: "Profession",
  employer: "Employer",
  currentAddress: "Current Address",
  workAddress: "Work Address",
  email: "Email",
  phone: "Phone",
  maidenName: "Maiden Name",
  bio: "About",
};

/**
 * Get family settings (creates default if none exist)
 */
export const get = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);

    const settings = await ctx.db.query("familySettings").first();

    if (!settings) {
      return {
        familyName: "Family Tree",
        defaultCurrency: "USD",
        dateFormat: "MM/DD/YYYY",
        customLabels: defaultLabels,
      };
    }

    return {
      ...settings,
      customLabels: settings.customLabels ?? defaultLabels,
    };
  },
});

/**
 * Get labels (merged with defaults)
 */
export const getLabels = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);

    const settings = await ctx.db.query("familySettings").first();

    if (settings?.customLabels) {
      return {
        ...defaultLabels,
        ...(settings.customLabels as Record<string, string>),
      };
    }

    return defaultLabels;
  },
});

/**
 * Update family settings - admin only
 */
export const update = mutation({
  args: {
    token: v.string(),
    familyName: v.optional(v.string()),
    defaultCurrency: v.optional(v.string()),
    dateFormat: v.optional(v.string()),
    customLabels: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const { token, ...updateData } = args;

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    const existing = await ctx.db.query("familySettings").first();

    if (existing) {
      await ctx.db.patch(existing._id, cleanData);
      return existing._id;
    } else {
      const settingsId = await ctx.db.insert("familySettings", {
        familyName: args.familyName ?? "Family Tree",
        defaultCurrency: args.defaultCurrency ?? "USD",
        dateFormat: args.dateFormat ?? "MM/DD/YYYY",
        customLabels: args.customLabels ?? defaultLabels,
      });
      return settingsId;
    }
  },
});

/**
 * Update custom labels - admin only
 */
export const updateLabels = mutation({
  args: {
    token: v.string(),
    labels: v.any(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const existing = await ctx.db.query("familySettings").first();

    if (existing) {
      const mergedLabels = {
        ...(existing.customLabels ?? defaultLabels),
        ...args.labels,
      };
      await ctx.db.patch(existing._id, { customLabels: mergedLabels });
      return existing._id;
    } else {
      const settingsId = await ctx.db.insert("familySettings", {
        familyName: "Family Tree",
        defaultCurrency: "USD",
        dateFormat: "MM/DD/YYYY",
        customLabels: {
          ...defaultLabels,
          ...args.labels,
        },
      });
      return settingsId;
    }
  },
});

export { defaultLabels };
