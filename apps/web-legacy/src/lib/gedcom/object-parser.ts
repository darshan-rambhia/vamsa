/**
 * GEDCOM Multimedia Object Record Parser
 * Parses OBJE (Object) records from GEDCOM files
 * Handles file path validation and existence warnings
 */

import type { GedcomRecord } from "./types";
import { existsSync } from "fs";
import { resolve } from "path";

/**
 * Represents a parsed GEDCOM OBJE (Multimedia Object) record
 */
export interface ParsedObject {
  id: string;
  filePath: string;
  format: string;
  title?: string;
  description?: string;
}

/**
 * Validation result for object paths and files
 */
export interface ObjectValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export class ObjectParser {
  /**
   * Parse an OBJE record into structured data
   * Handles FILE, FORM, TITL, NOTE tags
   */
  parseObjectRecord(record: GedcomRecord): ParsedObject {
    const id = record.id || "unknown";

    // Extract file path (required)
    const fileLine = record.tags.get("FILE")?.[0];
    const filePath = fileLine?.value || "";

    // Extract format
    const formLine = record.tags.get("FORM")?.[0];
    const format = formLine?.value || "UNKNOWN";

    // Extract title
    const titleLine = record.tags.get("TITL")?.[0];
    const title = titleLine?.value || undefined;

    // Extract notes/description
    const noteLines = record.tags.get("NOTE") || [];
    const description =
      noteLines.length > 0
        ? noteLines.map((line) => line.value.trim()).join("\n")
        : undefined;

    return {
      id,
      filePath,
      format,
      title,
      description,
    };
  }

  /**
   * Validate object file paths and existence
   * Warns on absolute paths (prefer relative)
   * Warns on non-existent files
   */
  validateObject(
    object: ParsedObject,
    baseDir?: string
  ): ObjectValidation {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for empty file path
    if (!object.filePath || object.filePath.trim() === "") {
      errors.push(`Object ${object.id} has no file path`);
    }

    // Warn on absolute paths
    if (object.filePath.startsWith("/") || object.filePath.startsWith("C:")) {
      warnings.push(
        `Object ${object.id}: Absolute path detected: ${object.filePath}. Prefer relative paths for portability.`
      );
    }

    // Check file existence if we have a base directory
    if (baseDir && object.filePath) {
      const fullPath = resolve(baseDir, object.filePath);
      if (!existsSync(fullPath)) {
        warnings.push(
          `Object ${object.id}: File not found: ${object.filePath}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Extract objects referenced by an event in a person's record
   * Returns array of object xref IDs linked to the event
   */
  extractEventObjects(
    record: GedcomRecord,
    eventTag: string
  ): string[] {
    const objects: string[] = [];

    // Find the event lines
    const eventLines = record.tags.get(eventTag) || [];

    for (const eventLine of eventLines) {
      // Look for OBJE tags that are children of this event
      const eventIndex = record.lines.indexOf(eventLine);
      if (eventIndex === -1) continue;

      // Look ahead for OBJE tags at level > event level
      for (let i = eventIndex + 1; i < record.lines.length; i++) {
        const line = record.lines[i];

        // Stop when we reach a line at same or lower level as event
        if (line.level <= eventLine.level) break;

        // If we find an OBJE tag, extract the pointer
        if (line.tag === "OBJE" && line.pointer) {
          const objectId = line.pointer.replace(/@/g, "");
          if (!objects.includes(objectId)) {
            objects.push(objectId);
          }
        }
      }
    }

    return objects;
  }

  /**
   * Extract format from a format string
   * Normalizes common format names
   */
  normalizeFormat(format: string): string {
    const normalized = format.toUpperCase().trim();

    // Handle common format variations
    const formatMap: Record<string, string> = {
      JPG: "JPEG",
      JPEG: "JPEG",
      PNG: "PNG",
      PDF: "PDF",
      GIF: "GIF",
      TIFF: "TIFF",
      TIF: "TIFF",
      BMP: "BMP",
      SVG: "SVG",
      WEBP: "WEBP",
    };

    return formatMap[normalized] || normalized;
  }
}
