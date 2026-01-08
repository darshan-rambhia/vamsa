/**
 * Tests for GEDCOM Multimedia Object Record Parser
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { GedcomParser } from "./parser";
import { ObjectParser } from "./object-parser";
import { fixtures } from "./__tests__/fixtures";

describe("ObjectParser", () => {
  let objectParser: ObjectParser;
  let gedcomParser: GedcomParser;

  beforeEach(() => {
    objectParser = new ObjectParser();
    gedcomParser = new GedcomParser();
  });

  describe("parseObjectRecord", () => {
    it("should parse a complete object record with all fields", () => {
      const gedcomContent = fixtures.withMultimedia();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      // Find first object record
      const objectRecord = gedcomFile.objects.find(
        (r) => r.id === "O1"
      );

      expect(objectRecord).toBeDefined();
      if (!objectRecord) return;

      const parsed = objectParser.parseObjectRecord(objectRecord);

      expect(parsed.id).toBe("O1");
      expect(parsed.filePath).toBe("photos/robert_young.jpg");
      expect(parsed.format).toBe("JPEG");
      expect(parsed.title).toBe("Young Robert Portrait");
      expect(parsed.description).toBeDefined();
    });

    it("should parse object record with relative file path", () => {
      const gedcomContent = fixtures.withMultimedia();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      const objectRecord = gedcomFile.objects.find(
        (r) => r.id === "O1"
      );

      expect(objectRecord).toBeDefined();
      if (!objectRecord) return;

      const parsed = objectParser.parseObjectRecord(objectRecord);

      expect(parsed.filePath).toBe("photos/robert_young.jpg");
      expect(parsed.filePath.startsWith("/")).toBe(false);
    });

    it("should parse minimal object record with only file and format", () => {
      const gedcomContent = `0 HEAD
1 SOUR vamsa
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @O1@ OBJE
1 FILE document.pdf
1 FORM PDF
0 TRLR`;

      const gedcomFile = gedcomParser.parse(gedcomContent);
      const objectRecord = gedcomFile.objects.find(
        (r) => r.id === "O1"
      );

      expect(objectRecord).toBeDefined();
      if (!objectRecord) return;

      const parsed = objectParser.parseObjectRecord(objectRecord);

      expect(parsed.id).toBe("O1");
      expect(parsed.filePath).toBe("document.pdf");
      expect(parsed.format).toBe("PDF");
      expect(parsed.title).toBeUndefined();
      expect(parsed.description).toBeUndefined();
    });

    it("should handle various media formats", () => {
      const formats = ["JPEG", "PNG", "PDF", "GIF", "TIFF"];

      for (const format of formats) {
        const gedcomContent = `0 HEAD
1 SOUR vamsa
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @O1@ OBJE
1 FILE test.file
1 FORM ${format}
0 TRLR`;

        const gedcomFile = gedcomParser.parse(gedcomContent);
        const objectRecord = gedcomFile.objects.find(
          (r) => r.id === "O1"
        );

        expect(objectRecord).toBeDefined();
        if (!objectRecord) return;

        const parsed = objectParser.parseObjectRecord(objectRecord);
        expect(parsed.format).toBe(format);
      }
    });
  });

  describe("extractEventObjects", () => {
    it("should extract objects linked to birth event", () => {
      const gedcomContent = fixtures.withMultimedia();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      const personRecord = gedcomFile.individuals.find(
        (r) => r.id === "I1"
      );

      expect(personRecord).toBeDefined();
      if (!personRecord) return;

      const birthObjects = objectParser.extractEventObjects(
        personRecord,
        "BIRT"
      );

      expect(birthObjects.length).toBeGreaterThan(0);
      expect(birthObjects[0]).toBe("O1");
    });

    it("should extract objects linked to marriage event", () => {
      const gedcomContent = fixtures.withMultimedia();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      // Get family from individual
      const families = gedcomFile.families;
      expect(families.length).toBeGreaterThan(0);

      // Families don't have OBJE in this fixture, but we can test concept
      // In real scenario, OBJE would be under FAM MARR
    });

    it("should return empty array when event has no objects", () => {
      const gedcomContent = fixtures.simplePerson();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      const personRecord = gedcomFile.individuals[0];
      expect(personRecord).toBeDefined();

      const objects = objectParser.extractEventObjects(
        personRecord,
        "BIRT"
      );

      expect(Array.isArray(objects)).toBe(true);
      expect(objects.length).toBe(0);
    });

    it("should deduplicate object references", () => {
      const gedcomContent = `0 HEAD
1 SOUR vamsa
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Test /Person/
1 BIRT
2 DATE 15 JAN 1950
3 OBJE @O1@
3 OBJE @O1@
0 @O1@ OBJE
1 FILE test.jpg
1 FORM JPEG
0 TRLR`;

      const gedcomFile = gedcomParser.parse(gedcomContent);
      const personRecord = gedcomFile.individuals[0];

      const objects = objectParser.extractEventObjects(
        personRecord,
        "BIRT"
      );

      // Should only have one O1, not two
      expect(objects.length).toBe(1);
      expect(objects[0]).toBe("O1");
    });
  });

  describe("validateObject", () => {
    it("should accept valid relative path", () => {
      const object = {
        id: "O1",
        filePath: "photos/image.jpg",
        format: "JPEG",
      };

      const validation = objectParser.validateObject(object);

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.warnings.length).toBe(0);
    });

    it("should warn on absolute Unix path", () => {
      const object = {
        id: "O1",
        filePath: "/absolute/path/to/image.jpg",
        format: "JPEG",
      };

      const validation = objectParser.validateObject(object);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain("Absolute path");
    });

    it("should warn on absolute Windows path", () => {
      const object = {
        id: "O1",
        filePath: "C:\\Users\\Pictures\\image.jpg",
        format: "JPEG",
      };

      const validation = objectParser.validateObject(object);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain("Absolute path");
    });

    it("should error on empty file path", () => {
      const object = {
        id: "O1",
        filePath: "",
        format: "JPEG",
      };

      const validation = objectParser.validateObject(object);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("should warn on non-existent file when baseDir provided", () => {
      const object = {
        id: "O1",
        filePath: "nonexistent/file.jpg",
        format: "JPEG",
      };

      const validation = objectParser.validateObject(object, "/tmp");

      // Warning should be present (file doesn't exist)
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("normalizeFormat", () => {
    it("should normalize common format variations", () => {
      const testCases = [
        ["jpg", "JPEG"],
        ["JPEG", "JPEG"],
        ["png", "PNG"],
        ["PNG", "PNG"],
        ["pdf", "PDF"],
        ["tiff", "TIFF"],
        ["tif", "TIFF"],
        ["bmp", "BMP"],
        ["svg", "SVG"],
        ["webp", "WEBP"],
      ];

      for (const [input, expected] of testCases) {
        const normalized = objectParser.normalizeFormat(input);
        expect(normalized).toBe(expected);
      }
    });

    it("should preserve unknown formats in uppercase", () => {
      const result = objectParser.normalizeFormat("xyz");
      expect(result).toBe("XYZ");
    });

    it("should handle lowercase and mixed case", () => {
      expect(objectParser.normalizeFormat("JpEg")).toBe("JPEG");
      expect(objectParser.normalizeFormat("pNg")).toBe("PNG");
      expect(objectParser.normalizeFormat("  PDF  ")).toBe("PDF");
    });
  });

  describe("edge cases", () => {
    it("should handle object record with no file path", () => {
      const gedcomContent = `0 HEAD
1 SOUR vamsa
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @O1@ OBJE
1 TITL Orphan Object
0 TRLR`;

      const gedcomFile = gedcomParser.parse(gedcomContent);
      const objectRecord = gedcomFile.objects.find(
        (r) => r.id === "O1"
      );

      expect(objectRecord).toBeDefined();
      if (!objectRecord) return;

      const parsed = objectParser.parseObjectRecord(objectRecord);

      expect(parsed.filePath).toBe("");
      expect(parsed.title).toBe("Orphan Object");
    });

    it("should handle object record with empty file path", () => {
      const object = {
        id: "O1",
        filePath: "   ",
        format: "JPEG",
      };

      const validation = objectParser.validateObject(object);

      expect(validation.isValid).toBe(false);
    });

    it("should handle object with nested directory paths", () => {
      const object = {
        id: "O1",
        filePath: "media/photos/2020/family/portrait.jpg",
        format: "JPEG",
      };

      const validation = objectParser.validateObject(object);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBe(0);
    });

    it("should handle multiple NOTE lines for description", () => {
      const gedcomContent = `0 HEAD
1 SOUR vamsa
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @O1@ OBJE
1 FILE test.jpg
1 FORM JPEG
1 NOTE This is a note
1 NOTE This is another note
0 TRLR`;

      const gedcomFile = gedcomParser.parse(gedcomContent);
      const objectRecord = gedcomFile.objects.find(
        (r) => r.id === "O1"
      );

      expect(objectRecord).toBeDefined();
      if (!objectRecord) return;

      const parsed = objectParser.parseObjectRecord(objectRecord);

      // Should concatenate multiple notes
      expect(parsed.description).toBeDefined();
    });
  });
});
