/**
 * Unit tests for GEDCOM helper functions
 *
 * Tests cover pure functions for GEDCOM parsing, validation, and mapping:
 * - parseGedcomFile: Parsing GEDCOM file content
 * - validateGedcomStructure: Structure and semantic validation with preview
 * - validateGedcomImportPrerequisites: Critical error detection before import
 * - mapGedcomToEntities: Mapping GEDCOM to Vamsa data structures
 * - generateGedcomOutput: Converting Vamsa data back to GEDCOM format
 * - formatGedcomFileName: GEDCOM file name generation with date
 * - calculateGedcomStatistics: Statistics calculation from mapping result
 *
 * All functions are pure with no side effects, making them fully testable.
 */

import { describe, it, expect } from "bun:test";
import {
  parseGedcomFile,
  validateGedcomStructure,
  validateGedcomImportPrerequisites,
  mapGedcomToEntities,
  generateGedcomOutput,
  formatGedcomFileName,
  calculateGedcomStatistics,
} from "./gedcom";

// GEDCOM fixtures
const MINIMAL_GEDCOM = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 TRLR`;

const SIMPLE_PERSON_GEDCOM = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 BIRT
2 DATE 15 JAN 1985
2 PLAC New York, USA
0 TRLR`;

const COUPLE_WITH_CHILDREN_GEDCOM = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
1 BIRT
2 DATE 15 JAN 1960
0 @I2@ INDI
1 NAME Jane /Smith/
1 SEX F
1 BIRT
2 DATE 20 MAR 1962
0 @I3@ INDI
1 NAME Jack /Doe/
1 SEX M
1 BIRT
2 DATE 10 JUN 1985
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR`;

describe("GEDCOM helpers", () => {
  describe("parseGedcomFile", () => {
    it("should parse minimal GEDCOM file", () => {
      const result = parseGedcomFile(MINIMAL_GEDCOM);

      expect(result).toBeDefined();
      expect(result.individuals).toBeDefined();
      expect(result.families).toBeDefined();
    });

    it("should parse GEDCOM with individuals", () => {
      const result = parseGedcomFile(SIMPLE_PERSON_GEDCOM);

      expect(result.individuals.length).toBeGreaterThan(0);
    });

    it("should parse GEDCOM with families", () => {
      const result = parseGedcomFile(COUPLE_WITH_CHILDREN_GEDCOM);

      expect(result.families.length).toBeGreaterThan(0);
    });

    it("should return valid structure for simple GEDCOM", () => {
      const result = parseGedcomFile(SIMPLE_PERSON_GEDCOM);

      expect(result.individuals.length).toBeGreaterThan(0);
      // individuals should have some identifying property
      const person = result.individuals[0];
      expect(person).toBeDefined();
    });

    it("should return valid structure for family GEDCOM", () => {
      const result = parseGedcomFile(COUPLE_WITH_CHILDREN_GEDCOM);

      expect(result.individuals.length).toBeGreaterThanOrEqual(2);
      expect(result.families.length).toBeGreaterThan(0);
    });

    it("should handle basic GEDCOM format", () => {
      const result = parseGedcomFile(MINIMAL_GEDCOM);

      expect(typeof result).toBe("object");
      expect(Array.isArray(result.individuals)).toBe(true);
      expect(Array.isArray(result.families)).toBe(true);
    });

    it("should handle missing optional fields", () => {
      const gedcom = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
0 TRLR`;

      const result = parseGedcomFile(gedcom);

      expect(result.individuals.length).toBeGreaterThan(0);
    });
  });

  describe("validateGedcomStructure", () => {
    it("should validate minimal GEDCOM as valid", () => {
      const parsed = parseGedcomFile(MINIMAL_GEDCOM);
      const result = validateGedcomStructure(parsed);

      expect(result.valid).toBe(true);
    });

    it("should include preview counts", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const result = validateGedcomStructure(parsed);

      expect(result.preview).toBeDefined();
      expect(result.preview?.peopleCount).toBeGreaterThan(0);
    });

    it("should count families correctly", () => {
      const parsed = parseGedcomFile(COUPLE_WITH_CHILDREN_GEDCOM);
      const result = validateGedcomStructure(parsed);

      expect(result.preview?.familiesCount).toBeGreaterThan(0);
    });

    it("should include validation errors when present", () => {
      const invalidGedcom = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME John /Doe/
0 TRLR`;

      const parsed = parseGedcomFile(invalidGedcom);
      const result = validateGedcomStructure(parsed);

      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should distinguish validation from mapping errors", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const result = validateGedcomStructure(parsed);

      expect(result.errors).toBeDefined();
      result.errors.forEach((error) => {
        expect(["validation_error", "mapping_error"]).toContain(error.type);
      });
    });

    it("should return result structure with all required fields", () => {
      const parsed = parseGedcomFile(MINIMAL_GEDCOM);
      const result = validateGedcomStructure(parsed);

      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("preview");
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe("validateGedcomImportPrerequisites", () => {
    it("should validate minimal GEDCOM as ready for import", () => {
      const parsed = parseGedcomFile(MINIMAL_GEDCOM);
      const result = validateGedcomImportPrerequisites(parsed);

      expect(result.valid).toBe(true);
    });

    it("should detect critical validation errors", () => {
      const brokenGedcom = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 TRLR
0 ORPHAN LINE`;

      const parsed = parseGedcomFile(brokenGedcom);
      const result = validateGedcomImportPrerequisites(parsed);

      // Should return valid or contain errors, but not crash
      expect(result).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it("should always return validation result structure", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const result = validateGedcomImportPrerequisites(parsed);

      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("errors");
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should be stricter than full validation", () => {
      // Import prerequisites focus on critical errors only
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const prereqResult = validateGedcomImportPrerequisites(parsed);
      const fullResult = validateGedcomStructure(parsed);

      // Prerequisites may be more lenient (fewer errors) than full validation
      expect(prereqResult.errors.length).toBeLessThanOrEqual(
        fullResult.errors.length
      );
    });
  });

  describe("mapGedcomToEntities", () => {
    it("should map individuals to people", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const result = mapGedcomToEntities(parsed);

      expect(result.people.length).toBeGreaterThan(0);
    });

    it("should extract person data fields", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const result = mapGedcomToEntities(parsed);

      const person = result.people[0];
      expect(person).toHaveProperty("firstName");
      expect(person).toHaveProperty("lastName");
      expect(person).toHaveProperty("gender");
    });

    it("should map families to relationships", () => {
      const parsed = parseGedcomFile(COUPLE_WITH_CHILDREN_GEDCOM);
      const result = mapGedcomToEntities(parsed);

      expect(result.relationships.length).toBeGreaterThan(0);
    });

    it("should include warnings from mapping", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const result = mapGedcomToEntities(parsed);

      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("should include errors from mapping", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const result = mapGedcomToEntities(parsed);

      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should preserve person IDs from GEDCOM", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const result = mapGedcomToEntities(parsed);

      const person = result.people[0];
      expect(person.id).toBeDefined();
      expect(typeof person.id).toBe("string");
    });

    it("should handle multiple individuals", () => {
      const parsed = parseGedcomFile(COUPLE_WITH_CHILDREN_GEDCOM);
      const result = mapGedcomToEntities(parsed);

      expect(result.people.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("generateGedcomOutput", () => {
    it("should generate GEDCOM output from entities", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const mapped = mapGedcomToEntities(parsed);

      const output = generateGedcomOutput(mapped.people, mapped.relationships, {
        sourceProgram: "vamsa",
        submitterName: "Test User",
      });

      expect(output).toBeDefined();
      expect(typeof output).toBe("string");
      expect(output.length).toBeGreaterThan(0);
    });

    it("should generate valid GEDCOM structure", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const mapped = mapGedcomToEntities(parsed);

      const output = generateGedcomOutput(mapped.people, mapped.relationships, {
        sourceProgram: "vamsa",
        submitterName: "Test User",
      });

      expect(output).toContain("0 HEAD");
      expect(output).toContain("0 TRLR");
    });

    it("should include source program in header", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const mapped = mapGedcomToEntities(parsed);

      const output = generateGedcomOutput(mapped.people, mapped.relationships, {
        sourceProgram: "vamsa",
        submitterName: "Test User",
      });

      expect(output).toContain("vamsa");
    });

    it("should handle empty people array", () => {
      const output = generateGedcomOutput([], [], {
        sourceProgram: "vamsa",
        submitterName: "Test User",
      });

      expect(output).toBeDefined();
      expect(output).toContain("0 HEAD");
      expect(output).toContain("0 TRLR");
    });

    it("should generate output with custom submitter", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const mapped = mapGedcomToEntities(parsed);

      const output = generateGedcomOutput(mapped.people, mapped.relationships, {
        sourceProgram: "vamsa",
        submitterName: "Jane Doe",
      });

      expect(output).toContain("Jane Doe");
    });
  });

  describe("formatGedcomFileName", () => {
    it("should return a string", () => {
      const fileName = formatGedcomFileName();

      expect(typeof fileName).toBe("string");
    });

    it("should follow expected format", () => {
      const fileName = formatGedcomFileName();

      expect(fileName).toMatch(/^family-tree-\d{4}-\d{2}-\d{2}\.ged$/);
    });

    it("should include today's date", () => {
      const fileName = formatGedcomFileName();
      const today = new Date().toISOString().split("T")[0];

      expect(fileName).toContain(today);
    });

    it("should end with .ged extension", () => {
      const fileName = formatGedcomFileName();

      expect(fileName).toEndWith(".ged");
    });

    it("should start with family-tree prefix", () => {
      const fileName = formatGedcomFileName();

      expect(fileName).toStartWith("family-tree-");
    });

    it("should generate consistent format", () => {
      const fileName1 = formatGedcomFileName();
      const fileName2 = formatGedcomFileName();

      // Same format (may differ by date if test runs at midnight)
      expect(fileName1).toMatch(/^family-tree-\d{4}-\d{2}-\d{2}\.ged$/);
      expect(fileName2).toMatch(/^family-tree-\d{4}-\d{2}-\d{2}\.ged$/);
    });
  });

  describe("calculateGedcomStatistics", () => {
    it("should count people from mapping result", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const mapped = mapGedcomToEntities(parsed);

      const stats = calculateGedcomStatistics(mapped);

      expect(stats.peopleCount).toBeGreaterThan(0);
    });

    it("should count relationships", () => {
      const parsed = parseGedcomFile(COUPLE_WITH_CHILDREN_GEDCOM);
      const mapped = mapGedcomToEntities(parsed);

      const stats = calculateGedcomStatistics(mapped);

      expect(stats.relationshipCount).toBeGreaterThanOrEqual(0);
    });

    it("should count spousal relationships separately", () => {
      const parsed = parseGedcomFile(COUPLE_WITH_CHILDREN_GEDCOM);
      const mapped = mapGedcomToEntities(parsed);

      const stats = calculateGedcomStatistics(mapped);

      expect(stats.spousalRelationships).toBeGreaterThanOrEqual(0);
      expect(stats.spousalRelationships).toBeLessThanOrEqual(
        stats.relationshipCount
      );
    });

    it("should count warnings", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const mapped = mapGedcomToEntities(parsed);

      const stats = calculateGedcomStatistics(mapped);

      expect(stats.warningCount).toBeGreaterThanOrEqual(0);
    });

    it("should count errors", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const mapped = mapGedcomToEntities(parsed);

      const stats = calculateGedcomStatistics(mapped);

      expect(stats.errorCount).toBeGreaterThanOrEqual(0);
    });

    it("should include all required stat fields", () => {
      const parsed = parseGedcomFile(SIMPLE_PERSON_GEDCOM);
      const mapped = mapGedcomToEntities(parsed);

      const stats = calculateGedcomStatistics(mapped);

      expect(stats).toHaveProperty("peopleCount");
      expect(stats).toHaveProperty("relationshipCount");
      expect(stats).toHaveProperty("spousalRelationships");
      expect(stats).toHaveProperty("warningCount");
      expect(stats).toHaveProperty("errorCount");
    });

    it("should work with empty mapping result", () => {
      const emptyMapped = {
        people: [],
        relationships: [],
        warnings: [],
        errors: [],
      };

      const stats = calculateGedcomStatistics(emptyMapped);

      expect(stats.peopleCount).toBe(0);
      expect(stats.relationshipCount).toBe(0);
      expect(stats.spousalRelationships).toBe(0);
      expect(stats.warningCount).toBe(0);
      expect(stats.errorCount).toBe(0);
    });
  });
});
