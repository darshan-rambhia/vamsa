/**
 * Response validation layer
 *
 * Validates model outputs against real data to catch hallucinations.
 * The model sometimes invents people, dates, or relationships that
 * don't exist in the database — this layer catches obvious errors.
 */

import { z } from "zod/v4";

/**
 * Schema for story generation output
 */
export const storyResponseSchema = z.object({
  narrative: z
    .string()
    .min(50)
    .describe("The generated biographical narrative"),
  personName: z.string().describe("The name of the person the story is about"),
  factsUsed: z
    .array(z.string())
    .describe("List of factual data points used in the narrative"),
  dataSources: z
    .array(z.string())
    .describe("IDs of persons whose data was used"),
});

export type StoryResponse = z.infer<typeof storyResponseSchema>;

/**
 * Schema for data suggestion output
 */
export const suggestionSchema = z.object({
  field: z.string().describe("The missing data field name"),
  suggestedValue: z.string().describe("The suggested value"),
  reasoning: z.string().describe("Why this value is likely"),
  confidence: z.enum(["low", "medium", "high"]),
});

export const suggestResponseSchema = z.object({
  personId: z.string(),
  personName: z.string(),
  suggestions: z.array(suggestionSchema),
});

export type SuggestResponse = z.infer<typeof suggestResponseSchema>;

/**
 * Sanitize model output text
 * Removes potential prompt injection attempts and excessive whitespace
 */
export function sanitizeOutput(text: string): string {
  return (
    text
      // Remove potential system prompt leaks
      .replace(/^(system|assistant|user):\s*/gim, "")
      // Collapse excessive newlines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
