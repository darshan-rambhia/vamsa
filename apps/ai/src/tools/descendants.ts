/**
 * find_descendants tool — traverses the family tree downward
 */

import { tool } from "ai";
import { z } from "zod/v4";
import { getVamsaAppURL } from "./shared";

export const findDescendantsTool = tool({
  description:
    "Find the descendants (children, grandchildren, etc.) of a person in the family tree. Returns a list of descendant records ordered by generation.",
  inputSchema: z.object({
    personId: z
      .string()
      .describe("The ID of the person to find descendants for"),
    maxGenerations: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .default(5)
      .describe("Maximum number of generations to traverse downward"),
  }),
  execute: async ({ personId, maxGenerations }) => {
    const baseURL = getVamsaAppURL();
    const params = new URLSearchParams({
      generations: String(maxGenerations),
    });

    try {
      const response = await fetch(
        `${baseURL}/api/v1/persons/${personId}/descendants?${params}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        return { error: `Descendant lookup failed: HTTP ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      return {
        error: `Descendant lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
