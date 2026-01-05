/**
 * GEDCOM Data Mapper Types
 * Defines types for bidirectional mapping between GEDCOM and Vamsa data models
 */

import type { RelationshipType } from "@prisma/client";

/**
 * Mapping errors for diagnostics
 */
export interface MappingError {
  type: "missing_data" | "invalid_format" | "broken_reference";
  source: "INDI" | "FAM";
  id: string;
  field: string;
  message: string;
}

/**
 * Mapping result with diagnostics
 */
export interface MappingResult {
  people: VamsaPerson[];
  relationships: VamsaRelationship[];
  errors: MappingError[];
  warnings: string[];
}

/**
 * Vamsa Person data structure
 * Represents data ready for insertion into Vamsa database
 */
export interface VamsaPerson {
  id?: string; // Generated CUID if not provided
  firstName: string;
  lastName: string;
  maidenName?: string;
  dateOfBirth?: Date;
  dateOfPassing?: Date;
  birthPlace?: string;
  nativePlace?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  bio?: string;
  profession?: string;
  isLiving: boolean;
}

/**
 * Vamsa Relationship data structure
 * Represents data ready for insertion into Vamsa database
 */
export interface VamsaRelationship {
  id?: string; // Generated CUID if not provided
  personId: string;
  relatedPersonId: string;
  type: RelationshipType;
  marriageDate?: Date;
  divorceDate?: Date;
  isActive?: boolean;
}

/**
 * Intermediate representation for GEDCOM export
 * Individual data formatted for GEDCOM output
 */
export interface GedcomIndividualData {
  xref: string; // e.g., "@I1@"
  name: string; // GEDCOM format: "Given /Surname/"
  sex?: "M" | "F" | "X";
  birthDate?: string; // GEDCOM format: "15 JAN 1985"
  birthPlace?: string;
  deathDate?: string; // GEDCOM format: "15 JAN 2020"
  deathPlace?: string;
  occupation?: string;
  notes: string[];
  familiesAsSpouse: string[]; // xrefs like "@F1@"
  familiesAsChild: string[]; // xref like "@F1@"
}

/**
 * Intermediate representation for GEDCOM export
 * Family data formatted for GEDCOM output
 */
export interface GedcomFamilyData {
  xref: string; // e.g., "@F1@"
  husband?: string; // xref like "@I1@"
  wife?: string; // xref like "@I2@"
  children: string[]; // xrefs like "@I3@"
  marriageDate?: string; // GEDCOM format: "10 JUN 1985"
  marriagePlace?: string;
  divorceDate?: string; // GEDCOM format: "01 JAN 2000"
  notes: string[];
}

/**
 * Options for mapping operations
 */
export interface MapOptions {
  skipValidation?: boolean;
  ignoreMissingReferences?: boolean;
  generateIds?: boolean; // Auto-generate CUIDs for people
}

/**
 * Spouse pair for internal mapping
 */
export interface SpousePair {
  partner1: string; // Individual ID
  partner2: string; // Individual ID
  marriageDate?: string;
  divorceDate?: string;
  notes?: string[];
}

/**
 * Name parsing result
 */
export interface ParsedName {
  firstName?: string;
  lastName?: string;
}
