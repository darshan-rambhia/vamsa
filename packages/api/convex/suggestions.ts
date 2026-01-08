import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireMember, requireAdmin } from "./auth";

const suggestionTypeArg = v.union(
  v.literal("CREATE"),
  v.literal("UPDATE"),
  v.literal("DELETE"),
  v.literal("ADD_RELATIONSHIP")
);

const suggestionStatusArg = v.union(
  v.literal("PENDING"),
  v.literal("APPROVED"),
  v.literal("REJECTED")
);

/**
 * List suggestions with optional status filter
 */
export const list = query({
  args: {
    token: v.string(),
    status: v.optional(suggestionStatusArg),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);

    let suggestions;
    if (args.status) {
      suggestions = await ctx.db
        .query("suggestions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      suggestions = await ctx.db.query("suggestions").collect();
    }

    // Enrich with user and person data
    const enriched = await Promise.all(
      suggestions.map(async (s) => {
        const submittedBy = await ctx.db.get(s.submittedById);
        const reviewedBy = s.reviewedById
          ? await ctx.db.get(s.reviewedById)
          : null;
        const targetPerson = s.targetPersonId
          ? await ctx.db.get(s.targetPersonId)
          : null;

        return {
          ...s,
          submittedBy: submittedBy
            ? { id: submittedBy._id, email: submittedBy.email, name: submittedBy.name }
            : null,
          reviewedBy: reviewedBy
            ? { id: reviewedBy._id, email: reviewedBy.email, name: reviewedBy.name }
            : null,
          targetPerson,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single suggestion
 */
export const get = query({
  args: {
    token: v.string(),
    id: v.id("suggestions"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token);
    return await ctx.db.get(args.id);
  },
});

/**
 * Create a new suggestion
 */
export const create = mutation({
  args: {
    token: v.string(),
    type: suggestionTypeArg,
    targetPersonId: v.optional(v.id("persons")),
    suggestedData: v.any(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    const suggestionId = await ctx.db.insert("suggestions", {
      type: args.type,
      targetPersonId: args.targetPersonId,
      suggestedData: args.suggestedData,
      reason: args.reason,
      status: "PENDING",
      submittedById: user._id,
    });

    return suggestionId;
  },
});

/**
 * Review a suggestion (approve or reject) - admin only
 */
export const review = mutation({
  args: {
    token: v.string(),
    id: v.id("suggestions"),
    status: v.union(v.literal("APPROVED"), v.literal("REJECTED")),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);

    const suggestion = await ctx.db.get(args.id);
    if (!suggestion) {
      throw new Error("Suggestion not found");
    }

    if (suggestion.status !== "PENDING") {
      throw new Error("Suggestion has already been reviewed");
    }

    // If approved, apply the changes
    if (args.status === "APPROVED") {
      if (suggestion.type === "CREATE") {
        // Create the person
        await ctx.db.insert("persons", {
          ...suggestion.suggestedData,
          isLiving: suggestion.suggestedData.isLiving ?? true,
          createdById: suggestion.submittedById,
        });
      } else if (suggestion.type === "UPDATE" && suggestion.targetPersonId) {
        // Update the person
        await ctx.db.patch(suggestion.targetPersonId, suggestion.suggestedData);
      } else if (suggestion.type === "DELETE" && suggestion.targetPersonId) {
        // Delete relationships first
        const relationships = await ctx.db
          .query("relationships")
          .withIndex("by_personId", (q) =>
            q.eq("personId", suggestion.targetPersonId!)
          )
          .collect();
        const relatedRelationships = await ctx.db
          .query("relationships")
          .withIndex("by_relatedPersonId", (q) =>
            q.eq("relatedPersonId", suggestion.targetPersonId!)
          )
          .collect();

        for (const rel of [...relationships, ...relatedRelationships]) {
          await ctx.db.delete(rel._id);
        }

        // Delete the person
        await ctx.db.delete(suggestion.targetPersonId);
      } else if (suggestion.type === "ADD_RELATIONSHIP") {
        // Add the relationship
        const relData = suggestion.suggestedData;
        await ctx.db.insert("relationships", {
          personId: relData.personId,
          relatedPersonId: relData.relatedPersonId,
          type: relData.type,
          marriageDate: relData.marriageDate,
          divorceDate: relData.divorceDate,
          isActive: relData.isActive ?? true,
        });
      }
    }

    // Update suggestion status
    await ctx.db.patch(args.id, {
      status: args.status,
      reviewedById: admin._id,
      reviewNote: args.reviewNote,
      reviewedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a suggestion (by submitter or admin)
 */
export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("suggestions"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    const suggestion = await ctx.db.get(args.id);
    if (!suggestion) {
      throw new Error("Suggestion not found");
    }

    // Only the submitter or an admin can delete
    if (suggestion.submittedById !== user._id && user.role !== "ADMIN") {
      throw new Error("Not authorized to delete this suggestion");
    }

    // Can only delete pending suggestions
    if (suggestion.status !== "PENDING") {
      throw new Error("Cannot delete a reviewed suggestion");
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});
