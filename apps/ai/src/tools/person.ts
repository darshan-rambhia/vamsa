/**
 * get_person_details tool — fetches detailed information about a specific person
 */

import { tool } from "ai";
import { z } from "zod/v4";
import { getVamsaAppURL } from "./shared";

export const getPersonDetailsTool = tool({
  description:
    "Get detailed information about a specific person in the family tree by their ID. Returns all available fields including bio, dates, places, and relationships.",
  inputSchema: z.object({
    personId: z.string().describe("The unique ID of the person to look up"),
  }),
  execute: async ({ personId }) => {
    const baseURL = getVamsaAppURL();

    try {
      const response = await fetch(`${baseURL}/api/v1/persons/${personId}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { error: `Person lookup failed: HTTP ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      return {
        error: `Person lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
