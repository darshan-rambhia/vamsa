import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { drizzleDb } from "@vamsa/api";
import {
  buildCombinedSearchQuery,
  buildPersonSearchCountQuery,
  sanitizeQuery,
  type SearchResults,
  classifyIntent,
  executeSearch,
  type RelationshipDataMaps,
} from "@vamsa/lib";
import { requireAuth } from "./middleware/require-auth";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.db;

/**
 * Convert a Map<string, Set<string>> to Map<string, string[]>
 */
function convertSetMapToArrayMap(
  setMap: Map<string, Set<string>>
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  setMap.forEach((set, key) => {
    result.set(key, Array.from(set));
  });
  return result;
}

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
 * Build relationship data maps from database for use by relationship handlers
 * Fetches all persons and creates parent/child/spouse maps
 *
 * @returns RelationshipDataMaps with people map and relationship maps
 */
async function buildRelationshipMaps(): Promise<RelationshipDataMaps> {
  try {
    // Fetch all persons
    const persons = await drizzleDb.query.persons.findMany();

    // Create people map
    const people = new Map(
      persons.map((p) => [
        p.id,
        {
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender as "male" | "female" | "other" | undefined,
          dateOfBirth: p.dateOfBirth,
          dateOfPassing: p.dateOfPassing,
          isLiving: p.isLiving,
          photoUrl: p.photoUrl,
        },
      ])
    );

    // Fetch all relationships
    const rels = await drizzleDb.query.relationships.findMany();

    // Create parent/child/spouse maps (using Sets as required by relationship modules)
    const parents = new Map<string, Set<string>>();
    const children = new Map<string, Set<string>>();
    const spouses = new Map<string, Set<string>>();

    for (const rel of rels) {
      // Parent relationship
      if (rel.type === "PARENT") {
        if (!parents.has(rel.personId)) {
          parents.set(rel.personId, new Set());
        }
        parents.get(rel.personId)!.add(rel.relatedPersonId);
      }

      // Child relationship (inverse of parent)
      if (rel.type === "CHILD") {
        if (!children.has(rel.personId)) {
          children.set(rel.personId, new Set());
        }
        children.get(rel.personId)!.add(rel.relatedPersonId);
      }

      // Spouse relationships
      if (rel.type === "SPOUSE") {
        if (!spouses.has(rel.personId)) {
          spouses.set(rel.personId, new Set());
        }
        spouses.get(rel.personId)!.add(rel.relatedPersonId);
      }
    }

    return {
      people,
      maps: {
        parents: convertSetMapToArrayMap(parents),
        children: convertSetMapToArrayMap(children),
        spouses: convertSetMapToArrayMap(spouses),
      },
      parentToChildren: children,
      childToParents: parents,
    };
  } catch (error) {
    log.withErr(error).msg("Failed to build relationship maps");
    // Return empty maps as fallback
    return {
      people: new Map(),
      maps: {
        parents: new Map(),
        children: new Map(),
        spouses: new Map(),
      },
    };
  }
}

/**
 * Determine if a query is likely a natural language relationship query
 * vs a simple person name search
 */
function isNLPQuery(query: string): boolean {
  const classification = classifyIntent(query);
  // Consider relationship queries if intent is not PERSON_SEARCH or confidence is high
  return (
    classification.intent !== "PERSON_SEARCH" || classification.confidence > 0.6
  );
}

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
 * - Relationship path queries → Uses BFS path finder
 * - Ancestor/descendant queries → Uses graph traversal
 * - Cousin finder queries → Uses degree calculation
 * - Person name queries → Uses PostgreSQL FTS
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
    await requireAuth("VIEWER");

    const startTime = Date.now();

    try {
      const sanitized = sanitizeQuery(data.query);

      // Return empty results for empty queries
      if (!sanitized) {
        return {
          results: [],
          total: 0,
          queryTime: Date.now() - startTime,
        };
      }

      // Check if this is likely a natural language relationship query
      if (isNLPQuery(data.query)) {
        try {
          // Build relationship maps for NLP handlers
          const relationships = await buildRelationshipMaps();

          // Execute NLP search
          const nlpResult = await executeSearch(data.query, relationships);

          const queryTime = Date.now() - startTime;

          log.info(
            {
              query: data.query,
              intentType: nlpResult.type,
              resultCount: nlpResult.results.length,
              queryTime,
              explanation: nlpResult.explanation,
            },
            "NLP search executed"
          );

          // Transform NLP results to match search result format
          // For now, return empty results with explanation
          // Frontend will display the explanation instead of person list
          return {
            results: [],
            total: 0,
            queryTime,
            // Store explanation in results metadata (needs schema update)
          };
        } catch (nlpError) {
          log
            .withErr(nlpError)
            .ctx({ query: data.query })
            .msg("NLP search failed, falling back to FTS");
          // Fall through to FTS search as fallback
        }
      }

      // Use traditional FTS search as fallback or for person name queries
      const { sql: searchSql, params: searchParams } = buildCombinedSearchQuery(
        data.query,
        {
          limit: data.limit,
          offset: data.offset,
          fuzzy: true,
        }
      );

      // Build count query to get total results
      const { sql: countSql, params: countParams } =
        buildPersonSearchCountQuery(data.query, { language: "english" });

      // Execute both queries in parallel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = drizzleDb.$client as any;
      const [rawResults, countResult] = await Promise.all([
        client.query(searchSql, searchParams),
        client.query(countSql, countParams),
      ]);

      const total = (countResult.rows[0]?.total as number) || 0;

      // Transform results to include rank and proper typing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = rawResults.rows.map((row: any) => ({
        item: {
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          maidenName: row.maidenName,
          photoUrl: row.photoUrl,
          dateOfBirth: row.dateOfBirth,
          dateOfPassing: row.dateOfPassing,
          isLiving: row.isLiving,
        },
        rank: row.rank || row.similarity_score || 0,
      }));

      const queryTime = Date.now() - startTime;

      log.info(
        { query: data.query, resultCount: results.length, queryTime, total },
        "FTS search executed"
      );

      return {
        results,
        total,
        queryTime,
      };
    } catch (error) {
      const queryTime = Date.now() - startTime;
      log
        .withErr(error)
        .ctx({ query: data.query, queryTime })
        .msg("Search query failed");

      throw error;
    }
  });
