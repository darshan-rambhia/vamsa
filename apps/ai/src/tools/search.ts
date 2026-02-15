/**
 * search_people tool — searches the family tree by name, place, or profession
 *
 * Uses the Vamsa web app HTTP API to search for people.
 */

import { tool } from "ai";
import { z } from "zod/v4";
import { getVamsaAppURL } from "./shared";

export const searchPeopleTool = tool({
  description:
    "Search for people in the family tree by name, birthplace, profession, or other attributes. Returns matching person records.",
  inputSchema: z.object({
    query: z.string().describe("Search query (name, place, profession, etc.)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum number of results to return"),
  }),
  execute: async ({ query, limit }) => {
    const baseURL = getVamsaAppURL();
    const params = new URLSearchParams({ q: query, limit: String(limit) });

    try {
      const response = await fetch(`${baseURL}/api/v1/persons?${params}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { error: `Search failed: HTTP ${response.status}` };
      }

      const data = (await response.json()) as Record<string, unknown>;
      return {
        results: (data.items ?? data.results ?? []) as Array<unknown>,
        total: (data.total ?? 0) as number,
      };
    } catch (error) {
      return {
        error: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
