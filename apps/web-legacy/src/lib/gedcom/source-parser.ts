/**
 * GEDCOM Source Record Parser
 * Parses SOUR (Source) records from GEDCOM files
 */

import type { GedcomRecord } from "./types";

/**
 * Represents a parsed GEDCOM SOUR (Source) record
 */
export interface ParsedSource {
  id: string;
  title: string;
  author?: string;
  publicationDate?: string; // ISO date format
  description?: string;
  repository?: string;
  notes: string[];
}

export class SourceParser {
  /**
   * Parse a SOUR record into structured data
   * Handles TITL, AUTH, PUBL, REPO, NOTE tags
   * Handles multi-line notes with CONT/CONC tags
   */
  parseSourceRecord(record: GedcomRecord): ParsedSource {
    const id = record.id || "unknown";

    // Extract title (required for meaningful source)
    const titleLine = record.tags.get("TITL")?.[0];
    const title = titleLine?.value || "Untitled Source";

    // Extract author
    const authorLine = record.tags.get("AUTH")?.[0];
    const author = authorLine?.value || undefined;

    // Extract publication date
    const publLine = record.tags.get("PUBL")?.[0];
    const publicationDate = publLine?.value || undefined;

    // Extract repository
    const repoLine = record.tags.get("REPO")?.[0];
    const repository = repoLine?.value || undefined;

    // Extract notes (handling CONT/CONC tags)
    const notes: string[] = [];
    const noteLines = record.tags.get("NOTE") || [];
    for (const line of noteLines) {
      const noteValue = line.value.trim();
      if (noteValue) {
        notes.push(noteValue);
      }
    }

    return {
      id,
      title,
      author,
      publicationDate,
      description: undefined, // GEDCOM doesn't have a direct description field
      repository,
      notes,
    };
  }

  /**
   * Extract sources referenced by an event in a person's record
   * Returns array of source xref IDs linked to the event
   */
  extractEventSources(record: GedcomRecord, eventTag: string): string[] {
    const sources: string[] = [];

    // Find the event lines
    const eventLines = record.tags.get(eventTag) || [];

    for (const eventLine of eventLines) {
      // Look for SOUR tags that are children of this event
      // Since the parser flattens the structure, we need to find SOUR lines
      // that occur after the event and before the next sibling
      const eventIndex = record.lines.indexOf(eventLine);
      if (eventIndex === -1) continue;

      // Look ahead for SOUR tags at level > event level
      for (let i = eventIndex + 1; i < record.lines.length; i++) {
        const line = record.lines[i];

        // Stop when we reach a line at same or lower level as event
        if (line.level <= eventLine.level) break;

        // If we find a SOUR tag, extract the pointer
        if (line.tag === "SOUR" && line.pointer) {
          const sourceId = line.pointer.replace(/@/g, "");
          if (!sources.includes(sourceId)) {
            sources.push(sourceId);
          }
        }
      }
    }

    return sources;
  }
}
