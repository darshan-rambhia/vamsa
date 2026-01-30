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
  type:
    | "INDI"
    | "FAM"
    | "HEAD"
    | "TRLR"
    | "SOUR"
    | "OBJE"
    | "REPO"
    | "SUBM"
    | "OTHER";
  id?: string; // xref without @ signs
  lines: Array<GedcomLine>;
  tags: Map<string, Array<GedcomLine>>; // Fast lookup by tag
}

/**
 * Parsed GEDCOM file structure
 */
export interface GedcomFile {
  header: GedcomRecord;
  individuals: Array<GedcomRecord>;
  families: Array<GedcomRecord>;
  sources: Array<GedcomRecord>; // GEDCOM Phase 2: Source records
  objects: Array<GedcomRecord>; // GEDCOM Phase 2: Multimedia object records
  repositories: Array<GedcomRecord>; // GEDCOM Phase 2: Repository records
  submitters: Array<GedcomRecord>; // GEDCOM Phase 2: Submitter records
  trailer: GedcomRecord;
  version: string; // GEDCOM version (e.g., "5.5.1" or "7.0")
  charset: string;
  gedcomVersion?: "5.5.1" | "7.0"; // Structured version identifier
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
  notes: Array<string>;
  familiesAsSpouse: Array<string>; // Family IDs
  familiesAsChild: Array<string>; // Family ID
}

/**
 * Parsed family data
 */
export interface ParsedFamily {
  id: string;
  husband?: string; // Individual ID
  wife?: string; // Individual ID
  children: Array<string>; // Individual IDs
  marriageDate?: string; // ISO format YYYY-MM-DD
  marriagePlace?: string;
  divorceDate?: string; // ISO format YYYY-MM-DD
  notes: Array<string>;
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

/**
 * Parsed repository data (REPO record)
 */
export interface ParsedRepository {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes: Array<string>;
}

/**
 * Parsed submitter data (SUBM record)
 */
export interface ParsedSubmitter {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  notes: Array<string>;
}
