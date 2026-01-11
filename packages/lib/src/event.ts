/**
 * Event utilities for genealogy data
 * Maps GEDCOM event tags to Vamsa EventType enum
 */

export type EventType =
  | "BIRTH"
  | "DEATH"
  | "MARRIAGE"
  | "DIVORCE"
  | "BURIAL"
  | "GRADUATION"
  | "ENGAGEMENT"
  | "DIVORCE_FILED"
  | "ADOPTION"
  | "CONFIRMATION"
  | "IMMIGRATION"
  | "EMIGRATION"
  | "NATURALIZATION"
  | "RESIDENCE"
  | "CUSTOM";

/**
 * Map GEDCOM event tags to Vamsa EventType
 * References: https://gedcom.io/specifications/FamilySearchGEDCOMv7.html
 */
export const GEDCOM_TO_EVENT_TYPE: Record<string, EventType> = {
  // Birth and death events
  BIRT: "BIRTH",
  DEAT: "DEATH",
  BURI: "BURIAL",

  // Marriage and divorce events
  MARR: "MARRIAGE",
  DIV: "DIVORCE",
  DIVF: "DIVORCE_FILED",
  ENGM: "ENGAGEMENT",

  // Family/adoption events
  ADOP: "ADOPTION",

  // Religious events
  CONF: "CONFIRMATION",

  // Migration events
  IMMI: "IMMIGRATION",
  EMIG: "EMIGRATION",
  NATU: "NATURALIZATION",

  // Residency
  RESI: "RESIDENCE",

  // Education
  GRAD: "GRADUATION",
};

/**
 * Reverse map: EventType to GEDCOM event tag
 */
export const EVENT_TYPE_TO_GEDCOM: Record<EventType, string | null> = {
  BIRTH: "BIRT",
  DEATH: "DEAT",
  MARRIAGE: "MARR",
  DIVORCE: "DIV",
  BURIAL: "BURI",
  GRADUATION: "GRAD",
  ENGAGEMENT: "ENGM",
  DIVORCE_FILED: "DIVF",
  ADOPTION: "ADOP",
  CONFIRMATION: "CONF",
  IMMIGRATION: "IMMI",
  EMIGRATION: "EMIG",
  NATURALIZATION: "NATU",
  RESIDENCE: "RESI",
  CUSTOM: null, // Custom events don't map to GEDCOM tags
};

/**
 * Get user-friendly event type labels
 */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  BIRTH: "Birth",
  DEATH: "Death",
  MARRIAGE: "Marriage",
  DIVORCE: "Divorce",
  BURIAL: "Burial",
  GRADUATION: "Graduation",
  ENGAGEMENT: "Engagement",
  DIVORCE_FILED: "Divorce Filed",
  ADOPTION: "Adoption",
  CONFIRMATION: "Confirmation",
  IMMIGRATION: "Immigration",
  EMIGRATION: "Emigration",
  NATURALIZATION: "Naturalization",
  RESIDENCE: "Residence",
  CUSTOM: "Custom Event",
};

/**
 * Convert GEDCOM event tag to EventType
 * Returns EventType if mapping exists, null otherwise
 */
export function mapGedcomTagToEventType(tag: string): EventType | null {
  const mapped = GEDCOM_TO_EVENT_TYPE[tag];
  return mapped || null;
}

/**
 * Convert EventType to GEDCOM event tag
 * Returns GEDCOM tag if mapping exists, null for custom events
 */
export function mapEventTypeToGedcomTag(eventType: EventType): string | null {
  return EVENT_TYPE_TO_GEDCOM[eventType];
}

/**
 * Get display label for event type
 */
export function getEventTypeLabel(eventType: EventType): string {
  return EVENT_TYPE_LABELS[eventType];
}
