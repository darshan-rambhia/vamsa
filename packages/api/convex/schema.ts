import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Enum validators
const genderValidator = v.union(
  v.literal("MALE"),
  v.literal("FEMALE"),
  v.literal("OTHER"),
  v.literal("PREFER_NOT_TO_SAY")
);

const userRoleValidator = v.union(
  v.literal("ADMIN"),
  v.literal("MEMBER"),
  v.literal("VIEWER")
);

const relationshipTypeValidator = v.union(
  v.literal("PARENT"),
  v.literal("CHILD"),
  v.literal("SPOUSE"),
  v.literal("SIBLING")
);

const suggestionTypeValidator = v.union(
  v.literal("CREATE"),
  v.literal("UPDATE"),
  v.literal("DELETE"),
  v.literal("ADD_RELATIONSHIP")
);

const suggestionStatusValidator = v.union(
  v.literal("PENDING"),
  v.literal("APPROVED"),
  v.literal("REJECTED")
);

const privacyLevelValidator = v.union(
  v.literal("PUBLIC"),
  v.literal("MEMBERS_ONLY"),
  v.literal("ADMIN_ONLY")
);

const auditActionValidator = v.union(
  v.literal("CREATE"),
  v.literal("UPDATE"),
  v.literal("DELETE"),
  v.literal("LOGIN"),
  v.literal("LOGOUT"),
  v.literal("APPROVE"),
  v.literal("REJECT")
);

// Address object schema
const addressValidator = v.object({
  street: v.optional(v.string()),
  city: v.optional(v.string()),
  state: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  country: v.optional(v.string()),
});

// Social links object schema
const socialLinksValidator = v.object({
  facebook: v.optional(v.string()),
  twitter: v.optional(v.string()),
  linkedin: v.optional(v.string()),
  instagram: v.optional(v.string()),
  other: v.optional(v.string()),
});

export default defineSchema({
  // Person table
  persons: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    maidenName: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()), // Unix timestamp (midnight UTC)
    dateOfPassing: v.optional(v.number()), // Unix timestamp (midnight UTC)
    birthPlace: v.optional(v.string()),
    nativePlace: v.optional(v.string()),
    gender: v.optional(genderValidator),
    photoUrl: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    currentAddress: v.optional(addressValidator),
    workAddress: v.optional(addressValidator),
    profession: v.optional(v.string()),
    employer: v.optional(v.string()),
    socialLinks: v.optional(socialLinksValidator),
    isLiving: v.boolean(),
    createdById: v.optional(v.id("users")),
  })
    .index("by_lastName_firstName", ["lastName", "firstName"])
    .index("by_createdById", ["createdById"])
    .searchIndex("search_name", {
      searchField: "firstName",
      filterFields: ["lastName", "isLiving", "gender"],
    }),

  // Relationship table
  relationships: defineTable({
    personId: v.id("persons"),
    relatedPersonId: v.id("persons"),
    type: relationshipTypeValidator,
    marriageDate: v.optional(v.number()), // Unix timestamp
    divorceDate: v.optional(v.number()), // Unix timestamp
    isActive: v.boolean(),
  })
    .index("by_personId", ["personId"])
    .index("by_relatedPersonId", ["relatedPersonId"])
    .index("by_personId_relatedPersonId_type", [
      "personId",
      "relatedPersonId",
      "type",
    ]),

  // User table
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    personId: v.optional(v.id("persons")),
    role: userRoleValidator,
    isActive: v.boolean(),
    mustChangePassword: v.boolean(),
    invitedById: v.optional(v.id("users")),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_personId", ["personId"]),

  // Session table (for auth)
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"])
    .index("by_expiresAt", ["expiresAt"]),

  // Suggestion table
  suggestions: defineTable({
    type: suggestionTypeValidator,
    targetPersonId: v.optional(v.id("persons")),
    suggestedData: v.any(), // JSON data
    reason: v.optional(v.string()),
    status: suggestionStatusValidator,
    submittedById: v.id("users"),
    reviewedById: v.optional(v.id("users")),
    reviewNote: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_submittedById", ["submittedById"])
    .index("by_targetPersonId", ["targetPersonId"]),

  // Family Settings (singleton pattern)
  familySettings: defineTable({
    familyName: v.string(),
    description: v.optional(v.string()),
    locale: v.string(),
    customLabels: v.optional(v.any()),
    defaultPrivacy: privacyLevelValidator,
    allowSelfRegistration: v.boolean(),
    requireApprovalForEdits: v.boolean(),
  }),

  // Audit Log
  auditLogs: defineTable({
    userId: v.id("users"),
    action: auditActionValidator,
    entityType: v.string(),
    entityId: v.optional(v.string()),
    previousData: v.optional(v.any()),
    newData: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_entityType_entityId", ["entityType", "entityId"]),

  // Source Citations (GEDCOM Phase 2)
  sources: defineTable({
    title: v.string(),
    author: v.optional(v.string()),
    publicationDate: v.optional(v.string()),
    description: v.optional(v.string()),
    repository: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_title", ["title"]),

  // Event Sources (join table)
  eventSources: defineTable({
    sourceId: v.id("sources"),
    personId: v.id("persons"),
    eventType: v.string(),
  })
    .index("by_sourceId", ["sourceId"])
    .index("by_personId", ["personId"])
    .index("by_eventType", ["eventType"]),

  // Media Objects (GEDCOM Phase 2)
  mediaObjects: defineTable({
    filePath: v.string(),
    format: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  }).index("by_filePath", ["filePath"]),

  // Event Media (join table)
  eventMedia: defineTable({
    mediaId: v.id("mediaObjects"),
    personId: v.id("persons"),
    eventType: v.string(),
  })
    .index("by_mediaId", ["mediaId"])
    .index("by_personId", ["personId"])
    .index("by_eventType", ["eventType"]),
});
