import { z } from "zod";

export const suggestionTypeEnum = z.enum([
  "CREATE",
  "UPDATE",
  "DELETE",
  "ADD_RELATIONSHIP",
]);

export const suggestionStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const suggestionCreateSchema = z.object({
  type: suggestionTypeEnum,
  targetPersonId: z.string().optional().nullable(),
  suggestedData: z.record(z.string(), z.unknown()),
  reason: z.string().optional(),
});

export const suggestionReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional(),
});

export type SuggestionType = z.infer<typeof suggestionTypeEnum>;
export type SuggestionStatus = z.infer<typeof suggestionStatusEnum>;
export type SuggestionCreateInput = z.infer<typeof suggestionCreateSchema>;
export type SuggestionReviewInput = z.infer<typeof suggestionReviewSchema>;
