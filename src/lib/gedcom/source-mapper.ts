/**
 * GEDCOM Source Mapper
 * Maps parsed GEDCOM source records to Vamsa database models
 */

import type { ParsedSource } from "./source-parser";

/**
 * Vamsa Source data structure ready for database insertion
 */
export interface VamsaSource {
  id?: string;
  title: string;
  author?: string;
  publicationDate?: string;
  description?: string;
  repository?: string;
  notes?: string;
}

/**
 * Event-Source link for database insertion
 */
export interface VamsaEventSource {
  id?: string;
  sourceId: string;
  personId: string;
  eventType: string;
}

export class SourceMapper {
  /**
   * Map a parsed GEDCOM source to Vamsa database format
   */
  mapToVamsa(
    parsedSource: ParsedSource,
    vamsaId?: string
  ): VamsaSource {
    return {
      id: vamsaId,
      title: parsedSource.title,
      author: parsedSource.author,
      publicationDate: parsedSource.publicationDate,
      description: parsedSource.description,
      repository: parsedSource.repository,
      notes: parsedSource.notes.join("\n") || undefined,
    };
  }

  /**
   * Create event-source links
   * Called when processing individual events with source citations
   */
  createEventSourceLink(
    sourceId: string,
    personId: string,
    eventType: string
  ): VamsaEventSource {
    return {
      sourceId,
      personId,
      eventType,
    };
  }
}
