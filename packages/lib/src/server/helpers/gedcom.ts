/**
 * GEDCOM Helpers
 *
 * Pure parsing, validation, and mapping functions for GEDCOM operations.
 * No dependencies on server context, database, or authentication.
 * All functions are deterministic and can be tested independently.
 */

import {
  GedcomParser,
  GedcomMapper,
  GedcomGenerator,
  type VamsaPerson,
  type VamsaRelationship,
  type GeneratorOptions,
  type GedcomFile,
  type MappingResult,
} from "@vamsa/lib";

/**
 * GEDCOM structure validation error
 */
export interface GedcomStructureError {
  message: string;
  type: "validation_error" | "mapping_error";
}

/**
 * GEDCOM file validation result
 */
export interface GedcomValidationResult {
  valid: boolean;
  errors: GedcomStructureError[];
  preview?: {
    peopleCount: number;
    familiesCount: number;
  };
}

/**
 * Parse GEDCOM file content and return the parsed structure.
 *
 * @param fileContent - Raw GEDCOM file content
 * @returns Parsed GEDCOM file structure
 * @throws Error if parsing fails
 *
 * @example
 * const gedcomFile = parseGedcomFile(fileContent);
 * console.log(gedcomFile.individuals.length); // Number of individuals
 */
export function parseGedcomFile(fileContent: string): GedcomFile {
  const parser = new GedcomParser();
  return parser.parse(fileContent);
}

/**
 * Validate parsed GEDCOM structure for structural and semantic errors.
 *
 * Returns a validation result with error details and preview counts.
 * Does not write to any external system.
 *
 * @param gedcomFile - Parsed GEDCOM file structure
 * @returns Validation result with errors and preview data
 *
 * @example
 * const result = validateGedcomStructure(gedcomFile);
 * if (!result.valid) {
 *   console.log("Validation errors:", result.errors);
 * }
 */
export function validateGedcomStructure(
  gedcomFile: GedcomFile
): GedcomValidationResult {
  const parser = new GedcomParser();

  // Validate structure
  const validationErrors = parser.validate(gedcomFile);

  // Map to get preview counts
  const mapper = new GedcomMapper();
  const mapped = mapper.mapFromGedcom(gedcomFile);

  // Combine errors
  const validationErrorsFormatted: GedcomStructureError[] =
    validationErrors.map((e) => ({
      message: e.message,
      type: (e.severity === "error" ? "validation_error" : "mapping_error") as
        | "validation_error"
        | "mapping_error",
    }));

  const mappingErrorsFormatted: GedcomStructureError[] = mapped.errors.map(
    (e) => ({
      message: e.message,
      type: "mapping_error" as const,
    })
  );

  const allErrors: GedcomStructureError[] = [
    ...validationErrorsFormatted,
    ...mappingErrorsFormatted,
  ];

  // Count families (spouse relationships)
  const familiesCount = Math.round(
    mapped.relationships.filter((r) => r.type === "SPOUSE").length / 2
  );

  const isValid = validationErrors.every((e) => e.severity !== "error");

  return {
    valid: isValid,
    errors: allErrors,
    preview: {
      peopleCount: mapped.people.length,
      familiesCount,
    },
  };
}

/**
 * Validate GEDCOM structure for critical errors before import.
 *
 * Returns early if there are critical mapping errors that would
 * prevent successful import.
 *
 * @param gedcomFile - Parsed GEDCOM file structure
 * @returns Validation result with critical errors
 *
 * @example
 * const validation = validateGedcomImportPrerequisites(gedcomFile);
 * if (!validation.valid) {
 *   throw new Error("Cannot import: " + validation.errors[0].message);
 * }
 */
export function validateGedcomImportPrerequisites(
  gedcomFile: GedcomFile
): GedcomValidationResult {
  const parser = new GedcomParser();
  const mapper = new GedcomMapper();

  // Validate structure
  const validationErrors = parser.validate(gedcomFile);

  // Check for structural errors
  if (validationErrors.some((e) => e.severity === "error")) {
    return {
      valid: false,
      errors: validationErrors.map((e) => ({
        message: e.message,
        type: "validation_error" as const,
      })),
    };
  }

  // Map to check for critical mapping errors
  const mapped = mapper.mapFromGedcom(gedcomFile);

  // Check for critical errors
  const criticalErrors = mapped.errors.filter(
    (e) => e.type === "broken_reference" || e.type === "invalid_format"
  );

  if (criticalErrors.length > 0) {
    return {
      valid: false,
      errors: criticalErrors.map((e) => ({
        message: e.message,
        type: "mapping_error" as const,
      })),
    };
  }

  return {
    valid: true,
    errors: [],
  };
}

/**
 * Map parsed GEDCOM data to Vamsa persons and relationships.
 *
 * Returns both the mapped data and any warnings encountered during mapping.
 *
 * @param gedcomFile - Parsed GEDCOM file structure
 * @returns Mapping result with persons, relationships, and warnings
 *
 * @example
 * const { people, relationships, errors } = mapGedcomToEntities(gedcomFile);
 * console.log(`Mapped ${people.length} people with ${errors.length} warnings`);
 */
export function mapGedcomToEntities(gedcomFile: GedcomFile): MappingResult {
  const mapper = new GedcomMapper();
  return mapper.mapFromGedcom(gedcomFile);
}

/**
 * Generate GEDCOM output from persons and relationships.
 *
 * Converts Vamsa data back to GEDCOM format for export.
 *
 * @param people - Array of Vamsa persons
 * @param relationships - Array of Vamsa relationships
 * @param options - Generator options (source program, submitter name, etc.)
 * @returns GEDCOM formatted text content
 *
 * @example
 * const gedcomContent = generateGedcomOutput(people, relationships, {
 *   sourceProgram: "vamsa",
 *   submitterName: "Jane Doe",
 * });
 */
export function generateGedcomOutput(
  people: VamsaPerson[],
  relationships: VamsaRelationship[],
  options: GeneratorOptions
): string {
  const mapper = new GedcomMapper();
  const { individuals, families } = mapper.mapToGedcom(people, relationships);

  const generator = new GedcomGenerator(options);
  return generator.generate(individuals, families);
}

/**
 * Format GEDCOM file name with current date.
 *
 * @returns GEDCOM file name in format: family-tree-YYYY-MM-DD.ged
 *
 * @example
 * const fileName = formatGedcomFileName();
 * console.log(fileName); // family-tree-2025-01-15.ged
 */
export function formatGedcomFileName(): string {
  return `family-tree-${new Date().toISOString().split("T")[0]}.ged`;
}

/**
 * Calculate basic statistics from mapping result.
 *
 * @param mapped - Mapping result from mapGedcomToEntities
 * @returns Statistics object with counts
 */
export function calculateGedcomStatistics(mapped: MappingResult): {
  peopleCount: number;
  relationshipCount: number;
  spousalRelationships: number;
  warningCount: number;
  errorCount: number;
} {
  const spousalRelationships = mapped.relationships.filter(
    (r) => r.type === "SPOUSE"
  ).length;

  return {
    peopleCount: mapped.people.length,
    relationshipCount: mapped.relationships.length,
    spousalRelationships,
    warningCount: mapped.warnings.length,
    errorCount: mapped.errors.length,
  };
}
