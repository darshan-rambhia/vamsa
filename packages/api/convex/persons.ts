import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMember, requireAuth } from "./auth";

// Address validator for arguments
const addressArg = v.optional(
  v.object({
    street: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
  })
);

// Social links validator for arguments
const socialLinksArg = v.optional(
  v.object({
    facebook: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    instagram: v.optional(v.string()),
    other: v.optional(v.string()),
  })
);

// Gender validator
const genderArg = v.optional(
  v.union(
    v.literal("MALE"),
    v.literal("FEMALE"),
    v.literal("OTHER"),
    v.literal("PREFER_NOT_TO_SAY")
  )
);

/**
 * List all persons with optional filters
 */
export const list = query({
  args: {
    token: v.optional(v.string()),
    search: v.optional(v.string()),
    isLiving: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token ?? null);

    let query = ctx.db.query("persons");

    // Apply living filter if specified
    if (args.isLiving !== undefined) {
      // Note: Would need to implement filtering differently in Convex
      // For now, we'll filter in memory after fetching
    }

    const persons = await query
      .order("desc")
      .take(args.limit ?? 100);

    // Filter by search if provided
    let filtered = persons;
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filtered = persons.filter(
        (p) =>
          p.firstName.toLowerCase().includes(searchLower) ||
          p.lastName.toLowerCase().includes(searchLower)
      );
    }

    // Filter by living status if provided
    if (args.isLiving !== undefined) {
      filtered = filtered.filter((p) => p.isLiving === args.isLiving);
    }

    return {
      persons: filtered,
      total: filtered.length,
    };
  },
});

/**
 * Get a single person by ID
 */
export const get = query({
  args: {
    token: v.optional(v.string()),
    id: v.id("persons"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token ?? null);
    return await ctx.db.get(args.id);
  },
});

/**
 * Create a new person
 */
export const create = mutation({
  args: {
    token: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    maidenName: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    dateOfPassing: v.optional(v.number()),
    birthPlace: v.optional(v.string()),
    nativePlace: v.optional(v.string()),
    gender: genderArg,
    bio: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    currentAddress: addressArg,
    workAddress: addressArg,
    profession: v.optional(v.string()),
    employer: v.optional(v.string()),
    socialLinks: socialLinksArg,
    isLiving: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireMember(ctx, args.token);

    const { token, ...personData } = args;

    const personId = await ctx.db.insert("persons", {
      ...personData,
      isLiving: personData.isLiving ?? true,
      createdById: user._id,
    });

    return personId;
  },
});

/**
 * Update an existing person
 */
export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("persons"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    maidenName: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    dateOfPassing: v.optional(v.number()),
    birthPlace: v.optional(v.string()),
    nativePlace: v.optional(v.string()),
    gender: genderArg,
    bio: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    currentAddress: addressArg,
    workAddress: addressArg,
    profession: v.optional(v.string()),
    employer: v.optional(v.string()),
    socialLinks: socialLinksArg,
    isLiving: v.optional(v.boolean()),
    photoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.token);

    const { token, id, ...updates } = args;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, cleanUpdates);

    return id;
  },
});

/**
 * Delete a person
 */
export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("persons"),
  },
  handler: async (ctx, args) => {
    await requireMember(ctx, args.token);

    // Delete related relationships
    const relationships = await ctx.db
      .query("relationships")
      .withIndex("by_personId", (q) => q.eq("personId", args.id))
      .collect();

    const relatedRelationships = await ctx.db
      .query("relationships")
      .withIndex("by_relatedPersonId", (q) => q.eq("relatedPersonId", args.id))
      .collect();

    for (const rel of [...relationships, ...relatedRelationships]) {
      await ctx.db.delete(rel._id);
    }

    // Delete the person
    await ctx.db.delete(args.id);

    return { success: true };
  },
});

/**
 * Get dashboard stats
 */
export const stats = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token ?? null);

    const persons = await ctx.db.query("persons").collect();
    const relationships = await ctx.db.query("relationships").collect();

    const totalPeople = persons.length;
    const livingPeople = persons.filter((p) => p.isLiving).length;
    const deceasedPeople = persons.filter((p) => !p.isLiving).length;
    const totalRelationships = relationships.length;

    // Get recent additions (last 5, sorted by creation time)
    const sortedPersons = [...persons].sort(
      (a, b) => b._creationTime - a._creationTime
    );
    const recentAdditions = sortedPersons.slice(0, 5).map((p) => ({
      id: p._id,
      firstName: p.firstName,
      lastName: p.lastName,
      createdAt: p._creationTime,
    }));

    return {
      totalPeople,
      livingPeople,
      deceasedPeople,
      totalRelationships,
      recentAdditions,
    };
  },
});

/**
 * Get all persons for dropdown/select
 */
export const listForSelect = query({
  args: {
    token: v.optional(v.string()),
    excludeId: v.optional(v.id("persons")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.token ?? null);

    const persons = await ctx.db.query("persons").collect();

    return persons
      .filter((p) => !args.excludeId || p._id !== args.excludeId)
      .map((p) => ({
        id: p._id,
        firstName: p.firstName,
        lastName: p.lastName,
        isLiving: p.isLiving,
      }));
  },
});
