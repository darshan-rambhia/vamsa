import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createSuggestionData,
  getPendingSuggestionsCountData,
  listSuggestionsData,
  reviewSuggestionData,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";
import type {
  SuggestionCreateResult,
  SuggestionListOptions,
  SuggestionListResult,
  SuggestionReviewResult,
} from "@vamsa/lib/server/business";

// Define JsonValue type locally for JSON column handling
type JsonValue =
  | string
  | number
  | boolean
  | null
  | Array<JsonValue>
  | { [key: string]: JsonValue };

// Suggestion list input schema with pagination and status filter
const suggestionListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

type SuggestionListInput = z.infer<typeof suggestionListInputSchema>;

/**
 * Server function: Get suggestions with pagination
 * @returns Paginated list of suggestions
 * @requires VIEWER role or higher
 */
export const getSuggestions = createServerFn({ method: "GET" })
  .inputValidator((data: Partial<SuggestionListInput>) => {
    return suggestionListInputSchema.parse(data);
  })
  .handler(async ({ data }): Promise<SuggestionListResult> => {
    await requireAuth("VIEWER");

    const options: SuggestionListOptions = {
      page: data.page,
      limit: data.limit,
      sortOrder: data.sortOrder,
      status: data.status,
    };

    return listSuggestionsData(options);
  });

/**
 * Server function: Get pending suggestions count
 * @returns Count of pending suggestions
 * @requires VIEWER role or higher
 */
export const getPendingSuggestionsCount = createServerFn({
  method: "GET",
}).handler(async (): Promise<number> => {
  await requireAuth("VIEWER");
  return getPendingSuggestionsCountData();
});

/**
 * Server function: Create a suggestion
 * @returns Created suggestion ID, type, and status
 * @requires MEMBER role or higher
 */
export const createSuggestion = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      type: "CREATE" | "UPDATE" | "DELETE" | "ADD_RELATIONSHIP";
      targetPersonId?: string | null;
      suggestedData: JsonValue;
      reason?: string;
    }) => data
  )
  .handler(async ({ data }): Promise<SuggestionCreateResult> => {
    const user = await requireAuth("MEMBER");

    // Ensure suggestedData is a non-null object
    const suggestedDataRecord =
      typeof data.suggestedData === "object" && data.suggestedData !== null
        ? (data.suggestedData as Record<string, unknown>)
        : {};

    return createSuggestionData(
      data.type,
      data.targetPersonId,
      suggestedDataRecord,
      data.reason,
      user.id
    );
  });

/**
 * Server function: Review a suggestion (approve or reject)
 * @returns Success status
 * @requires ADMIN role
 * @throws Error if suggestion not found or already reviewed
 */
export const reviewSuggestion = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      suggestionId: string;
      status: "APPROVED" | "REJECTED";
      reviewNote?: string;
    }) => data
  )
  .handler(async ({ data }): Promise<SuggestionReviewResult> => {
    const user = await requireAuth("ADMIN");

    return reviewSuggestionData(
      data.suggestionId,
      data.status,
      data.reviewNote,
      user.id
    );
  });
