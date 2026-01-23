/**
 * Unit tests for sources server business logic
 *
 * Tests cover:
 * - Getting source details with related data (eventSources, researchNotes)
 * - Listing sources with optional filtering by type and personId
 * - Creating sources with various fields (title required, others optional)
 * - Updating sources with partial field updates
 * - Deleting sources with existence verification
 * - Creating research notes with source and person validation
 * - Updating research notes with validity checks
 * - Deleting research notes
 * - Linking sources to events (create/update)
 * - Getting research notes grouped by event type
 * - Generating citations in different formats (MLA, APA, CHICAGO)
 * - Getting person sources grouped by event type
 * - Error handling and validation
 * - Edge cases (null values, JSON parsing, date formatting)
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { SourcesDb } from "@vamsa/lib/server/business";
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../testing/shared-mocks";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

import {
  getSourceData,
  listSourcesData,
  createSourceData,
  updateSourceData,
  deleteSourceData,
  createResearchNoteData,
  updateResearchNoteData,
  deleteResearchNoteData,
  linkSourceToEventData,
  getResearchNotesData,
  generateCitationData,
  getPersonSourcesData,
} from "@vamsa/lib/server/business";

function createMockDb(): SourcesDb {
  return {
    source: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      count: mock(() => Promise.resolve(0)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    researchNote: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    eventSource: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
    },
    person: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
    },
  } as unknown as SourcesDb;
}

describe("Sources Business Logic", () => {
  let mockDb: SourcesDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.error.mockClear();
  });

  describe("getSourceData", () => {
    it("should fetch source with all related data", async () => {
      const mockSource = {
        id: "source-1",
        title: "Family Records",
        author: "John Doe",
        publicationDate: "1995-05-15",
        description: "Historical family documents",
        repository: "Local Archive",
        notes: "Valuable records",
        sourceType: "ARCHIVE",
        citationFormat: "MLA",
        doi: "10.1234/example",
        url: "https://archive.example.com",
        isbn: "978-0-123456-78-9",
        callNumber: "FAM-001",
        accessDate: new Date("2024-01-15"),
        confidence: "HIGH",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
        eventSources: [
          {
            id: "es-1",
            personId: "person-1",
            eventType: "birth",
            confidence: "HIGH",
            sourceNotes: "Birth record",
            person: {
              id: "person-1",
              firstName: "John",
              lastName: "Smith",
            },
          },
        ],
        researchNotes: [
          {
            id: "rn-1",
            personId: "person-1",
            eventType: "birth",
            findings: "Confirmed birth date",
            methodology: "Document review",
            limitations: "Original illegible",
            relatedSources: '["source-2", "source-3"]',
            conclusionReliability: "HIGH",
            createdAt: new Date("2024-01-10"),
            updatedAt: new Date("2024-01-15"),
            person: {
              id: "person-1",
              firstName: "John",
              lastName: "Smith",
            },
            createdBy: {
              id: "user-1",
              name: "Researcher",
              email: "researcher@example.com",
            },
          },
        ],
      };

      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSource);

      const result = await getSourceData("source-1", mockDb);

      expect(result.id).toBe("source-1");
      expect(result.title).toBe("Family Records");
      expect(result.author).toBe("John Doe");
      expect(result.sourceType).toBe("ARCHIVE");
      expect(result.eventCount).toBe(1);
      expect(result.researchNoteCount).toBe(1);
      expect(result.eventSources).toHaveLength(1);
      expect(result.researchNotesRelated).toHaveLength(1);
      expect(result.researchNotesRelated[0].relatedSources).toEqual([
        "source-2",
        "source-3",
      ]);
    });

    it("should handle researchNotes with null relatedSources", async () => {
      const mockSource = {
        id: "source-1",
        title: "Source",
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
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        eventSources: [],
        researchNotes: [
          {
            id: "rn-1",
            personId: "person-1",
            eventType: "birth",
            findings: "Note",
            methodology: null,
            limitations: null,
            relatedSources: null,
            conclusionReliability: null,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            person: { id: "p1", firstName: "John", lastName: "Doe" },
            createdBy: null,
          },
        ],
      };

      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSource);

      const result = await getSourceData("source-1", mockDb);

      expect(result.researchNotesRelated[0].relatedSources).toEqual([]);
    });

    it("should throw error when source not found", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getSourceData("nonexistent", mockDb);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Source not found");
      }
    });
  });

  describe("listSourcesData", () => {
    it("should list all sources without filters", async () => {
      const mockSources = [
        {
          id: "source-1",
          title: "Source 1",
          author: "Author 1",
          publicationDate: "1995-01-01",
          description: null,
          repository: null,
          notes: null,
          sourceType: "ARCHIVE",
          citationFormat: null,
          doi: null,
          url: null,
          isbn: null,
          callNumber: null,
          accessDate: null,
          confidence: "HIGH",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          eventSources: [],
          researchNotes: [],
        },
        {
          id: "source-2",
          title: "Source 2",
          author: "Author 2",
          publicationDate: "1996-01-01",
          description: null,
          repository: null,
          notes: null,
          sourceType: "BOOK",
          citationFormat: null,
          doi: null,
          url: null,
          isbn: null,
          callNumber: null,
          accessDate: null,
          confidence: "MEDIUM",
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
          eventSources: [],
          researchNotes: [],
        },
      ];

      (mockDb.source.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockSources
      );

      const result = await listSourcesData(undefined, undefined, mockDb);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].title).toBe("Source 1");
      expect(result.items[1].title).toBe("Source 2");
    });

    it("should filter sources by type", async () => {
      const mockSources = [
        {
          id: "source-1",
          title: "Archive Source",
          author: null,
          publicationDate: null,
          description: null,
          repository: null,
          notes: null,
          sourceType: "ARCHIVE",
          citationFormat: null,
          doi: null,
          url: null,
          isbn: null,
          callNumber: null,
          accessDate: null,
          confidence: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          eventSources: [],
          researchNotes: [],
        },
      ];

      (mockDb.source.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockSources
      );

      const result = await listSourcesData("ARCHIVE", undefined, mockDb);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].sourceType).toBe("ARCHIVE");

      // Verify the where clause was used
      const findManyCall = (mockDb.source.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.where?.sourceType).toBe("ARCHIVE");
    });

    it("should filter sources by personId", async () => {
      const mockSources = [
        {
          id: "source-1",
          title: "Source",
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
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          eventSources: [{ personId: "person-1" }],
          researchNotes: [],
        },
      ];

      (mockDb.source.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockSources
      );

      const result = await listSourcesData(undefined, "person-1", mockDb);

      expect(result.items).toHaveLength(1);
    });

    it("should exclude sources not linked to person", async () => {
      const mockSources = [
        {
          id: "source-1",
          title: "Linked Source",
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
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          eventSources: [{ personId: "person-1" }],
          researchNotes: [],
        },
        {
          id: "source-2",
          title: "Unlinked Source",
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
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
          eventSources: [{ personId: "person-2" }],
          researchNotes: [],
        },
      ];

      (mockDb.source.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockSources
      );

      const result = await listSourcesData(undefined, "person-1", mockDb);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("source-1");
    });

    it("should include sources linked via researchNotes", async () => {
      const mockSources = [
        {
          id: "source-1",
          title: "Source",
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
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          eventSources: [],
          researchNotes: [{ personId: "person-1" }],
        },
      ];

      (mockDb.source.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockSources
      );

      const result = await listSourcesData(undefined, "person-1", mockDb);

      expect(result.items).toHaveLength(1);
    });
  });

  describe("createSourceData", () => {
    it("should create source with minimal data", async () => {
      const createdSource = {
        id: "source-1",
        title: "New Source",
        author: null,
        publicationDate: null,
        sourceType: null,
        confidence: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      (mockDb.source.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        createdSource
      );

      const result = await createSourceData({ title: "New Source" }, mockDb);

      expect(result.id).toBe("source-1");
      expect(result.title).toBe("New Source");
      expect(result.author).toBeNull();

      // Verify create was called with correct data
      const createCall = (mockDb.source.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(createCall?.[0]?.data?.title).toBe("New Source");
      expect(createCall?.[0]?.data?.author).toBeNull();
    });

    it("should create source with all optional fields", async () => {
      const createdSource = {
        id: "source-1",
        title: "Complete Source",
        author: "John Doe",
        publicationDate: "1995-05-15",
        sourceType: "ARCHIVE",
        confidence: "HIGH",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      (mockDb.source.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        createdSource
      );

      const result = await createSourceData(
        {
          title: "Complete Source",
          author: "John Doe",
          publicationDate: "1995-05-15",
          description: "Full description",
          repository: "Archive",
          notes: "Important notes",
          sourceType: "ARCHIVE",
          citationFormat: "MLA",
          doi: "10.1234/example",
          url: "https://example.com",
          isbn: "978-0-123456-78-9",
          callNumber: "FAM-001",
          accessDate: "2024-01-01",
          confidence: "HIGH",
        },
        mockDb
      );

      expect(result.title).toBe("Complete Source");
      expect(result.author).toBe("John Doe");
      expect(result.confidence).toBe("HIGH");
    });

    it("should convert accessDate string to Date", async () => {
      (mockDb.source.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "source-1",
        title: "Source",
        author: null,
        publicationDate: null,
        sourceType: null,
        confidence: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      await createSourceData(
        {
          title: "Source",
          accessDate: "2024-01-15",
        },
        mockDb
      );

      const createCall = (mockDb.source.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(createCall?.[0]?.data?.accessDate).toEqual(new Date("2024-01-15"));
    });
  });

  describe("updateSourceData", () => {
    it("should update source fields", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "source-1",
      });

      const updatedSource = {
        id: "source-1",
        title: "Updated Title",
        author: "New Author",
        publicationDate: "2000-01-01",
        sourceType: "BOOK",
        confidence: "MEDIUM",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
      };

      (mockDb.source.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updatedSource
      );

      const result = await updateSourceData(
        "source-1",
        {
          title: "Updated Title",
          author: "New Author",
          confidence: "MEDIUM",
        },
        mockDb
      );

      expect(result.title).toBe("Updated Title");
      expect(result.author).toBe("New Author");
      expect(result.confidence).toBe("MEDIUM");
    });

    it("should throw error if source not found", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await updateSourceData("nonexistent", { title: "New" }, mockDb);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Source not found");
      }
    });
  });

  describe("deleteSourceData", () => {
    it("should delete source", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "source-1",
      });

      (mockDb.source.delete as ReturnType<typeof mock>).mockResolvedValueOnce(
        {}
      );

      const result = await deleteSourceData("source-1", mockDb);

      expect(result.success).toBe(true);
    });

    it("should throw error if source not found", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await deleteSourceData("nonexistent", mockDb);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Source not found");
      }
    });
  });

  describe("createResearchNoteData", () => {
    it("should create research note with source and person validation", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "source-1",
      });

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "person-1",
      });

      const createdNote = {
        id: "rn-1",
        sourceId: "source-1",
        personId: "person-1",
        eventType: "birth",
        findings: "Confirmed birth date",
        methodology: "Document review",
        limitations: "Original illegible",
        relatedSources: '["source-2"]',
        conclusionReliability: "HIGH",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        person: {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
        },
      };

      (
        mockDb.researchNote.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(createdNote);

      const result = await createResearchNoteData(
        {
          sourceId: "source-1",
          personId: "person-1",
          eventType: "birth",
          findings: "Confirmed birth date",
          methodology: "Document review",
          limitations: "Original illegible",
          relatedSources: '["source-2"]',
          conclusionReliability: "HIGH",
        },
        mockDb
      );

      expect(result.id).toBe("rn-1");
      expect(result.findings).toBe("Confirmed birth date");
      expect(result.relatedSources).toEqual(["source-2"]);
    });

    it("should throw error if source not found", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await createResearchNoteData(
          {
            sourceId: "nonexistent",
            personId: "person-1",
            eventType: "birth",
            findings: "Test",
          },
          mockDb
        );
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Source not found");
      }
    });

    it("should throw error if person not found", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "source-1",
      });

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await createResearchNoteData(
          {
            sourceId: "source-1",
            personId: "nonexistent",
            eventType: "birth",
            findings: "Test",
          },
          mockDb
        );
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Person not found");
      }
    });
  });

  describe("updateResearchNoteData", () => {
    it("should update research note", async () => {
      (
        mockDb.researchNote.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "rn-1",
      });

      const updatedNote = {
        id: "rn-1",
        sourceId: "source-1",
        personId: "person-1",
        eventType: "birth",
        findings: "Updated findings",
        methodology: null,
        limitations: null,
        relatedSources: null,
        conclusionReliability: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
        person: {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
        },
      };

      (
        mockDb.researchNote.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce(updatedNote);

      const result = await updateResearchNoteData(
        "rn-1",
        { findings: "Updated findings" },
        mockDb
      );

      expect(result.findings).toBe("Updated findings");
    });

    it("should throw error if research note not found", async () => {
      (
        mockDb.researchNote.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await updateResearchNoteData(
          "nonexistent",
          { findings: "Test" },
          mockDb
        );
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Research note not found");
      }
    });
  });

  describe("deleteResearchNoteData", () => {
    it("should delete research note", async () => {
      (
        mockDb.researchNote.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({ id: "rn-1" });

      (
        mockDb.researchNote.delete as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      const result = await deleteResearchNoteData("rn-1", mockDb);

      expect(result.success).toBe(true);
    });

    it("should throw error if research note not found", async () => {
      (
        mockDb.researchNote.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await deleteResearchNoteData("nonexistent", mockDb);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Research note not found");
      }
    });
  });

  describe("linkSourceToEventData", () => {
    it("should create new event source link", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "source-1",
      });

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "person-1",
      });

      (
        mockDb.eventSource.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      const createdLink = {
        id: "es-1",
        sourceId: "source-1",
        personId: "person-1",
        eventType: "birth",
        confidence: "HIGH",
        sourceNotes: "Birth record found",
      };

      (
        mockDb.eventSource.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(createdLink);

      const result = await linkSourceToEventData(
        {
          sourceId: "source-1",
          personId: "person-1",
          eventType: "birth",
          confidence: "HIGH",
          sourceNotes: "Birth record found",
        },
        mockDb
      );

      expect(result.id).toBe("es-1");
      expect(result.confidence).toBe("HIGH");
    });

    it("should update existing event source link", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "source-1",
      });

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "person-1",
      });

      (
        mockDb.eventSource.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "es-1",
      });

      const updatedLink = {
        id: "es-1",
        sourceId: "source-1",
        personId: "person-1",
        eventType: "birth",
        confidence: "MEDIUM",
        sourceNotes: "Updated notes",
      };

      (
        mockDb.eventSource.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce(updatedLink);

      const result = await linkSourceToEventData(
        {
          sourceId: "source-1",
          personId: "person-1",
          eventType: "birth",
          confidence: "MEDIUM",
          sourceNotes: "Updated notes",
        },
        mockDb
      );

      expect(result.confidence).toBe("MEDIUM");
      expect(result.sourceNotes).toBe("Updated notes");
    });

    it("should throw error if source not found", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await linkSourceToEventData(
          {
            sourceId: "nonexistent",
            personId: "person-1",
            eventType: "birth",
          },
          mockDb
        );
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Source not found");
      }
    });

    it("should throw error if person not found", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "source-1",
      });

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await linkSourceToEventData(
          {
            sourceId: "source-1",
            personId: "nonexistent",
            eventType: "birth",
          },
          mockDb
        );
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Person not found");
      }
    });
  });

  describe("getResearchNotesData", () => {
    it("should get research notes grouped by event type", async () => {
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        id: "person-1",
      });

      const mockNotes = [
        {
          id: "rn-1",
          eventType: "birth",
          findings: "Birth findings",
          methodology: "Document review",
          limitations: null,
          relatedSources: null,
          conclusionReliability: "HIGH",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-15"),
          source: {
            id: "source-1",
            title: "Source 1",
            author: "Author",
            sourceType: "ARCHIVE",
          },
          createdBy: {
            id: "user-1",
            name: "Researcher",
            email: "researcher@example.com",
          },
        },
        {
          id: "rn-2",
          eventType: "death",
          findings: "Death findings",
          methodology: null,
          limitations: null,
          relatedSources: '["source-2"]',
          conclusionReliability: "MEDIUM",
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-15"),
          source: {
            id: "source-2",
            title: "Source 2",
            author: null,
            sourceType: "BOOK",
          },
          createdBy: null,
        },
      ];

      (
        mockDb.researchNote.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockNotes);

      const result = await getResearchNotesData("person-1", mockDb);

      expect(result.birth).toBeDefined();
      expect(result.death).toBeDefined();
      expect(result.birth).toHaveLength(1);
      expect(result.death).toHaveLength(1);
      expect(result.birth[0].findings).toBe("Birth findings");
      expect(result.death[0].relatedSources).toEqual(["source-2"]);
    });

    it("should throw error if person not found", async () => {
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getResearchNotesData("nonexistent", mockDb);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Person not found");
      }
    });
  });

  describe("generateCitationData", () => {
    it("should generate MLA citation", async () => {
      const mockSource = {
        id: "source-1",
        title: "Family Records",
        author: "John Doe",
        publicationDate: "1995-05-15",
        repository: "Local Archive",
        url: "https://archive.example.com",
        doi: "10.1234/example",
      };

      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSource);

      const result = await generateCitationData("source-1", "MLA", mockDb);

      expect(result.format).toBe("MLA");
      expect(result.citation).toContain("John Doe");
      expect(result.citation).toContain("Family Records");
      expect(result.citation).toContain("1995");
      expect(result.citation).toContain("Local Archive");
    });

    it("should generate APA citation", async () => {
      const mockSource = {
        id: "source-1",
        title: "Family Records",
        author: "Jane Smith",
        publicationDate: "2000-03-20",
        repository: "Archive",
        url: null,
        doi: null,
      };

      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSource);

      const result = await generateCitationData("source-1", "APA", mockDb);

      expect(result.format).toBe("APA");
      expect(result.citation).toContain("Jane Smith");
      expect(result.citation).toContain("2000");
      expect(result.citation).toContain("Family Records");
    });

    it("should generate CHICAGO citation", async () => {
      const mockSource = {
        id: "source-1",
        title: "Historical Documents",
        author: "Unknown Author",
        publicationDate: "1850-01-01",
        repository: null,
        url: "https://example.com/doc",
        doi: null,
      };

      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSource);

      const result = await generateCitationData("source-1", "CHICAGO", mockDb);

      expect(result.format).toBe("CHICAGO");
      expect(result.citation).toContain("Unknown Author");
      expect(result.citation).toContain("Historical Documents");
    });

    it("should handle citation with null fields", async () => {
      const mockSource = {
        id: "source-1",
        title: "Source Title",
        author: null,
        publicationDate: null,
        repository: null,
        url: null,
        doi: null,
      };

      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSource);

      const result = await generateCitationData("source-1", "MLA", mockDb);

      expect(result.citation).toContain("Unknown Author");
      expect(result.citation).toContain("Source Title");
      // When publicationDate is null, citation ends immediately
      expect(result.citation).toBe('Unknown Author. "Source Title.".');
    });

    it("should throw error if source not found", async () => {
      (
        mockDb.source.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await generateCitationData("nonexistent", "MLA", mockDb);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Source not found");
      }
    });
  });

  describe("getPersonSourcesData", () => {
    it("should get person sources grouped by event type", async () => {
      const mockEventSources = [
        {
          id: "es-1",
          eventType: "birth",
          source: {
            id: "source-1",
            title: "Birth Record",
            author: "Registrar",
            publicationDate: "1990-01-15",
            description: "Official record",
            repository: "Registry",
            notes: "Confirmed",
          },
        },
        {
          id: "es-2",
          eventType: "marriage",
          source: {
            id: "source-2",
            title: "Marriage License",
            author: null,
            publicationDate: "2015-06-20",
            description: null,
            repository: null,
            notes: null,
          },
        },
      ];

      (
        mockDb.eventSource.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEventSources);

      const result = await getPersonSourcesData("person-1", mockDb);

      expect(result.birth).toBeDefined();
      expect(result.marriage).toBeDefined();
      expect(result.birth[0].title).toBe("Birth Record");
      expect(result.birth[0].eventTypes).toContain("birth");
    });

    it("should handle sources linked to multiple event types", async () => {
      const mockEventSources = [
        {
          id: "es-1",
          eventType: "birth",
          source: {
            id: "source-1",
            title: "Source",
            author: null,
            publicationDate: null,
            description: null,
            repository: null,
            notes: null,
          },
        },
        {
          id: "es-2",
          eventType: "christening",
          source: {
            id: "source-1",
            title: "Source",
            author: null,
            publicationDate: null,
            description: null,
            repository: null,
            notes: null,
          },
        },
      ];

      (
        mockDb.eventSource.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEventSources);

      const result = await getPersonSourcesData("person-1", mockDb);

      // Each event type gets its own group
      expect(result.birth).toHaveLength(1);
      expect(result.christening).toHaveLength(1);
      // Each source appears separately in each group with just its own eventType
      expect(result.birth[0].eventTypes).toEqual(["birth"]);
      expect(result.christening[0].eventTypes).toEqual(["christening"]);
    });

    it("should return empty object when no sources found", async () => {
      (
        mockDb.eventSource.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await getPersonSourcesData("person-1", mockDb);

      expect(result).toEqual({});
    });

    it("should handle database errors gracefully", async () => {
      (
        mockDb.eventSource.findMany as ReturnType<typeof mock>
      ).mockRejectedValueOnce(new Error("Database error"));

      try {
        await getPersonSourcesData("person-1", mockDb);
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Failed to fetch person sources");
      }
    });
  });
});
