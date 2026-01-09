/**
 * GEDCOM Multimedia Object Mapper
 * Maps parsed GEDCOM object records to Vamsa database models
 */

import type { ParsedObject } from "./object-parser";

/**
 * Vamsa MediaObject data structure ready for database insertion
 */
export interface VamsaMediaObject {
  id?: string;
  filePath: string;
  format: string;
  title?: string;
  description?: string;
}

/**
 * Event-Media link for database insertion
 */
export interface VamsaEventMedia {
  id?: string;
  mediaId: string;
  personId: string;
  eventType: string;
}

export class ObjectMapper {
  /**
   * Map a parsed GEDCOM object to Vamsa database format
   */
  mapToVamsa(parsedObject: ParsedObject, vamsaId?: string): VamsaMediaObject {
    return {
      id: vamsaId,
      filePath: parsedObject.filePath,
      format: parsedObject.format,
      title: parsedObject.title,
      description: parsedObject.description,
    };
  }

  /**
   * Create event-media links
   * Called when processing individual events with media attachments
   */
  createEventMediaLink(
    mediaId: string,
    personId: string,
    eventType: string
  ): VamsaEventMedia {
    return {
      mediaId,
      personId,
      eventType,
    };
  }
}
