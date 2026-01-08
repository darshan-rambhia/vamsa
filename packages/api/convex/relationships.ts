import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMember, requireAuth } from "./auth";

const relationshipTypeArg = v.union(
  v.literal("PARENT"),
  v.literal("CHILD"),
  v.literal("SPOUSE"),
  v.literal("SIBLING")
);

/**
 * Get relationships for a person
 */
export const getForPerson = query({
  args: {
    token: v.optional(v.string()),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token ?? null);

    // Get relationships where person is the source
    const fromRelationships = await ctx.db
      .query("relationships")
      .withIndex("by_personId", (q) => q.eq("personId", args.personId))
      .collect();

    // Get relationships where person is the target
    const toRelationships = await ctx.db
      .query("relationships")
      .withIndex("by_relatedPersonId", (q) =>
        q.eq("relatedPersonId", args.personId)
      )
      .collect();

    // Fetch related person details
    const enrichedFrom = await Promise.all(
      fromRelationships.map(async (rel) => {
        const relatedPerson = await ctx.db.get(rel.relatedPersonId);
        return {
          ...rel,
          relatedPerson,
        };
      })
    );

    const enrichedTo = await Promise.all(
      toRelationships.map(async (rel) => {
        const person = await ctx.db.get(rel.personId);
        return {
          ...rel,
          relatedPerson: person,
        };
      })
    );

    return [...enrichedFrom, ...enrichedTo];
  },
});

/**
 * List all relationships
 */
export const list = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token ?? null);
    return await ctx.db.query("relationships").collect();
  },
});

/**
 * Create a new relationship
 */
export const create = mutation({
  args: {
    token: v.string(),
    personId: v.id("persons"),
    relatedPersonId: v.id("persons"),
    type: relationshipTypeArg,
    marriageDate: v.optional(v.number()),
    divorceDate: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.token);

    const { token, ...relationshipData } = args;

    // Check if relationship already exists
    const existing = await ctx.db
      .query("relationships")
      .withIndex("by_personId_relatedPersonId_type", (q) =>
        q
          .eq("personId", args.personId)
          .eq("relatedPersonId", args.relatedPersonId)
          .eq("type", args.type)
      )
      .unique();

    if (existing) {
      throw new Error("This relationship already exists");
    }

    const relationshipId = await ctx.db.insert("relationships", {
      ...relationshipData,
      isActive: relationshipData.isActive ?? true,
    });

    // Create reciprocal relationship for certain types
    if (args.type === "SPOUSE") {
      await ctx.db.insert("relationships", {
        personId: args.relatedPersonId,
        relatedPersonId: args.personId,
        type: "SPOUSE",
        marriageDate: args.marriageDate,
        divorceDate: args.divorceDate,
        isActive: args.isActive ?? true,
      });
    } else if (args.type === "PARENT") {
      // Create CHILD relationship from the other direction
      await ctx.db.insert("relationships", {
        personId: args.relatedPersonId,
        relatedPersonId: args.personId,
        type: "CHILD",
        isActive: args.isActive ?? true,
      });
    } else if (args.type === "CHILD") {
      // Create PARENT relationship from the other direction
      await ctx.db.insert("relationships", {
        personId: args.relatedPersonId,
        relatedPersonId: args.personId,
        type: "PARENT",
        isActive: args.isActive ?? true,
      });
    } else if (args.type === "SIBLING") {
      // Create SIBLING relationship from the other direction
      await ctx.db.insert("relationships", {
        personId: args.relatedPersonId,
        relatedPersonId: args.personId,
        type: "SIBLING",
        isActive: args.isActive ?? true,
      });
    }

    return relationshipId;
  },
});

/**
 * Update a relationship
 */
export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("relationships"),
    marriageDate: v.optional(v.number()),
    divorceDate: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.token);

    const { token, id, ...updates } = args;

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, cleanUpdates);

    return id;
  },
});

/**
 * Delete a relationship
 */
export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("relationships"),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.token);

    const relationship = await ctx.db.get(args.id);
    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Delete reciprocal relationship if exists
    const reciprocal = await ctx.db
      .query("relationships")
      .withIndex("by_personId_relatedPersonId_type", (q) => {
        let reciprocalType = relationship.type;
        if (relationship.type === "PARENT") reciprocalType = "CHILD";
        else if (relationship.type === "CHILD") reciprocalType = "PARENT";
        return q
          .eq("personId", relationship.relatedPersonId)
          .eq("relatedPersonId", relationship.personId)
          .eq("type", reciprocalType);
      })
      .unique();

    if (reciprocal) {
      await ctx.db.delete(reciprocal._id);
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});
