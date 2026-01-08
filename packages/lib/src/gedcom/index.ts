/**
 * GEDCOM 5.5.1 and 7.0 Support
 * Industry standard genealogy format for family tree data exchange
 */

export { GedcomParser } from "./parser";
export { GedcomGenerator, type GeneratorOptions } from "./generator";
export {
  GedcomMapper,
  type MappingResult,
  type MappingError,
  type VamsaPerson,
  type VamsaRelationship,
  type GedcomIndividualData,
  type GedcomFamilyData,
  type MapOptions,
} from "./mapper";
export { detectEncoding, normalizeEncoding, anselToUtf8, utf8ToAnsel } from "./encoding";
export type {
  GedcomLine,
  GedcomRecord,
  GedcomFile,
  ParsedIndividual,
  ParsedFamily,
  ParsedDate,
  ValidationError,
} from "./types";
