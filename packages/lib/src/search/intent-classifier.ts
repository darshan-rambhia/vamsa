/**
 * Pattern-Based Intent Classification for Natural Language Search Queries
 *
 * Classifies user search queries into semantic intents (e.g., relationship path,
 * common ancestor, descendant query) using regex patterns and entity extraction.
 *
 * Features:
 * - Intent classification with confidence scores
 * - Entity name extraction (person1, person2, relationship terms)
 * - Cousin degree extraction (1st, 2nd, 3rd, etc.)
 * - Case-insensitive matching
 * - Fallback to generic person search intent
 */

/**
 * Supported search intents
 */
export type SearchIntent =
  | "PERSON_SEARCH"
  | "RELATIONSHIP_PATH"
  | "COMMON_ANCESTOR"
  | "COUSIN_FINDER"
  | "DESCENDANT_QUERY"
  | "ANCESTOR_QUERY";

/**
 * Classification result with intent, confidence, and extracted entities
 */
export interface ClassificationResult {
  /** The classified intent */
  intent: SearchIntent;
  /** Confidence score (0-1) - 0.9 for specific intents, 0.5 for fallback */
  confidence: number;
  /** Extracted entities from the query */
  entities: {
    /** First person name (if applicable) */
    person1?: string;
    /** Second person name (if applicable) */
    person2?: string;
    /** Relationship term (e.g., "cousin", "parent", "sibling") */
    relationshipTerm?: string;
    /** Cousin degree (1-9) for cousin queries */
    degree?: number;
  };
}

/**
 * Pattern for relationship path queries
 * Matches: "how am i related to X", "what's my relationship to X", "relationship between X and Y"
 */
const RELATIONSHIP_PATH_PATTERNS = [
  /how\s+(?:am\s+i|is\s+(\w+))\s+related\s+to\s+(.+?)(?:\?|$)/i,
  /what'?s?\s+(?:my\s+)?relationship\s+(?:to|between)\s+(.+?)\s+(?:and|to)\s+(.+?)(?:\?|$)/i,
  /relationship\s+(?:between|of)\s+(.+?)\s+and\s+(.+?)(?:\?|$)/i,
  /am\s+i\s+related\s+to\s+(.+?)(?:\?|$)/i,
];

/**
 * Pattern for common ancestor queries
 * Matches: "common ancestor of X and Y", "shared ancestor"
 */
const COMMON_ANCESTOR_PATTERNS = [
  /(?:common|shared)\s+ancestor(?:s)?\s+(?:of|between)\s+(.+?)\s+and\s+(.+?)(?:\?|$)/i,
  /what'?s?\s+(?:the\s+)?(?:common|shared)\s+ancestor\s+(?:of|between)\s+(.+?)\s+and\s+(.+?)(?:\?|$)/i,
  /find\s+(?:common|shared)\s+ancestor(?:s)?\s+(?:for|of)\s+(.+?)\s+and\s+(.+?)(?:\?|$)/i,
];

/**
 * Pattern for cousin finder queries
 * Matches: "my 2nd cousins", "cousins of X", "2nd cousins of X"
 */
const COUSIN_FINDER_PATTERNS = [
  /(?:my\s+)?(\d+)(?:st|nd|rd|th)?\s+cousin(?:s)?(?:\s+(?:of|with)\s+(.+?))?(?:\?|$)/i,
  /cousin(?:s)?\s+(?:finder|of)\s+(.+?)(?:\?|$)/i,
  /find\s+(?:my\s+)?(\d+)(?:st|nd|rd|th)?\s+cousin(?:s)?(?:\s+(?:of|with)\s+(.+?))?(?:\?|$)/i,
  /(?:what|who)\s+(?:are\s+)?(?:my\s+)?(\d+)(?:st|nd|rd|th)?\s+cousin(?:s)?(?:\?|$)/i,
];

/**
 * Pattern for descendant queries
 * Matches: "descendants of X", "X's children", "X's grandchildren"
 */
const DESCENDANT_QUERY_PATTERNS = [
  /descendant(?:s)?\s+(?:of|for)\s+(.+?)(?:\?|$)/i,
  /(?:children|grandchildren|great-grandchildren)\s+of\s+(.+?)(?:\?|$)/i,
  /(.+?)'?s?\s+(?:children|grandchildren|great-grandchildren)(?:\?|$)/i,
  /find\s+descendant(?:s)?\s+(?:of|for)\s+(.+?)(?:\?|$)/i,
  /all\s+descendant(?:s)?\s+(?:of|for)\s+(.+?)(?:\?|$)/i,
];

/**
 * Pattern for ancestor queries
 * Matches: "ancestors of X", "X's parents", "X's grandparents"
 */
const ANCESTOR_QUERY_PATTERNS = [
  /ancestor(?:s)?\s+(?:of|for)\s+(.+?)(?:\?|$)/i,
  /(?:parent|mother|father|grandparent|grandmother|grandfather)\(?s?\)?\s+of\s+(.+?)(?:\?|$)/i,
  /(.+?)'?s?\s+(?:parent|mother|father|grandparent|grandmother|grandfather)(?:s)?(?:\?|$)/i,
  /find\s+ancestor(?:s)?\s+(?:of|for)\s+(.+?)(?:\?|$)/i,
  /all\s+ancestor(?:s)?\s+(?:of|for)\s+(.+?)(?:\?|$)/i,
];

/**
 * Extract a person's name from a query string
 * Handles quoted names and attempts to identify word boundaries
 *
 * @param input - The input string (may contain multiple names)
 * @param index - Regex match index (1-based, from regex capture groups)
 * @returns Extracted and cleaned name, or undefined if no match
 */
function extractName(
  input: string | undefined,
  _index: number = 1
): string | undefined {
  if (!input) return undefined;

  const cleaned = input
    .trim()
    // Remove leading/trailing punctuation
    .replace(/^['"]|['"]$/g, "")
    // Remove trailing punctuation
    .replace(/[?!,;.]*$/, "")
    .trim();

  return cleaned || undefined;
}

/**
 * Extract cousin degree from a query
 * Matches: "1st", "2nd", "3rd", "4th", "5th", etc.
 *
 * @param query - The query string
 * @returns Cousin degree (1-9), or undefined if not found
 */
function extractCousinDegree(query: string): number | undefined {
  const match = query.match(/(\d+)(?:st|nd|rd|th)?/i);
  if (match) {
    const degree = parseInt(match[1], 10);
    if (degree >= 1 && degree <= 9) {
      return degree;
    }
  }
  return undefined;
}

/**
 * Check if a query matches a pattern and extract groups
 *
 * @param query - The query string
 * @param patterns - Array of regex patterns to try
 * @returns Match object with groups, or null if no match
 */
function matchPatterns(
  query: string,
  patterns: RegExp[]
): { groups: string[]; pattern: RegExp } | null {
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return {
        groups: match.slice(1),
        pattern,
      };
    }
  }
  return null;
}

/**
 * Classify a natural language search query into a semantic intent
 *
 * Attempts to match the query against known patterns in order of specificity:
 * 1. Relationship path queries
 * 2. Common ancestor queries
 * 3. Cousin finder queries
 * 4. Descendant queries
 * 5. Ancestor queries
 * 6. Fallback to generic person search
 *
 * @param query - The natural language search query
 * @returns Classification result with intent, confidence, and extracted entities
 *
 * @example
 * ```typescript
 * classifyIntent("how am i related to john smith?");
 * // Returns: { intent: "RELATIONSHIP_PATH", confidence: 0.9, entities: { person1: "john smith" } }
 *
 * classifyIntent("my 2nd cousins");
 * // Returns: { intent: "COUSIN_FINDER", confidence: 0.9, entities: { degree: 2 } }
 *
 * classifyIntent("find john");
 * // Returns: { intent: "PERSON_SEARCH", confidence: 0.5, entities: { person1: "john" } }
 * ```
 */
export function classifyIntent(query: string): ClassificationResult {
  const trimmedQuery = query.trim();

  // Try relationship path patterns
  const relationshipMatch = matchPatterns(
    trimmedQuery,
    RELATIONSHIP_PATH_PATTERNS
  );
  if (relationshipMatch) {
    const groups = relationshipMatch.groups;
    // Patterns may have 1 or 2 capturing groups
    const person1 = extractName(groups[groups.length - 1]);
    const person2 = groups.length > 1 ? extractName(groups[0]) : undefined;

    return {
      intent: "RELATIONSHIP_PATH",
      confidence: 0.9,
      entities: {
        person1,
        person2,
      },
    };
  }

  // Try common ancestor patterns
  const commonAncestorMatch = matchPatterns(
    trimmedQuery,
    COMMON_ANCESTOR_PATTERNS
  );
  if (commonAncestorMatch) {
    const groups = commonAncestorMatch.groups;
    return {
      intent: "COMMON_ANCESTOR",
      confidence: 0.9,
      entities: {
        person1: extractName(groups[0]),
        person2: extractName(groups[1]),
      },
    };
  }

  // Try cousin finder patterns
  const cousinMatch = matchPatterns(trimmedQuery, COUSIN_FINDER_PATTERNS);
  if (cousinMatch) {
    const groups = cousinMatch.groups;
    const degree = extractCousinDegree(trimmedQuery);
    const person = extractName(groups[groups.length - 1]);

    return {
      intent: "COUSIN_FINDER",
      confidence: 0.9,
      entities: {
        person1: person,
        degree,
        relationshipTerm: degree
          ? `${degree}${["", "st", "nd", "rd"][degree % 10] || "th"} cousin`
          : "cousin",
      },
    };
  }

  // Try descendant patterns
  const descendantMatch = matchPatterns(
    trimmedQuery,
    DESCENDANT_QUERY_PATTERNS
  );
  if (descendantMatch) {
    const groups = descendantMatch.groups;
    const person = extractName(groups[groups.length - 1]);

    return {
      intent: "DESCENDANT_QUERY",
      confidence: 0.9,
      entities: {
        person1: person,
        relationshipTerm: "descendant",
      },
    };
  }

  // Try ancestor patterns
  const ancestorMatch = matchPatterns(trimmedQuery, ANCESTOR_QUERY_PATTERNS);
  if (ancestorMatch) {
    const groups = ancestorMatch.groups;
    const person = extractName(groups[groups.length - 1]);

    return {
      intent: "ANCESTOR_QUERY",
      confidence: 0.9,
      entities: {
        person1: person,
        relationshipTerm: "ancestor",
      },
    };
  }

  // Fallback: generic person search
  // Extract any capitalized words or quoted phrases as potential names
  const nameMatch = trimmedQuery.match(
    /['"]([^'"]+)['"]|(\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b)/
  );
  const fallbackName = nameMatch ? nameMatch[1] || nameMatch[2] : undefined;

  return {
    intent: "PERSON_SEARCH",
    confidence: 0.5,
    entities: {
      person1: fallbackName || trimmedQuery,
    },
  };
}
