import { drizzleDb, drizzleSchema } from "../db";
import { createPaginationMeta } from "@vamsa/schemas";
import { eq, and, desc, asc, count } from "drizzle-orm";
import {
  notifySuggestionCreated,
  notifySuggestionUpdated,
} from "./notifications";

/**
 * Options for listing suggestions with pagination and filtering
 */
export interface SuggestionListOptions {
  page: number;
  limit: number;
  sortOrder: "asc" | "desc";
  status?: "PENDING" | "APPROVED" | "REJECTED";
}

/**
 * Result type for paginated suggestion list
 */
export interface SuggestionListResult {
  items: Array<{
    id: string;
    type: string;
    targetPersonId: string | null;
    suggestedData: { [key: string]: NonNullable<unknown> };
    reason: string | null;
    status: string;
    submittedAt: string;
    reviewedAt: string | null;
    reviewNote: string | null;
    targetPerson: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    submittedBy: {
      id: string;
      name: string | null;
      email: string;
    };
    reviewedBy: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }>;
  pagination: ReturnType<typeof createPaginationMeta>;
}

/**
 * Result type for creating a suggestion
 */
export interface SuggestionCreateResult {
  id: string;
  type: string;
  status: string;
}

/**
 * Result type for applying/reviewing a suggestion
 */
export interface SuggestionReviewResult {
  success: boolean;
}

/**
 * Query suggestions with pagination and optional status filtering
 * @param options - List options including page, limit, sorting, and status filter
 * @param db - Optional database client (defaults to drizzleDb)
 * @returns Paginated list of suggestions with related data
 */
export async function listSuggestionsData(
  options: SuggestionListOptions,
  db: typeof drizzleDb = drizzleDb
): Promise<SuggestionListResult> {
  const { page, limit, sortOrder, status } = options;

  // Build where conditions
  const conditions = [];
  if (status) {
    conditions.push(eq(drizzleSchema.suggestions.status, status));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const totalResult = await db
    .select({ count: count() })
    .from(drizzleSchema.suggestions)
    .where(where);
  const total = totalResult[0]?.count ?? 0;

  // Get paginated results with joins
  const suggestions = await db
    .select()
    .from(drizzleSchema.suggestions)
    .leftJoin(
      drizzleSchema.persons,
      eq(drizzleSchema.suggestions.targetPersonId, drizzleSchema.persons.id)
    )
    .leftJoin(
      drizzleSchema.users,
      eq(drizzleSchema.suggestions.submittedById, drizzleSchema.users.id)
    )
    .where(where)
    .orderBy(
      sortOrder === "asc"
        ? asc(drizzleSchema.suggestions.submittedAt)
        : desc(drizzleSchema.suggestions.submittedAt)
    )
    .limit(limit)
    .offset((page - 1) * limit);

  // Get reviewedBy users separately to avoid multi-join complexity
  const reviewedByIds = suggestions
    .map((s) => s.Suggestion.reviewedById)
    .filter((id): id is string => id !== null);

  const reviewedByUsers = await (reviewedByIds.length > 0
    ? db
        .select()
        .from(drizzleSchema.users)
        .where(
          reviewedByIds.length === 1
            ? eq(drizzleSchema.users.id, reviewedByIds[0])
            : undefined
        )
    : Promise.resolve([]));

  const reviewedByMap = new Map(reviewedByUsers.map((u) => [u.id, u]));

  return {
    items: suggestions.map((row) => {
      const suggestion = row.Suggestion;
      const targetPerson = row.Person;
      const submittedBy = row.User;
      const reviewedBy = suggestion.reviewedById
        ? reviewedByMap.get(suggestion.reviewedById)
        : null;

      return {
        id: suggestion.id,
        type: suggestion.type,
        targetPersonId: suggestion.targetPersonId,
        suggestedData: (suggestion.suggestedData ?? {}) as {
          [key: string]: NonNullable<unknown>;
        },
        reason: suggestion.reason,
        status: suggestion.status,
        submittedAt: suggestion.submittedAt.toISOString(),
        reviewedAt: suggestion.reviewedAt?.toISOString() ?? null,
        reviewNote: suggestion.reviewNote,
        targetPerson: targetPerson
          ? {
              id: targetPerson.id,
              firstName: targetPerson.firstName,
              lastName: targetPerson.lastName,
            }
          : null,
        submittedBy: submittedBy
          ? {
              id: submittedBy.id,
              name: submittedBy.name,
              email: submittedBy.email,
            }
          : {
              id: "",
              name: null,
              email: "",
            },
        reviewedBy: reviewedBy
          ? {
              id: reviewedBy.id,
              name: reviewedBy.name,
              email: reviewedBy.email,
            }
          : null,
      };
    }),
    pagination: createPaginationMeta(page, limit, total),
  };
}

/**
 * Get count of pending suggestions
 * @param db - Optional database client (defaults to drizzleDb)
 * @returns Number of suggestions with PENDING status
 */
export async function getPendingSuggestionsCountData(
  db: typeof drizzleDb = drizzleDb
): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(drizzleSchema.suggestions)
    .where(eq(drizzleSchema.suggestions.status, "PENDING"));

  return result[0]?.count ?? 0;
}

/**
 * Create a new suggestion
 * @param type - Type of suggestion (CREATE, UPDATE, DELETE, ADD_RELATIONSHIP)
 * @param targetPersonId - ID of target person (optional for CREATE/ADD_RELATIONSHIP)
 * @param suggestedData - JSON data for the suggestion
 * @param reason - Optional reason for the suggestion
 * @param userId - ID of user submitting the suggestion
 * @param db - Optional database client (defaults to drizzleDb)
 * @returns Created suggestion with ID, type, and status
 */
export async function createSuggestionData(
  type: "CREATE" | "UPDATE" | "DELETE" | "ADD_RELATIONSHIP",
  targetPersonId: string | null | undefined,
  suggestedData: Record<string, unknown>,
  reason: string | undefined,
  userId: string,
  db: typeof drizzleDb = drizzleDb
): Promise<SuggestionCreateResult> {
  const suggestionId = crypto.randomUUID();

  const result = await db
    .insert(drizzleSchema.suggestions)
    .values({
      id: suggestionId,
      type,
      targetPersonId: targetPersonId ?? null,
      suggestedData: suggestedData ?? {},
      reason: reason ?? null,
      submittedById: userId,
      status: "PENDING",
      submittedAt: new Date(),
    })
    .returning({
      id: drizzleSchema.suggestions.id,
      type: drizzleSchema.suggestions.type,
      status: drizzleSchema.suggestions.status,
    });

  if (!result[0]) {
    throw new Error("Failed to create suggestion");
  }

  // Send notification to admins about new suggestion
  await notifySuggestionCreated(result[0].id);

  return result[0];
}

/**
 * Apply a suggestion (internal helper)
 * @param suggestion - Suggestion data to apply
 * @param db - Database client
 * @throws Error if suggestion type is invalid or required data is missing
 */
async function applySuggestionData(
  suggestion: {
    type: string;
    targetPersonId: string | null;
    suggestedData: unknown;
  },
  db: typeof drizzleDb
): Promise<void> {
  const data = suggestion.suggestedData as Record<string, unknown>;

  switch (suggestion.type) {
    case "CREATE": {
      // For person creation, ensure we have required fields
      const personData = {
        id: (data.id as string) || crypto.randomUUID(),
        firstName: (data.firstName as string) || "",
        lastName: (data.lastName as string) || "",
        ...data,
      } as unknown;
      await db.insert(drizzleSchema.persons).values(personData as never);
      break;
    }

    case "UPDATE": {
      if (!suggestion.targetPersonId) {
        throw new Error("Target person required for update");
      }
      // Exclude id from update data
      const updateData = { ...data };
      delete updateData.id;
      await db
        .update(drizzleSchema.persons)
        .set(updateData as never)
        .where(eq(drizzleSchema.persons.id, suggestion.targetPersonId));
      break;
    }

    case "DELETE": {
      if (!suggestion.targetPersonId) {
        throw new Error("Target person required for delete");
      }
      await db
        .delete(drizzleSchema.persons)
        .where(eq(drizzleSchema.persons.id, suggestion.targetPersonId));
      break;
    }

    case "ADD_RELATIONSHIP": {
      // For relationship creation, ensure we have required fields
      const relationshipData = {
        id: (data.id as string) || crypto.randomUUID(),
        personAId: (data.personAId as string) || "",
        personBId: (data.personBId as string) || "",
        type: (data.type as string) || "SIBLING",
        ...data,
      } as unknown;
      await db
        .insert(drizzleSchema.relationships)
        .values(relationshipData as never);
      break;
    }

    default:
      throw new Error(`Unknown suggestion type: ${suggestion.type}`);
  }
}

/**
 * Review a suggestion (approve or reject)
 * @param suggestionId - ID of suggestion to review
 * @param status - Review status (APPROVED or REJECTED)
 * @param reviewNote - Optional note from reviewer
 * @param userId - ID of admin reviewing the suggestion
 * @param db - Optional database client (defaults to drizzleDb)
 * @returns Success status
 * @throws Error if suggestion not found or already reviewed
 */
export async function reviewSuggestionData(
  suggestionId: string,
  status: "APPROVED" | "REJECTED",
  reviewNote: string | undefined,
  userId: string,
  db: typeof drizzleDb = drizzleDb
): Promise<SuggestionReviewResult> {
  // Get the suggestion
  const suggestionResult = await db
    .select()
    .from(drizzleSchema.suggestions)
    .where(eq(drizzleSchema.suggestions.id, suggestionId));

  const suggestion = suggestionResult[0];

  if (!suggestion) {
    throw new Error("Suggestion not found");
  }

  if (suggestion.status !== "PENDING") {
    throw new Error("Suggestion has already been reviewed");
  }

  // If approving, apply the suggestion
  if (status === "APPROVED") {
    await applySuggestionData(suggestion, db);
  }

  // Update the suggestion
  await db
    .update(drizzleSchema.suggestions)
    .set({
      status,
      reviewedById: userId,
      reviewNote: reviewNote ?? null,
      reviewedAt: new Date(),
    })
    .where(eq(drizzleSchema.suggestions.id, suggestionId));

  // Send notification to submitter about review outcome
  await notifySuggestionUpdated(suggestionId, status);

  return { success: true };
}
