/**
 * Tests for GEDCOM Source Mapper
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { SourceMapper } from "./source-mapper";
import { SourceParser } from "./source-parser";
import { GedcomParser } from "./parser";
import { fixtures } from "./__tests__/fixtures";

describe("SourceMapper", () => {
  let sourceMapper: SourceMapper;
  let sourceParser: SourceParser;
  let gedcomParser: GedcomParser;

  beforeEach(() => {
    sourceMapper = new SourceMapper();
    sourceParser = new SourceParser();
    gedcomParser = new GedcomParser();
  });

  describe("mapToVamsa", () => {
    it("should map parsed source to Vamsa format", () => {
      const gedcomContent = fixtures.withSources();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      const sourceRecord = gedcomFile.sources.find((r) => r.id === "S1");

      expect(sourceRecord).toBeDefined();
      if (!sourceRecord) return;

      const parsedSource = sourceParser.parseSourceRecord(sourceRecord);
      const vamsaSource = sourceMapper.mapToVamsa(parsedSource);

      expect(vamsaSource.title).toBe("Smith Family Records");
      expect(vamsaSource.author).toBe("John Doe");
      expect(vamsaSource.publicationDate).toBe("2015");
      expect(vamsaSource.repository).toBe("Family Archives");
      expect(vamsaSource.notes).toBeDefined();
    });

    it("should preserve all source metadata", () => {
      const parsedSource = {
        id: "test-id",
        title: "Test Source",
        author: "Test Author",
        publicationDate: "2020",
        description: "Test Description",
        repository: "Test Repo",
        notes: ["Note 1", "Note 2"],
      };

      const vamsaSource = sourceMapper.mapToVamsa(parsedSource);

      expect(vamsaSource.title).toBe("Test Source");
      expect(vamsaSource.author).toBe("Test Author");
      expect(vamsaSource.publicationDate).toBe("2020");
      expect(vamsaSource.description).toBe("Test Description");
      expect(vamsaSource.repository).toBe("Test Repo");
      expect(vamsaSource.notes).toContain("Note 1");
      expect(vamsaSource.notes).toContain("Note 2");
    });

    it("should handle optional fields as undefined", () => {
      const parsedSource = {
        id: "test-id",
        title: "Minimal Source",
        notes: [],
      };

      const vamsaSource = sourceMapper.mapToVamsa(parsedSource);

      expect(vamsaSource.title).toBe("Minimal Source");
      expect(vamsaSource.author).toBeUndefined();
      expect(vamsaSource.publicationDate).toBeUndefined();
      expect(vamsaSource.repository).toBeUndefined();
    });

    it("should assign provided Vamsa ID", () => {
      const parsedSource = {
        id: "gedcom-id",
        title: "Test Source",
        notes: [],
      };

      const vamsaId = "vamsa-cuid-123";
      const vamsaSource = sourceMapper.mapToVamsa(parsedSource, vamsaId);

      expect(vamsaSource.id).toBe(vamsaId);
    });

    it("should concatenate multiple notes into single string", () => {
      const parsedSource = {
        id: "test-id",
        title: "Test Source",
        notes: ["First note", "Second note", "Third note"],
      };

      const vamsaSource = sourceMapper.mapToVamsa(parsedSource);

      expect(vamsaSource.notes).toBe("First note\nSecond note\nThird note");
    });

    it("should handle empty notes array", () => {
      const parsedSource = {
        id: "test-id",
        title: "Test Source",
        notes: [],
      };

      const vamsaSource = sourceMapper.mapToVamsa(parsedSource);

      expect(vamsaSource.notes).toBeUndefined();
    });
  });

  describe("createEventSourceLink", () => {
    it("should create event-source link with correct fields", () => {
      const link = sourceMapper.createEventSourceLink(
        "source-123",
        "person-456",
        "BIRT"
      );

      expect(link.sourceId).toBe("source-123");
      expect(link.personId).toBe("person-456");
      expect(link.eventType).toBe("BIRT");
    });

    it("should support various event types", () => {
      const eventTypes = ["BIRT", "DEAT", "MARR", "DIV", "BURI", "GRAD"];

      for (const eventType of eventTypes) {
        const link = sourceMapper.createEventSourceLink(
          "source-id",
          "person-id",
          eventType
        );

        expect(link.eventType).toBe(eventType);
      }
    });

    it("should allow custom event types", () => {
      const link = sourceMapper.createEventSourceLink(
        "source-id",
        "person-id",
        "CUSTOM"
      );

      expect(link.eventType).toBe("CUSTOM");
    });
  });

  describe("roundtrip conversion", () => {
    it("should convert from GEDCOM through Vamsa and back", () => {
      const gedcomContent = fixtures.withSources();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      const sourceRecord = gedcomFile.sources.find((r) => r.id === "S1");

      expect(sourceRecord).toBeDefined();
      if (!sourceRecord) return;

      // Parse GEDCOM -> ParsedSource
      const parsedSource = sourceParser.parseSourceRecord(sourceRecord);

      // Map to Vamsa
      const vamsaSource = sourceMapper.mapToVamsa(parsedSource, "vamsa-id-123");

      // Verify data integrity
      expect(vamsaSource.title).toBe(parsedSource.title);
      expect(vamsaSource.author).toBe(parsedSource.author);
      expect(vamsaSource.publicationDate).toBe(parsedSource.publicationDate);
      expect(vamsaSource.repository).toBe(parsedSource.repository);
    });
  });

  describe("edge cases", () => {
    it("should handle source with special characters in title", () => {
      const parsedSource = {
        id: "test-id",
        title: "Smith & Co. Records (1950-1999)",
        notes: [],
      };

      const vamsaSource = sourceMapper.mapToVamsa(parsedSource);

      expect(vamsaSource.title).toBe("Smith & Co. Records (1950-1999)");
    });

    it("should handle notes with newlines and special formatting", () => {
      const parsedSource = {
        id: "test-id",
        title: "Test Source",
        notes: [
          "Line with special chars: @#$%",
          "Another line with (parentheses) [brackets]",
        ],
      };

      const vamsaSource = sourceMapper.mapToVamsa(parsedSource);

      expect(vamsaSource.notes).toContain("@#$%");
      expect(vamsaSource.notes).toContain("[brackets]");
    });

    it("should handle very long titles", () => {
      const longTitle = "A".repeat(500);
      const parsedSource = {
        id: "test-id",
        title: longTitle,
        notes: [],
      };

      const vamsaSource = sourceMapper.mapToVamsa(parsedSource);

      expect(vamsaSource.title).toBe(longTitle);
    });
  });
});
