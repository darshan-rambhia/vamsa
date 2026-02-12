/**
 * Search server function (client-safe)
 *
 * This file ONLY exports the server function definition and lightweight types.
 * Heavy server-side dependencies (Drizzle, Better Auth, NLP modules) are in
 * search-handler.ts, which is dynamically imported inside the server function
 * handler to prevent them from leaking into the client bundle.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SearchResults } from "@vamsa/lib";

/**
 * Person search result item
 */
export interface PersonSearchResultItem {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string | null;
  photoUrl?: string | null;
  dateOfBirth?: Date | null;
  dateOfPassing?: Date | null;
  isLiving: boolean;
}

/**
 * Search people input schema
 */
const searchPeopleInputSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

/**
 * Input type for search handler
 */
export type SearchPeopleInput = z.infer<typeof searchPeopleInputSchema>;

/**
 * Server function: Search people by name and bio using PostgreSQL FTS
 * Returns results ranked by relevance with query timing information.
 *
 * Integrates with:
 * - Natural Language Processing (NLP) for relationship queries
 * - PostgreSQL Full-Text Search (FTS) for person name searches
 * - Relationship path finding for "how am I related to X" queries
 *
 * Automatically classifies queries and routes to appropriate handler:
 * - Relationship path queries -> Uses BFS path finder
 * - Ancestor/descendant queries -> Uses graph traversal
 * - Cousin finder queries -> Uses degree calculation
 * - Person name queries -> Uses PostgreSQL FTS
 *
 * @returns Search results with ranking, timing info, and query explanation
 * @requires VIEWER role or higher
 * @throws Error if database query fails
 */
export const searchPeople = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    return searchPeopleInputSchema.parse(data);
  })
  .handler(async ({ data }): Promise<SearchResults<PersonSearchResultItem>> => {
    // Dynamic import keeps server-only dependencies out of the client bundle
    const { searchPeopleHandler } = await import("./search-handler");
    return searchPeopleHandler(data);
  });
