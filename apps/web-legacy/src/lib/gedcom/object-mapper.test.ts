/**
 * Tests for GEDCOM Multimedia Object Mapper
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { ObjectMapper } from "./object-mapper";
import { ObjectParser } from "./object-parser";
import { GedcomParser } from "./parser";
import { fixtures } from "./__tests__/fixtures";

describe("ObjectMapper", () => {
  let objectMapper: ObjectMapper;
  let objectParser: ObjectParser;
  let gedcomParser: GedcomParser;

  beforeEach(() => {
    objectMapper = new ObjectMapper();
    objectParser = new ObjectParser();
    gedcomParser = new GedcomParser();
  });

  describe("mapToVamsa", () => {
    it("should map parsed object to Vamsa format", () => {
      const gedcomContent = fixtures.withMultimedia();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      const objectRecord = gedcomFile.objects.find((r) => r.id === "O1");

      expect(objectRecord).toBeDefined();
      if (!objectRecord) return;

      const parsedObject = objectParser.parseObjectRecord(objectRecord);
      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      expect(vamsaObject.filePath).toBe("photos/robert_young.jpg");
      expect(vamsaObject.format).toBe("JPEG");
      expect(vamsaObject.title).toBe("Young Robert Portrait");
      expect(vamsaObject.description).toBeDefined();
    });

    it("should preserve all object metadata", () => {
      const parsedObject = {
        id: "test-id",
        filePath: "documents/file.pdf",
        format: "PDF",
        title: "Test Document",
        description: "Test Description",
      };

      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      expect(vamsaObject.filePath).toBe("documents/file.pdf");
      expect(vamsaObject.format).toBe("PDF");
      expect(vamsaObject.title).toBe("Test Document");
      expect(vamsaObject.description).toBe("Test Description");
    });

    it("should handle optional fields as undefined", () => {
      const parsedObject = {
        id: "test-id",
        filePath: "image.jpg",
        format: "JPEG",
      };

      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      expect(vamsaObject.filePath).toBe("image.jpg");
      expect(vamsaObject.format).toBe("JPEG");
      expect(vamsaObject.title).toBeUndefined();
      expect(vamsaObject.description).toBeUndefined();
    });

    it("should assign provided Vamsa ID", () => {
      const parsedObject = {
        id: "gedcom-id",
        filePath: "image.jpg",
        format: "JPEG",
      };

      const vamsaId = "vamsa-cuid-789";
      const vamsaObject = objectMapper.mapToVamsa(parsedObject, vamsaId);

      expect(vamsaObject.id).toBe(vamsaId);
    });

    it("should preserve relative file paths", () => {
      const parsedObject = {
        id: "test-id",
        filePath: "media/photos/2024/family.jpg",
        format: "JPEG",
      };

      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      expect(vamsaObject.filePath).toBe("media/photos/2024/family.jpg");
    });

    it("should preserve absolute file paths unchanged", () => {
      const parsedObject = {
        id: "test-id",
        filePath: "/absolute/path/to/file.jpg",
        format: "JPEG",
      };

      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      expect(vamsaObject.filePath).toBe("/absolute/path/to/file.jpg");
    });
  });

  describe("createEventMediaLink", () => {
    it("should create event-media link with correct fields", () => {
      const link = objectMapper.createEventMediaLink(
        "media-123",
        "person-456",
        "BIRT"
      );

      expect(link.mediaId).toBe("media-123");
      expect(link.personId).toBe("person-456");
      expect(link.eventType).toBe("BIRT");
    });

    it("should support various event types", () => {
      const eventTypes = [
        "BIRT",
        "DEAT",
        "MARR",
        "DIV",
        "BURI",
        "GRAD",
        "PHOT",
      ];

      for (const eventType of eventTypes) {
        const link = objectMapper.createEventMediaLink(
          "media-id",
          "person-id",
          eventType
        );

        expect(link.eventType).toBe(eventType);
      }
    });

    it("should allow custom event types", () => {
      const link = objectMapper.createEventMediaLink(
        "media-id",
        "person-id",
        "CUSTOM_EVENT"
      );

      expect(link.eventType).toBe("CUSTOM_EVENT");
    });
  });

  describe("roundtrip conversion", () => {
    it("should convert from GEDCOM through Vamsa and back", () => {
      const gedcomContent = fixtures.withMultimedia();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      const objectRecord = gedcomFile.objects.find((r) => r.id === "O1");

      expect(objectRecord).toBeDefined();
      if (!objectRecord) return;

      // Parse GEDCOM -> ParsedObject
      const parsedObject = objectParser.parseObjectRecord(objectRecord);

      // Map to Vamsa
      const vamsaObject = objectMapper.mapToVamsa(parsedObject, "vamsa-id-999");

      // Verify data integrity
      expect(vamsaObject.filePath).toBe(parsedObject.filePath);
      expect(vamsaObject.format).toBe(parsedObject.format);
      expect(vamsaObject.title).toBe(parsedObject.title);
    });
  });

  describe("format handling", () => {
    it("should preserve format exactly as parsed", () => {
      const formats = ["JPEG", "PNG", "PDF", "TIFF", "GIF", "BMP"];

      for (const format of formats) {
        const parsedObject = {
          id: "test-id",
          filePath: "test.file",
          format,
        };

        const vamsaObject = objectMapper.mapToVamsa(parsedObject);
        expect(vamsaObject.format).toBe(format);
      }
    });

    it("should preserve case of format string", () => {
      const parsedObject = {
        id: "test-id",
        filePath: "test.file",
        format: "JpEg",
      };

      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      // Format should be preserved as-is from parsed object
      expect(vamsaObject.format).toBe("JpEg");
    });
  });

  describe("edge cases", () => {
    it("should handle file paths with special characters", () => {
      const parsedObject = {
        id: "test-id",
        filePath: "media/family (2024) & friends.jpg",
        format: "JPEG",
      };

      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      expect(vamsaObject.filePath).toBe("media/family (2024) & friends.jpg");
    });

    it("should handle titles with special characters", () => {
      const parsedObject = {
        id: "test-id",
        filePath: "image.jpg",
        format: "JPEG",
        title: "Family Portrait @ 1985 (Smith & Co.)",
      };

      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      expect(vamsaObject.title).toBe("Family Portrait @ 1985 (Smith & Co.)");
    });

    it("should handle descriptions with newlines", () => {
      const parsedObject = {
        id: "test-id",
        filePath: "image.jpg",
        format: "JPEG",
        description: "Line 1\nLine 2\nLine 3",
      };

      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      expect(vamsaObject.description).toContain("Line 1");
      expect(vamsaObject.description).toContain("Line 2");
      expect(vamsaObject.description).toContain("Line 3");
    });

    it("should handle very long file paths", () => {
      const longPath = "dir/" + "subdir/".repeat(50) + "file.jpg";
      const parsedObject = {
        id: "test-id",
        filePath: longPath,
        format: "JPEG",
      };

      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      expect(vamsaObject.filePath).toBe(longPath);
    });

    it("should handle file paths with unicode characters", () => {
      const parsedObject = {
        id: "test-id",
        filePath: "photos/عائلة/famille.jpg",
        format: "JPEG",
      };

      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      expect(vamsaObject.filePath).toBe("photos/عائلة/famille.jpg");
    });

    it("should handle empty optional fields", () => {
      const parsedObject = {
        id: "test-id",
        filePath: "image.jpg",
        format: "JPEG",
        title: undefined,
        description: undefined,
      };

      const vamsaObject = objectMapper.mapToVamsa(parsedObject);

      expect(vamsaObject.title).toBeUndefined();
      expect(vamsaObject.description).toBeUndefined();
    });
  });
});
