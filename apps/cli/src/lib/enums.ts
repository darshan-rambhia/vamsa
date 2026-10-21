/**
 * Enum values accepted by the API (mirrors packages/schemas). Kept local so
 * the compiled CLI does not bundle zod and the schema package.
 */

export const EVENT_TYPES = [
  "BIRTH",
  "DEATH",
  "MARRIAGE",
  "DIVORCE",
  "BURIAL",
  "GRADUATION",
  "ENGAGEMENT",
  "DIVORCE_FILED",
  "ADOPTION",
  "CONFIRMATION",
  "IMMIGRATION",
  "EMIGRATION",
  "NATURALIZATION",
  "RESIDENCE",
  "CUSTOM",
] as const;

export const PLACE_TYPES = [
  "COUNTRY",
  "STATE",
  "COUNTY",
  "CITY",
  "TOWN",
  "VILLAGE",
  "PARISH",
  "DISTRICT",
  "REGION",
  "PROVINCE",
  "TERRITORY",
  "OTHER",
] as const;

export const PERSON_PLACE_TYPES = [
  "BIRTH",
  "MARRIAGE",
  "DEATH",
  "LIVED",
  "WORKED",
  "STUDIED",
  "OTHER",
] as const;

export const SOURCE_TYPES = [
  "BOOK",
  "ARTICLE",
  "WEBSITE",
  "ARCHIVE",
  "LETTER",
  "FAMILY_RECORD",
  "CENSUS",
  "VITAL_RECORD",
  "OTHER",
] as const;

export const CITATION_FORMATS = ["MLA", "APA", "CHICAGO"] as const;
export const CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;
