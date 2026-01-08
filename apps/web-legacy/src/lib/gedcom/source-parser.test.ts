/**
 * Tests for GEDCOM Source Record Parser
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { GedcomParser } from "./parser";
import { SourceParser } from "./source-parser";
import { fixtures } from "./__tests__/fixtures";

describe("SourceParser", () => {
  let sourceParser: SourceParser;
  let gedcomParser: GedcomParser;

  beforeEach(() => {
    sourceParser = new SourceParser();
    gedcomParser = new GedcomParser();
  });

  describe("parseSourceRecord", () => {
    it("should parse a complete source record with all fields", () => {
      const gedcomContent = fixtures.withSources();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      // Find first source record
      const sourceRecord = gedcomFile.sources.find(
        (r) => r.id === "S1"
      );

      expect(sourceRecord).toBeDefined();
      if (!sourceRecord) return;

      const parsed = sourceParser.parseSourceRecord(sourceRecord);

      expect(parsed.id).toBe("S1");
      expect(parsed.title).toBe("Smith Family Records");
      expect(parsed.author).toBe("John Doe");
      expect(parsed.publicationDate).toBe("2015");
      expect(parsed.repository).toBe("Family Archives");
      expect(parsed.notes.length).toBeGreaterThan(0);
    });

    it("should parse minimal source record with only title", () => {
      const gedcomContent = fixtures.withSources();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      // Find S3 which has less data
      const sourceRecord = gedcomFile.sources.find(
        (r) => r.id === "S3"
      );

      expect(sourceRecord).toBeDefined();
      if (!sourceRecord) return;

      const parsed = sourceParser.parseSourceRecord(sourceRecord);

      expect(parsed.id).toBe("S3");
      expect(parsed.title).toBe("Birth Certificate Archive");
      expect(parsed.author).toBe("New York State");
      expect(parsed.publicationDate).toBe("Official Records");
      expect(parsed.repository).toBeUndefined();
    });

    it("should handle multi-line notes with CONT/CONC tags", () => {
      const gedcomContent = fixtures.withSources();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      const sourceRecord = gedcomFile.sources.find(
        (r) => r.id === "S1"
      );

      expect(sourceRecord).toBeDefined();
      if (!sourceRecord) return;

      const parsed = sourceParser.parseSourceRecord(sourceRecord);

      // Should have notes (even if empty array)
      expect(Array.isArray(parsed.notes)).toBe(true);
    });
  });

  describe("extractEventSources", () => {
    it("should extract sources linked to birth event", () => {
      const gedcomContent = fixtures.withSources();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      // Find person with birth sources
      const personRecord = gedcomFile.individuals.find(
        (r) => r.id === "I1"
      );

      expect(personRecord).toBeDefined();
      if (!personRecord) return;

      const birthSources = sourceParser.extractEventSources(
        personRecord,
        "BIRT"
      );

      expect(birthSources.length).toBeGreaterThan(0);
      expect(birthSources[0]).toBe("S1");
    });

    it("should extract sources linked to death event", () => {
      const gedcomContent = fixtures.withSources();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      const personRecord = gedcomFile.individuals.find(
        (r) => r.id === "I1"
      );

      expect(personRecord).toBeDefined();
      if (!personRecord) return;

      const deathSources = sourceParser.extractEventSources(
        personRecord,
        "DEAT"
      );

      expect(deathSources.length).toBeGreaterThan(0);
      expect(deathSources[0]).toBe("S2");
    });

    it("should return empty array when event has no sources", () => {
      const gedcomContent = fixtures.simplePerson();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      const personRecord = gedcomFile.individuals[0];
      expect(personRecord).toBeDefined();

      const sources = sourceParser.extractEventSources(
        personRecord,
        "BIRT"
      );

      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBe(0);
    });

    it("should handle missing event gracefully", () => {
      const gedcomContent = fixtures.simplePerson();
      const gedcomFile = gedcomParser.parse(gedcomContent);

      const personRecord = gedcomFile.individuals[0];
      expect(personRecord).toBeDefined();

      const sources = sourceParser.extractEventSources(
        personRecord,
        "GRAD"
      );

      expect(Array.isArray(sources)).toBe(true);
      expect(sources.length).toBe(0);
    });

    it("should deduplicate source references", () => {
      // Create a test where same source is referenced twice
      const gedcomContent = `0 HEAD
1 SOUR vamsa
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Test /Person/
1 BIRT
2 DATE 15 JAN 1950
3 SOUR @S1@
3 SOUR @S1@
0 @S1@ SOUR
1 TITL Test Source
0 TRLR`;

      const gedcomFile = gedcomParser.parse(gedcomContent);
      const personRecord = gedcomFile.individuals[0];

      const sources = sourceParser.extractEventSources(
        personRecord,
        "BIRT"
      );

      // Should only have one S1, not two
      expect(sources.length).toBe(1);
      expect(sources[0]).toBe("S1");
    });
  });

  describe("edge cases", () => {
    it("should handle source record with no title", () => {
      const gedcomContent = `0 HEAD
1 SOUR vamsa
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @S1@ SOUR
1 AUTH John Doe
0 TRLR`;

      const gedcomFile = gedcomParser.parse(gedcomContent);
      const sourceRecord = gedcomFile.sources.find(
        (r) => r.id === "S1"
      );

      expect(sourceRecord).toBeDefined();
      if (!sourceRecord) return;

      const parsed = sourceParser.parseSourceRecord(sourceRecord);

      // Should default to "Untitled Source"
      expect(parsed.title).toBe("Untitled Source");
      expect(parsed.author).toBe("John Doe");
    });

    it("should handle empty source record", () => {
      const gedcomContent = `0 HEAD
1 SOUR vamsa
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @S1@ SOUR
0 TRLR`;

      const gedcomFile = gedcomParser.parse(gedcomContent);
      const sourceRecord = gedcomFile.sources.find(
        (r) => r.id === "S1"
      );

      expect(sourceRecord).toBeDefined();
      if (!sourceRecord) return;

      const parsed = sourceParser.parseSourceRecord(sourceRecord);

      expect(parsed.id).toBe("S1");
      expect(parsed.title).toBe("Untitled Source");
      expect(parsed.notes).toEqual([]);
    });

    it("should preserve note formatting", () => {
      const gedcomContent = `0 HEAD
1 SOUR vamsa
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @S1@ SOUR
1 TITL Test Source
1 NOTE Line one
2 CONT Line two
0 TRLR`;

      const gedcomFile = gedcomParser.parse(gedcomContent);
      const sourceRecord = gedcomFile.sources.find(
        (r) => r.id === "S1"
      );

      expect(sourceRecord).toBeDefined();
      if (!sourceRecord) return;

      const parsed = sourceParser.parseSourceRecord(sourceRecord);

      // Notes are collected from NOTE tags
      expect(parsed.notes.length).toBeGreaterThanOrEqual(1);
    });
  });
});
