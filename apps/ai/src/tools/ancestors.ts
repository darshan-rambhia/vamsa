/**
 * find_ancestors tool — traverses the family tree upward
 */

import { tool } from "ai";
import { z } from "zod/v4";
import { getVamsaAppURL } from "./shared";

export const findAncestorsTool = tool({
  description:
    "Find the ancestors (parents, grandparents, etc.) of a person in the family tree. Returns a list of ancestor records ordered by generation.",
  inputSchema: z.object({
    personId: z.string().describe("The ID of the person to find ancestors for"),
    maxGenerations: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .default(5)
      .describe("Maximum number of generations to traverse upward"),
  }),
  execute: async ({ personId, maxGenerations }) => {
    const baseURL = getVamsaAppURL();
    const params = new URLSearchParams({
      generations: String(maxGenerations),
    });

    try {
      const response = await fetch(
        `${baseURL}/api/v1/persons/${personId}/ancestors?${params}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        return { error: `Ancestor lookup failed: HTTP ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      return {
        error: `Ancestor lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
