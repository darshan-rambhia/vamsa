/**
 * Unit tests for sources server business logic
 *
 * Tests cover:
 * - Data transformation and formatting
 * - Error handling
 * - Database interaction through mocked module
 *
 * Uses module mocking for database dependency injection.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  mockLogger,
  mockSerializeError,
  clearAllMocks,
} from "../../testing/shared-mocks";

// Mock logger
mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
}));

// Create mock drizzle database and schema
const mockDrizzleDb = {
  query: {
    sources: {
      findFirst: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
    },
    eventSources: {
      findMany: mock(() => Promise.resolve([])),
      findFirst: mock(() => Promise.resolve(null)),
    },
    researchNotes: {
      findMany: mock(() => Promise.resolve([])),
      findFirst: mock(() => Promise.resolve(null)),
    },
    persons: {
      findFirst: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
    },
  },
  insert: mock(() => ({
    values: mock(() => ({
      returning: mock(() => Promise.resolve([])),
    })),
  })),
  update: mock(() => ({
    set: mock(() => ({
      where: mock(() => ({
        returning: mock(() => Promise.resolve([])),
      })),
    })),
  })),
  delete: mock(() => ({
    where: mock(() => Promise.resolve({})),
  })),
};

const mockDrizzleSchema = {
  sources: { id: "id" },
  eventSources: { id: "id", sourceId: "sourceId", personId: "personId" },
  researchNotes: { id: "id", sourceId: "sourceId", personId: "personId" },
  persons: { id: "id", firstName: "firstName", lastName: "lastName" },
};

mock.module("@vamsa/api", () => ({
  drizzleDb: mockDrizzleDb,
  drizzleSchema: mockDrizzleSchema,
}));

import {
  getSourceData,
  listSourcesData,
  createSourceData,
  deleteSourceData,
  createResearchNoteData,
  deleteResearchNoteData,
  getResearchNotesData,
  generateCitationData,
} from "./sources";

describe("Sources Business Logic", () => {
  beforeEach(() => {
    clearAllMocks();
    (
      mockDrizzleDb.query.sources.findFirst as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.sources.findMany as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.eventSources.findFirst as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.researchNotes.findFirst as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
    ).mockClear();
    (mockDrizzleDb.insert as ReturnType<typeof mock>).mockClear();
    (mockDrizzleDb.update as ReturnType<typeof mock>).mockClear();
    (mockDrizzleDb.delete as ReturnType<typeof mock>).mockClear();
  });

  describe("getSourceData", () => {
    it("should retrieve source with related data", async () => {
      const mockSource = {
        id: "source-1",
        title: "Census 1900",
        author: "US Census Bureau",
        publicationDate: "1900-06-01",
        description: "1900 US Census",
        repository: "National Archives",
        notes: "Complete record",
        sourceType: "Census",
        citationFormat: "MLA",
        doi: null,
        url: null,
        isbn: null,
        callNumber: null,
        accessDate: new Date("2024-01-01"),
        confidence: "High",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSource);
      (
        mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await getSourceData("source-1");

      expect(result.id).toBe("source-1");
      expect(result.title).toBe("Census 1900");
      expect(result.eventSources).toHaveLength(0);
      expect(result.researchNotesRelated).toHaveLength(0);
      expect(result.eventCount).toBe(0);
      expect(result.researchNoteCount).toBe(0);
    });

    it("should throw error when source not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getSourceData("nonexistent");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Source not found");
      }
    });

    it("should include event and research note counts", async () => {
      const mockSource = {
        id: "source-1",
        title: "Census",
        author: null,
        publicationDate: null,
        description: null,
        repository: null,
        notes: null,
        sourceType: null,
        citationFormat: null,
        doi: null,
        url: null,
        isbn: null,
        callNumber: null,
        accessDate: null,
        confidence: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEventSources = [
        {
          id: "es-1",
          personId: "p-1",
          eventType: "birth",
          confidence: null,
          sourceNotes: null,
        },
        {
          id: "es-2",
          personId: "p-2",
          eventType: "marriage",
          confidence: null,
          sourceNotes: null,
        },
      ];

      const mockResearchNotes = [
        {
          id: "rn-1",
          personId: "p-1",
          eventType: "birth",
          findings: "Found",
          methodology: null,
          limitations: null,
          relatedSources: "[]",
          conclusionReliability: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSource);
      (
        mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEventSources);
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockResearchNotes);

      const result = await getSourceData("source-1");

      expect(result.eventCount).toBe(2);
      expect(result.researchNoteCount).toBe(1);
    });
  });

  describe("listSourcesData", () => {
    it("should list sources and handle empty results", async () => {
      (
        mockDrizzleDb.query.sources.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await listSourcesData();

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should convert dates to ISO strings", async () => {
      const now = new Date("2024-01-15");
      const mockSources = [
        {
          id: "source-1",
          title: "Census",
          author: null,
          publicationDate: null,
          sourceType: null,
          confidence: null,
          createdAt: now,
          updatedAt: now,
        },
      ];

      (
        mockDrizzleDb.query.sources.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSources);
      (
        mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await listSourcesData();

      expect(result.items[0].createdAt).toBe(now.toISOString());
      expect(result.items[0].updatedAt).toBe(now.toISOString());
    });
  });

  describe("createSourceData", () => {
    it("should create source with all fields", async () => {
      const mockReturning = mock(() =>
        Promise.resolve([
          {
            id: "new-source",
            title: "New Source",
            author: "Author",
            publicationDate: "2024",
            sourceType: "Book",
            confidence: "High",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
      );

      (mockDrizzleDb.insert as ReturnType<typeof mock>).mockReturnValueOnce({
        values: mock(() => ({ returning: mockReturning })),
      } as any);

      const result = await createSourceData({
        title: "New Source",
        author: "Author",
        publicationDate: "2024",
        sourceType: "Book",
        confidence: "High",
      });

      expect(result.title).toBe("New Source");
      expect(result.id).toBe("new-source");
    });
  });

  describe("deleteSourceData", () => {
    it("should delete a source", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "source-1",
      });

      const result = await deleteSourceData("source-1");

      expect(result.success).toBe(true);
    });

    it("should throw error when source not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await deleteSourceData("nonexistent");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Source not found");
      }
    });
  });

  describe("createResearchNoteData", () => {
    it("should create research note with person data", async () => {
      const mockPerson = { id: "p-1", firstName: "John", lastName: "Doe" };
      const mockReturning = mock(() =>
        Promise.resolve([
          {
            id: "note-1",
            sourceId: "source-1",
            personId: "p-1",
            eventType: "birth",
            findings: "Found record",
            methodology: null,
            limitations: null,
            relatedSources: "[]",
            conclusionReliability: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
      );

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "source-1",
      });
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDrizzleDb.insert as ReturnType<typeof mock>).mockReturnValueOnce({
        values: mock(() => ({ returning: mockReturning })),
      } as any);

      const result = await createResearchNoteData({
        sourceId: "source-1",
        personId: "p-1",
        eventType: "birth",
        findings: "Found record",
      });

      expect(result.findings).toBe("Found record");
      expect(result.person.firstName).toBe("John");
    });

    it("should throw error when source not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await createResearchNoteData({
          sourceId: "nonexistent",
          personId: "p-1",
          eventType: "birth",
          findings: "Found",
        });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Source not found");
      }
    });

    it("should throw error when person not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "source-1",
      });
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await createResearchNoteData({
          sourceId: "source-1",
          personId: "nonexistent",
          eventType: "birth",
          findings: "Found",
        });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Person not found");
      }
    });
  });

  describe("deleteResearchNoteData", () => {
    it("should delete research note", async () => {
      (
        mockDrizzleDb.query.researchNotes.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "note-1",
      });

      const result = await deleteResearchNoteData("note-1");

      expect(result.success).toBe(true);
    });

    it("should throw error when note not found", async () => {
      (
        mockDrizzleDb.query.researchNotes.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await deleteResearchNoteData("nonexistent");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Research note not found");
      }
    });
  });

  describe("getResearchNotesData", () => {
    it("should handle empty research notes", async () => {
      const mockPerson = { id: "p-1", firstName: "John", lastName: "Doe" };

      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await getResearchNotesData("p-1");

      expect(result).toEqual({});
    });

    it("should throw error when person not found", async () => {
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getResearchNotesData("nonexistent");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Person not found");
      }
    });
  });

  describe("generateCitationData", () => {
    it("should generate MLA citation", async () => {
      const mockSource = {
        id: "source-1",
        title: "Census Data",
        author: "US Census Bureau",
        publicationDate: "1900",
        repository: "National Archives",
        description: "1900 Census",
      };

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSource);

      const result = await generateCitationData("source-1", "MLA");

      expect(result.format).toBe("MLA");
      expect(result.citation).toContain("Census Data");
      expect(result.citation).toContain("US Census Bureau");
    });

    it("should throw error when source not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await generateCitationData("nonexistent", "MLA");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Failed to generate citation");
      }
    });
  });
});
