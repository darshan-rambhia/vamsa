/**
 * Unit Tests for GEDCOM Generator
 * Tests generation of GEDCOM 5.5.1 and 7.0 format files
 */
import { describe, test, expect, beforeEach } from "bun:test";
import { GedcomGenerator } from "./generator";
import type { GedcomIndividualData, GedcomFamilyData } from "./mapper-types";

describe("GedcomGenerator", () => {
  let generator: GedcomGenerator;

  beforeEach(() => {
    generator = new GedcomGenerator({
      sourceProgram: "TestApp",
      submitterName: "Test User",
    });
  });

  describe("generate", () => {
    test("generates valid GEDCOM structure", () => {
      const individuals: GedcomIndividualData[] = [];
      const families: GedcomFamilyData[] = [];

      const result = generator.generate(individuals, families);

      // Check header
      expect(result).toContain("0 HEAD");
      expect(result).toContain("1 SOUR TestApp");
      expect(result).toContain("2 NAME TestApp");
      expect(result).toContain("1 GEDC");
      expect(result).toContain("2 VERS 5.5.1");
      expect(result).toContain("1 CHAR UTF-8");
      expect(result).toContain("1 SUBM @SUBM1@");

      // Check submitter
      expect(result).toContain("0 @SUBM1@ SUBM");
      expect(result).toContain("1 NAME Test User");

      // Check trailer
      expect(result).toContain("0 TRLR");
    });

    test("generates header date in 5.5.1 format", () => {
      const result = generator.generate([], []);

      // Should have date in format "DD MMM YYYY"
      const dateMatch = result.match(/1 DATE (\d{1,2}) ([A-Z]{3}) (\d{4})/);
      expect(dateMatch).not.toBeNull();
    });

    test("generates header date in 7.0 ISO format", () => {
      const generator70 = new GedcomGenerator({
        sourceProgram: "TestApp",
        version: "7.0",
      });

      const result = generator70.generate([], []);

      // Should have date in ISO format "YYYY-MM-DD"
      const dateMatch = result.match(/1 DATE (\d{4}-\d{2}-\d{2})/);
      expect(dateMatch).not.toBeNull();
    });

    test("generates individual records", () => {
      const individuals: GedcomIndividualData[] = [
        {
          xref: "@I1@",
          name: "John /Doe/",
          sex: "M",
          birthDate: "1985-01-15",
          birthPlace: "New York, USA",
          deathDate: "2050-12-20",
          deathPlace: "Los Angeles, USA",
          occupation: "Software Engineer",
          notes: ["A note about John"],
          familiesAsSpouse: ["@F1@"],
          familiesAsChild: [],
        },
      ];

      const result = generator.generate(individuals, []);

      expect(result).toContain("0 @I1@ INDI");
      expect(result).toContain("1 NAME John /Doe/");
      expect(result).toContain("1 SEX M");
      expect(result).toContain("1 BIRT");
      expect(result).toContain("2 DATE 15 JAN 1985");
      expect(result).toContain("2 PLAC New York, USA");
      expect(result).toContain("1 DEAT");
      expect(result).toContain("2 DATE 20 DEC 2050");
      expect(result).toContain("2 PLAC Los Angeles, USA");
      expect(result).toContain("1 OCCU Software Engineer");
      expect(result).toContain("1 NOTE A note about John");
      expect(result).toContain("1 FAMS @F1@");
    });

    test("generates family records", () => {
      const families: GedcomFamilyData[] = [
        {
          xref: "@F1@",
          husband: "@I1@",
          wife: "@I2@",
          children: ["@I3@", "@I4@"],
          marriageDate: "2010-06-10",
          marriagePlace: "Las Vegas, USA",
          divorceDate: "2020-01-01",
          notes: ["Family note"],
        },
      ];

      const result = generator.generate([], families);

      expect(result).toContain("0 @F1@ FAM");
      expect(result).toContain("1 HUSB @I1@");
      expect(result).toContain("1 WIFE @I2@");
      expect(result).toContain("1 CHIL @I3@");
      expect(result).toContain("1 CHIL @I4@");
      expect(result).toContain("1 MARR");
      expect(result).toContain("2 DATE 10 JUN 2010");
      expect(result).toContain("2 PLAC Las Vegas, USA");
      expect(result).toContain("1 DIV");
      expect(result).toContain("2 DATE 1 JAN 2020");
      expect(result).toContain("1 NOTE Family note");
    });

    test("handles individual without optional fields", () => {
      const individuals: GedcomIndividualData[] = [
        {
          xref: "@I1@",
          name: "Unknown //",
          notes: [],
          familiesAsSpouse: [],
          familiesAsChild: [],
        },
      ];

      const result = generator.generate(individuals, []);

      expect(result).toContain("0 @I1@ INDI");
      expect(result).toContain("1 NAME Unknown //");
      expect(result).not.toContain("1 SEX");
      expect(result).not.toContain("1 BIRT");
      expect(result).not.toContain("1 DEAT");
      expect(result).not.toContain("1 OCCU");
    });

    test("handles family without optional fields", () => {
      const families: GedcomFamilyData[] = [
        {
          xref: "@F1@",
          children: [],
          notes: [],
        },
      ];

      const result = generator.generate([], families);

      expect(result).toContain("0 @F1@ FAM");
      expect(result).not.toContain("1 HUSB");
      expect(result).not.toContain("1 WIFE");
      expect(result).not.toContain("1 CHIL");
      expect(result).not.toContain("1 MARR");
    });

    test("handles multiple individuals and families", () => {
      const individuals: GedcomIndividualData[] = [
        { xref: "@I1@", name: "John /Doe/", sex: "M", notes: [], familiesAsSpouse: [], familiesAsChild: [] },
        { xref: "@I2@", name: "Jane /Doe/", sex: "F", notes: [], familiesAsSpouse: [], familiesAsChild: [] },
        { xref: "@I3@", name: "Baby /Doe/", notes: [], familiesAsSpouse: [], familiesAsChild: [] },
      ];

      const families: GedcomFamilyData[] = [
        { xref: "@F1@", husband: "@I1@", wife: "@I2@", children: ["@I3@"], notes: [] },
      ];

      const result = generator.generate(individuals, families);

      expect(result).toContain("0 @I1@ INDI");
      expect(result).toContain("0 @I2@ INDI");
      expect(result).toContain("0 @I3@ INDI");
      expect(result).toContain("0 @F1@ FAM");
    });
  });

  describe("date formatting", () => {
    test("formats full date in 5.5.1 format", () => {
      const individuals: GedcomIndividualData[] = [
        { xref: "@I1@", name: "Test //", birthDate: "1985-01-15", notes: [], familiesAsSpouse: [], familiesAsChild: [] },
      ];

      const result = generator.generate(individuals, []);
      expect(result).toContain("2 DATE 15 JAN 1985");
    });

    test("formats month-year date", () => {
      const individuals: GedcomIndividualData[] = [
        { xref: "@I1@", name: "Test //", birthDate: "1985-01", notes: [], familiesAsSpouse: [], familiesAsChild: [] },
      ];

      const result = generator.generate(individuals, []);
      expect(result).toContain("2 DATE JAN 1985");
    });

    test("formats year-only date", () => {
      const individuals: GedcomIndividualData[] = [
        { xref: "@I1@", name: "Test //", birthDate: "1985", notes: [], familiesAsSpouse: [], familiesAsChild: [] },
      ];

      const result = generator.generate(individuals, []);
      expect(result).toContain("2 DATE 1985");
    });

    test("formats date in 7.0 ISO format", () => {
      const generator70 = new GedcomGenerator({
        sourceProgram: "TestApp",
        version: "7.0",
      });

      const individuals: GedcomIndividualData[] = [
        { xref: "@I1@", name: "Test //", birthDate: "1985-01-15", notes: [], familiesAsSpouse: [], familiesAsChild: [] },
      ];

      const result = generator70.generate(individuals, []);
      expect(result).toContain("2 DATE 1985-01-15");
    });

    test("handles empty date", () => {
      const individuals: GedcomIndividualData[] = [
        { xref: "@I1@", name: "Test //", birthDate: "", notes: [], familiesAsSpouse: [], familiesAsChild: [] },
      ];

      const result = generator.generate(individuals, []);
      // Should not have DATE line for empty date
      expect(result).not.toMatch(/2 DATE\s*$/m);
    });
  });

  describe("long line handling", () => {
    test("handles long notes with CONT continuation", () => {
      const longNote = "This is a very long note that should exceed the maximum line length and require continuation. ".repeat(5);
      const individuals: GedcomIndividualData[] = [
        { xref: "@I1@", name: "Test //", notes: [longNote], familiesAsSpouse: [], familiesAsChild: [] },
      ];

      const result = generator.generate(individuals, []);
      expect(result).toContain("1 NOTE");
      expect(result).toContain("2 CONT");
    });

    test("respects max line length", () => {
      const generator80 = new GedcomGenerator({
        sourceProgram: "TestApp",
        maxLineLength: 80,
      });

      const longNote = "A".repeat(200);
      const individuals: GedcomIndividualData[] = [
        { xref: "@I1@", name: "Test //", notes: [longNote], familiesAsSpouse: [], familiesAsChild: [] },
      ];

      const result = generator80.generate(individuals, []);
      const lines = result.split("\n");

      // No line should exceed max length
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(80);
      }
    });
  });

  describe("generateSource", () => {
    test("generates source record", () => {
      const source = {
        xref: "@S1@",
        title: "Test Source",
        author: "John Author",
        publicationDate: "2020",
        repository: "Test Repository",
        notes: "Source notes",
      };

      const result = generator.generateSource(source);

      expect(result).toContain("0 @S1@ SOUR");
      expect(result).toContain("1 TITL Test Source");
      expect(result).toContain("1 AUTH John Author");
      expect(result).toContain("1 PUBL 2020");
      expect(result).toContain("1 REPO Test Repository");
      expect(result).toContain("1 NOTE Source notes");
    });

    test("handles source without optional fields", () => {
      const source = {
        xref: "@S1@",
        title: "Test Source",
      };

      const result = generator.generateSource(source);

      expect(result).toContain("0 @S1@ SOUR");
      expect(result).toContain("1 TITL Test Source");
      expect(result).not.toContain("1 AUTH");
      expect(result).not.toContain("1 PUBL");
      expect(result).not.toContain("1 REPO");
    });
  });

  describe("generateObject", () => {
    test("generates object/multimedia record", () => {
      const object = {
        xref: "@O1@",
        filePath: "/path/to/file.jpg",
        format: "JPEG",
        title: "Photo Title",
        description: "Photo description",
      };

      const result = generator.generateObject(object);

      expect(result).toContain("0 @O1@ OBJE");
      expect(result).toContain("1 FILE /path/to/file.jpg");
      expect(result).toContain("1 FORM JPEG");
      expect(result).toContain("1 TITL Photo Title");
      expect(result).toContain("1 NOTE Photo description");
    });

    test("handles object without optional fields", () => {
      const object = {
        xref: "@O1@",
        filePath: "/path/to/file.jpg",
      };

      const result = generator.generateObject(object);

      expect(result).toContain("0 @O1@ OBJE");
      expect(result).toContain("1 FILE /path/to/file.jpg");
      expect(result).not.toContain("1 FORM");
      expect(result).not.toContain("1 TITL");
    });
  });
});
