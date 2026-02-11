/**
 * Relationship tools — path finding, common ancestors
 */

import { tool } from "ai";
import { z } from "zod/v4";
import { getVamsaAppURL } from "./shared";

export const findRelationshipPathTool = tool({
  description:
    "Find the relationship path between two people in the family tree. Returns the chain of relationships connecting them (e.g., parent, child, spouse).",
  inputSchema: z.object({
    fromPersonId: z.string().describe("The ID of the starting person"),
    toPersonId: z.string().describe("The ID of the target person"),
  }),
  execute: async ({ fromPersonId, toPersonId }) => {
    const baseURL = getVamsaAppURL();

    try {
      const response = await fetch(
        `${baseURL}/api/v1/relationships/path?from=${fromPersonId}&to=${toPersonId}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        return { error: `Path lookup failed: HTTP ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      return {
        error: `Path lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export const findCommonAncestorTool = tool({
  description:
    "Find the nearest common ancestor of two people in the family tree.",
  inputSchema: z.object({
    personId1: z.string().describe("The ID of the first person"),
    personId2: z.string().describe("The ID of the second person"),
  }),
  execute: async ({ personId1, personId2 }) => {
    const baseURL = getVamsaAppURL();

    try {
      const response = await fetch(
        `${baseURL}/api/v1/relationships/common-ancestor?person1=${personId1}&person2=${personId2}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!response.ok) {
        return {
          error: `Common ancestor lookup failed: HTTP ${response.status}`,
        };
      }

      return await response.json();
    } catch (error) {
      return {
        error: `Common ancestor lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
