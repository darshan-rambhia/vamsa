/**
 * GEDCOM 5.5.1 Type Definitions
 * Reference: https://github.com/FamilySearch/GEDCOM/tree/main/specification
 */

/**
 * Represents a single line from a GEDCOM file
 * Format: <level> <tag> [<xref>] [<value>]
 */
export interface GedcomLine {
  level: number;
  tag: string;
  xref?: string; // e.g., @I1@, @F1@
  value: string;
  pointer?: string; // Reference to xref (e.g., @I1@)
}

/**
 * A record in GEDCOM structure (individual, family, header, trailer)
 */
export interface GedcomRecord {
  type: "INDI" | "FAM" | "HEAD" | "TRLR" | "OTHER";
  id?: string; // xref without @ signs
  lines: GedcomLine[];
  tags: Map<string, GedcomLine[]>; // Fast lookup by tag
}

/**
 * Parsed GEDCOM file structure
 */
export interface GedcomFile {
  header: GedcomRecord;
  individuals: GedcomRecord[];
  families: GedcomRecord[];
  trailer: GedcomRecord;
  version: string;
  charset: string;
}

/**
 * Parsed individual person data
 */
export interface ParsedIndividual {
  id: string;
  names: Array<{
    full: string;
    firstName?: string;
    lastName?: string;
  }>;
  sex?: "M" | "F" | "X";
  birthDate?: string; // ISO format YYYY-MM-DD
  birthPlace?: string;
  deathDate?: string; // ISO format YYYY-MM-DD
  deathPlace?: string;
  occupation?: string;
  notes: string[];
  familiesAsSpouse: string[]; // Family IDs
  familiesAsChild: string[]; // Family ID
}

/**
 * Parsed family data
 */
export interface ParsedFamily {
  id: string;
  husband?: string; // Individual ID
  wife?: string; // Individual ID
  children: string[]; // Individual IDs
  marriageDate?: string; // ISO format YYYY-MM-DD
  marriagePlace?: string;
  divorceDate?: string; // ISO format YYYY-MM-DD
  notes: string[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  line?: number;
  tag?: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Date parsing result
 */
export interface ParsedDate {
  year?: number;
  month?: number;
  day?: number;
  isApproximate: boolean;
  qualifier?: "ABT" | "BEF" | "AFT" | "BET";
  raw: string;
}
