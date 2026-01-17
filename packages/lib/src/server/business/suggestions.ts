import { prisma as defaultPrisma } from "../db";
import type { Prisma, PrismaClient } from "@vamsa/api";
import { createPaginationMeta } from "@vamsa/schemas";
import {
  notifySuggestionCreated,
  notifySuggestionUpdated,
} from "./notifications";

/**
 * Type for the database client used by suggestions functions.
 * This allows dependency injection for testing.
 */
export type SuggestionsDb = Pick<
  PrismaClient,
  "suggestion" | "person" | "relationship"
>;

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
 * Query suggestions with pagination and optional status filtering
 * @param options - List options including page, limit, sorting, and status filter
 * @param db - Optional database client (defaults to prisma)
 * @returns Paginated list of suggestions with related data
 */
export async function listSuggestionsData(
  options: SuggestionListOptions,
  db: SuggestionsDb = defaultPrisma
): Promise<SuggestionListResult> {
  const { page, limit, sortOrder, status } = options;

  // Build where clause
  const where: Prisma.SuggestionWhereInput = {};
  if (status) {
    where.status = status;
  }

  // Get total count
  const total = await db.suggestion.count({ where });

  // Get paginated results
  const suggestions = await db.suggestion.findMany({
    where,
    orderBy: { submittedAt: sortOrder === "asc" ? "asc" : "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      targetPerson: {
        select: { id: true, firstName: true, lastName: true },
      },
      submittedBy: {
        select: { id: true, name: true, email: true },
      },
      reviewedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return {
    items: suggestions.map((s) => ({
      id: s.id,
      type: s.type,
      targetPersonId: s.targetPersonId,
      suggestedData: s.suggestedData as {
        [key: string]: NonNullable<unknown>;
      },
      reason: s.reason,
      status: s.status,
      submittedAt: s.submittedAt.toISOString(),
      reviewedAt: s.reviewedAt?.toISOString() ?? null,
      reviewNote: s.reviewNote,
      targetPerson: s.targetPerson,
      submittedBy: s.submittedBy,
      reviewedBy: s.reviewedBy,
    })),
    pagination: createPaginationMeta(page, limit, total),
  };
}

/**
 * Get count of pending suggestions
 * @param db - Optional database client (defaults to prisma)
 * @returns Number of suggestions with PENDING status
 */
export async function getPendingSuggestionsCountData(
  db: SuggestionsDb = defaultPrisma
): Promise<number> {
  return db.suggestion.count({
    where: { status: "PENDING" },
  });
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
 * Create a new suggestion
 * @param type - Type of suggestion (CREATE, UPDATE, DELETE, ADD_RELATIONSHIP)
 * @param targetPersonId - ID of target person (optional for CREATE/ADD_RELATIONSHIP)
 * @param suggestedData - JSON data for the suggestion
 * @param reason - Optional reason for the suggestion
 * @param userId - ID of user submitting the suggestion
 * @param db - Optional database client (defaults to prisma)
 * @returns Created suggestion with ID, type, and status
 */
export async function createSuggestionData(
  type: "CREATE" | "UPDATE" | "DELETE" | "ADD_RELATIONSHIP",
  targetPersonId: string | null | undefined,
  suggestedData: Prisma.JsonValue,
  reason: string | undefined,
  userId: string,
  db: SuggestionsDb = defaultPrisma
): Promise<SuggestionCreateResult> {
  const suggestion = await db.suggestion.create({
    data: {
      type,
      targetPersonId: targetPersonId ?? null,
      suggestedData: suggestedData ?? {},
      reason,
      submittedById: userId,
    },
  });

  // Send notification to admins about new suggestion
  await notifySuggestionCreated(suggestion.id);

  return {
    id: suggestion.id,
    type: suggestion.type,
    status: suggestion.status,
  };
}

/**
 * Result type for applying/reviewing a suggestion
 */
export interface SuggestionReviewResult {
  success: boolean;
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
    suggestedData: Prisma.JsonValue;
  },
  db: SuggestionsDb
): Promise<void> {
  const data = suggestion.suggestedData as Record<string, unknown>;

  switch (suggestion.type) {
    case "CREATE":
      await db.person.create({
        data: data as Parameters<typeof db.person.create>[0]["data"],
      });
      break;

    case "UPDATE":
      if (!suggestion.targetPersonId) {
        throw new Error("Target person required for update");
      }
      await db.person.update({
        where: { id: suggestion.targetPersonId },
        data: data as Parameters<typeof db.person.update>[0]["data"],
      });
      break;

    case "DELETE":
      if (!suggestion.targetPersonId) {
        throw new Error("Target person required for delete");
      }
      await db.person.delete({
        where: { id: suggestion.targetPersonId },
      });
      break;

    case "ADD_RELATIONSHIP":
      await db.relationship.create({
        data: data as Parameters<typeof db.relationship.create>[0]["data"],
      });
      break;

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
 * @param db - Optional database client (defaults to prisma)
 * @returns Success status
 * @throws Error if suggestion not found or already reviewed
 */
export async function reviewSuggestionData(
  suggestionId: string,
  status: "APPROVED" | "REJECTED",
  reviewNote: string | undefined,
  userId: string,
  db: SuggestionsDb = defaultPrisma
): Promise<SuggestionReviewResult> {
  const suggestion = await db.suggestion.findUnique({
    where: { id: suggestionId },
  });

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
  await db.suggestion.update({
    where: { id: suggestionId },
    data: {
      status,
      reviewedById: userId,
      reviewNote: reviewNote || null,
      reviewedAt: new Date(),
    },
  });

  // Send notification to submitter about review outcome
  await notifySuggestionUpdated(suggestionId, status);

  return { success: true };
}
