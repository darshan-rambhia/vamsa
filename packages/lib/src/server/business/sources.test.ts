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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllMocks } from "../../testing/shared-mocks";

import {
  createResearchNoteData,
  createSourceData,
  deleteResearchNoteData,
  deleteSourceData,
  generateCitationData,
  getPersonSourcesData,
  getResearchNotesData,
  getSourceData,
  linkSourceToEventData,
  listSourcesData,
  updateResearchNoteData,
  updateSourceData,
} from "./sources";

// Create mock drizzle database
const mockDrizzleDb = {
  query: {
    sources: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      findMany: vi.fn(() => Promise.resolve([])),
    },
    eventSources: {
      findMany: vi.fn(() => Promise.resolve([])),
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
    researchNotes: {
      findMany: vi.fn(() => Promise.resolve([])),
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
    persons: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      findMany: vi.fn(() => Promise.resolve([])),
    },
  },
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve({})),
  })),
};

describe("Sources Business Logic", () => {
  beforeEach(() => {
    clearAllMocks();
    (
      mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
    ).mockClear();
    (
      mockDrizzleDb.query.sources.findMany as ReturnType<typeof vi.fn>
    ).mockClear();
    (
      mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof vi.fn>
    ).mockClear();
    (
      mockDrizzleDb.query.eventSources.findFirst as ReturnType<typeof vi.fn>
    ).mockClear();
    (
      mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof vi.fn>
    ).mockClear();
    (
      mockDrizzleDb.query.researchNotes.findFirst as ReturnType<typeof vi.fn>
    ).mockClear();
    (
      mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>
    ).mockClear();
    (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockClear();
    (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockClear();
    (mockDrizzleDb.delete as ReturnType<typeof vi.fn>).mockClear();
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
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);
      (
        mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);

      const result = await getSourceData("source-1", mockDrizzleDb as any);

      expect(result.id).toBe("source-1");
      expect(result.title).toBe("Census 1900");
      expect(result.eventSources).toHaveLength(0);
      expect(result.researchNotesRelated).toHaveLength(0);
      expect(result.eventCount).toBe(0);
      expect(result.researchNoteCount).toBe(0);
    });

    it("should throw error when source not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await getSourceData("nonexistent", mockDrizzleDb as any);
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
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);
      (
        mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockEventSources);
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockResearchNotes);

      const result = await getSourceData("source-1", mockDrizzleDb as any);

      expect(result.eventCount).toBe(2);
      expect(result.researchNoteCount).toBe(1);
    });
  });

  describe("listSourcesData", () => {
    it("should list sources and handle empty results", async () => {
      (
        mockDrizzleDb.query.sources.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);
      (
        mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);

      const result = await listSourcesData(
        undefined,
        undefined,
        mockDrizzleDb as any
      );

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
        mockDrizzleDb.query.sources.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSources);
      (
        mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);

      const result = await listSourcesData(
        undefined,
        undefined,
        mockDrizzleDb as any
      );

      expect(result.items[0].createdAt).toBe(now.toISOString());
      expect(result.items[0].updatedAt).toBe(now.toISOString());
    });
  });

  describe("createSourceData", () => {
    it("should create source with all fields", async () => {
      const mockReturning = vi.fn(() =>
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

      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        values: vi.fn(() => ({ returning: mockReturning })),
      } as any);

      const result = await createSourceData(
        {
          title: "New Source",
          author: "Author",
          publicationDate: "2024",
          sourceType: "Book",
          confidence: "High",
        },
        mockDrizzleDb as any
      );

      expect(result.title).toBe("New Source");
      expect(result.id).toBe("new-source");
    });
  });

  describe("deleteSourceData", () => {
    it("should delete a source", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        id: "source-1",
      });

      const result = await deleteSourceData("source-1", mockDrizzleDb as any);

      expect(result.success).toBe(true);
    });

    it("should throw error when source not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await deleteSourceData("nonexistent", mockDrizzleDb as any);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Source not found");
      }
    });
  });

  describe("createResearchNoteData", () => {
    it("should create research note with person data", async () => {
      const mockPerson = { id: "p-1", firstName: "John", lastName: "Doe" };
      const mockReturning = vi.fn(() =>
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
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        id: "source-1",
      });
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockPerson);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        values: vi.fn(() => ({ returning: mockReturning })),
      } as any);

      const result = await createResearchNoteData(
        {
          sourceId: "source-1",
          personId: "p-1",
          eventType: "birth",
          findings: "Found record",
        },
        mockDrizzleDb as any
      );

      expect(result.findings).toBe("Found record");
      expect(result.person.firstName).toBe("John");
    });

    it("should throw error when source not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await createResearchNoteData(
          {
            sourceId: "nonexistent",
            personId: "p-1",
            eventType: "birth",
            findings: "Found",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Source not found");
      }
    });

    it("should throw error when person not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        id: "source-1",
      });
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await createResearchNoteData(
          {
            sourceId: "source-1",
            personId: "nonexistent",
            eventType: "birth",
            findings: "Found",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Person not found");
      }
    });
  });

  describe("deleteResearchNoteData", () => {
    it("should delete research note", async () => {
      (
        mockDrizzleDb.query.researchNotes.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        id: "note-1",
      });

      const result = await deleteResearchNoteData(
        "note-1",
        mockDrizzleDb as any
      );

      expect(result.success).toBe(true);
    });

    it("should throw error when note not found", async () => {
      (
        mockDrizzleDb.query.researchNotes.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await deleteResearchNoteData("nonexistent", mockDrizzleDb as any);
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
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);

      const result = await getResearchNotesData("p-1", mockDrizzleDb as any);

      expect(result).toEqual({});
    });

    it("should throw error when person not found", async () => {
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await getResearchNotesData("nonexistent", mockDrizzleDb as any);
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
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);

      const result = await generateCitationData(
        "source-1",
        "MLA",
        mockDrizzleDb as any
      );

      expect(result.format).toBe("MLA");
      expect(result.citation).toContain("Census Data");
      expect(result.citation).toContain("US Census Bureau");
    });

    it("should generate APA citation", async () => {
      const mockSource = {
        id: "source-1",
        title: "Census Data",
        author: "US Census Bureau",
        publicationDate: "1900",
        repository: "National Archives",
        description: "1900 Census",
      };

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);

      const result = await generateCitationData(
        "source-1",
        "APA",
        mockDrizzleDb as any
      );

      expect(result.format).toBe("APA");
      expect(result.citation).toContain("Census Data");
      expect(result.citation).toContain("(1900)");
    });

    it("should generate Chicago citation", async () => {
      const mockSource = {
        id: "source-1",
        title: "Census Data",
        author: "US Census Bureau",
        publicationDate: "1900",
        repository: "National Archives",
        description: "1900 Census",
      };

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);

      const result = await generateCitationData(
        "source-1",
        "CHICAGO",
        mockDrizzleDb as any
      );

      expect(result.format).toBe("CHICAGO");
      expect(result.citation).toContain("Census Data");
    });

    it("should generate Turabian citation", async () => {
      const mockSource = {
        id: "source-1",
        title: "Census Data",
        author: "US Census Bureau",
        publicationDate: "1900",
        repository: "National Archives",
        description: "1900 Census",
      };

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);

      const result = await generateCitationData(
        "source-1",
        "TURABIAN",
        mockDrizzleDb as any
      );

      expect(result.format).toBe("TURABIAN");
      expect(result.citation).toContain("Census Data");
    });

    it("should generate Evidence Explained citation", async () => {
      const mockSource = {
        id: "source-1",
        title: "Census Data",
        author: "US Census Bureau",
        publicationDate: "1900",
        repository: "National Archives",
        description: "1900 Census",
      };

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);

      const result = await generateCitationData(
        "source-1",
        "EVIDENCE_EXPLAINED",
        mockDrizzleDb as any
      );

      expect(result.format).toBe("EVIDENCE_EXPLAINED");
      expect(result.citation).toContain("Census Data");
      expect(result.citation).toContain("1900 Census");
    });

    it("should throw error when source not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await generateCitationData("nonexistent", "MLA", mockDrizzleDb as any);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Failed to generate citation");
      }
    });
  });

  describe("updateSourceData", () => {
    it("should update source successfully", async () => {
      const mockSource = {
        id: "source-1",
        title: "Original Title",
      };

      const mockUpdatedSource = {
        id: "source-1",
        title: "Updated Title",
        author: "Updated Author",
        publicationDate: "2024",
        sourceType: "Book",
        confidence: "High",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn(() => Promise.resolve([mockUpdatedSource]));

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: mockReturning,
          })),
        })),
      } as any);

      const result = await updateSourceData(
        "source-1",
        { title: "Updated Title", author: "Updated Author" },
        mockDrizzleDb as any
      );

      expect(result.title).toBe("Updated Title");
      expect(result.author).toBe("Updated Author");
    });

    it("should throw error when source not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await updateSourceData(
          "nonexistent",
          { title: "Updated" },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Source not found");
      }
    });

    it("should handle accessDate conversion", async () => {
      const mockSource = { id: "source-1" };
      const mockUpdatedSource = {
        id: "source-1",
        title: "Source",
        author: null,
        publicationDate: null,
        sourceType: null,
        confidence: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn(() => Promise.resolve([mockUpdatedSource]));

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: mockReturning,
          })),
        })),
      } as any);

      await updateSourceData(
        "source-1",
        { accessDate: "2024-01-15" },
        mockDrizzleDb as any
      );

      expect(mockDrizzleDb.update).toHaveBeenCalled();
    });
  });

  describe("updateResearchNoteData", () => {
    it("should update research note successfully", async () => {
      const mockNote = {
        id: "note-1",
        personId: "p-1",
      };

      const mockPerson = {
        id: "p-1",
        firstName: "John",
        lastName: "Doe",
      };

      const mockUpdatedNote = {
        id: "note-1",
        sourceId: "source-1",
        personId: "p-1",
        eventType: "birth",
        findings: "Updated findings",
        methodology: "Updated methodology",
        limitations: null,
        relatedSources: "[]",
        conclusionReliability: "High",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn(() => Promise.resolve([mockUpdatedNote]));

      (
        mockDrizzleDb.query.researchNotes.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockNote);
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: mockReturning,
          })),
        })),
      } as any);
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockPerson);

      const result = await updateResearchNoteData(
        "note-1",
        {
          findings: "Updated findings",
          methodology: "Updated methodology",
        },
        mockDrizzleDb as any
      );

      expect(result.findings).toBe("Updated findings");
      expect(result.methodology).toBe("Updated methodology");
      expect(result.person.firstName).toBe("John");
    });

    it("should throw error when research note not found", async () => {
      (
        mockDrizzleDb.query.researchNotes.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await updateResearchNoteData(
          "nonexistent",
          { findings: "Updated" },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Research note not found");
      }
    });
  });

  describe("linkSourceToEventData", () => {
    it("should create new event source link", async () => {
      const mockSource = { id: "source-1" };
      const mockPerson = { id: "p-1" };
      const mockEventSource = {
        id: "es-1",
        sourceId: "source-1",
        personId: "p-1",
        eventType: "birth",
        confidence: "High",
        sourceNotes: "Birth certificate",
      };

      const mockReturning = vi.fn(() => Promise.resolve([mockEventSource]));

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDrizzleDb.query.eventSources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        values: vi.fn(() => ({ returning: mockReturning })),
      } as any);

      const result = await linkSourceToEventData(
        {
          sourceId: "source-1",
          personId: "p-1",
          eventType: "birth",
          confidence: "High",
          sourceNotes: "Birth certificate",
        },
        mockDrizzleDb as any
      );

      expect(result.sourceId).toBe("source-1");
      expect(result.eventType).toBe("birth");
      expect(result.confidence).toBe("High");
    });

    it("should update existing event source link", async () => {
      const mockSource = { id: "source-1" };
      const mockPerson = { id: "p-1" };
      const mockExistingLink = {
        id: "es-1",
        sourceId: "source-1",
        personId: "p-1",
        eventType: "birth",
      };
      const mockUpdatedLink = {
        id: "es-1",
        sourceId: "source-1",
        personId: "p-1",
        eventType: "birth",
        confidence: "High",
        sourceNotes: "Updated notes",
      };

      const mockReturning = vi.fn(() => Promise.resolve([mockUpdatedLink]));

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDrizzleDb.query.eventSources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExistingLink);
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: mockReturning,
          })),
        })),
      } as any);

      const result = await linkSourceToEventData(
        {
          sourceId: "source-1",
          personId: "p-1",
          eventType: "birth",
          confidence: "High",
          sourceNotes: "Updated notes",
        },
        mockDrizzleDb as any
      );

      expect(result.confidence).toBe("High");
      expect(result.sourceNotes).toBe("Updated notes");
    });

    it("should throw error when source not found", async () => {
      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await linkSourceToEventData(
          {
            sourceId: "nonexistent",
            personId: "p-1",
            eventType: "birth",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Source not found");
      }
    });

    it("should throw error when person not found", async () => {
      const mockSource = { id: "source-1" };

      (
        mockDrizzleDb.query.sources.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSource);
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await linkSourceToEventData(
          {
            sourceId: "source-1",
            personId: "nonexistent",
            eventType: "birth",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect((err as Error).message).toBe("Person not found");
      }
    });
  });

  describe("getPersonSourcesData", () => {
    it("should return empty object for person with no sources", async () => {
      (
        mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);

      const result = await getPersonSourcesData("p-1", mockDrizzleDb as any);

      expect(result).toEqual({});
    });

    it("should group sources by event type", async () => {
      const mockEventSources = [
        {
          id: "es-1",
          sourceId: "source-1",
          personId: "p-1",
          eventType: "birth",
        },
        {
          id: "es-2",
          sourceId: "source-2",
          personId: "p-1",
          eventType: "marriage",
        },
      ];

      const mockSource1 = {
        id: "source-1",
        title: "Birth Certificate",
        author: null,
        publicationDate: null,
        description: null,
        repository: null,
        notes: null,
      };

      const mockSource2 = {
        id: "source-2",
        title: "Marriage Record",
        author: null,
        publicationDate: null,
        description: null,
        repository: null,
        notes: null,
      };

      // Mock the query chain
      const findManyMock = vi.fn().mockResolvedValueOnce(mockEventSources);
      const findFirstMock = vi
        .fn()
        .mockResolvedValueOnce(mockSource1)
        .mockResolvedValueOnce(mockSource2);

      mockDrizzleDb.query.eventSources.findMany = findManyMock;
      mockDrizzleDb.query.sources.findFirst = findFirstMock;

      const result = await getPersonSourcesData("p-1", mockDrizzleDb as any);

      expect(result).toHaveProperty("birth");
      expect(result).toHaveProperty("marriage");
      expect(result.birth).toHaveLength(1);
      expect(result.birth[0].title).toBe("Birth Certificate");
      expect(result.marriage).toHaveLength(1);
      expect(result.marriage[0].title).toBe("Marriage Record");
    });

    it("should not duplicate sources in same event type", async () => {
      const mockEventSources = [
        {
          id: "es-1",
          sourceId: "source-1",
          personId: "p-1",
          eventType: "birth",
        },
        {
          id: "es-2",
          sourceId: "source-1",
          personId: "p-1",
          eventType: "birth",
        },
      ];

      const mockSource = {
        id: "source-1",
        title: "Birth Certificate",
        author: null,
        publicationDate: null,
        description: null,
        repository: null,
        notes: null,
      };

      const findManyMock = vi.fn().mockResolvedValueOnce(mockEventSources);
      const findFirstMock = vi.fn().mockResolvedValueOnce(mockSource);

      mockDrizzleDb.query.eventSources.findMany = findManyMock;
      mockDrizzleDb.query.sources.findFirst = findFirstMock;

      const result = await getPersonSourcesData("p-1", mockDrizzleDb as any);

      expect(result).toHaveProperty("birth");
      expect(result.birth).toHaveLength(1);
    });

    it("should handle errors gracefully", async () => {
      const findManyMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("Database error"));
      mockDrizzleDb.query.eventSources.findMany = findManyMock;

      await expect(
        getPersonSourcesData("p-1", mockDrizzleDb as any)
      ).rejects.toThrow("Failed to fetch person sources");
    });
  });

  describe("listSourcesData with filters", () => {
    beforeEach(() => {
      // Clear all mocks before each test in this describe block
      (
        mockDrizzleDb.query.sources.findMany as ReturnType<typeof vi.fn>
      ).mockClear();
      (
        mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof vi.fn>
      ).mockClear();
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof vi.fn>
      ).mockClear();
    });

    it("should filter sources by type", async () => {
      const mockSources = [
        {
          id: "source-1",
          title: "Census 1900",
          author: null,
          publicationDate: null,
          sourceType: "Census",
          confidence: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (
        mockDrizzleDb.query.sources.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSources);

      const result = await listSourcesData(
        "Census",
        undefined,
        mockDrizzleDb as any
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].sourceType).toBe("Census");
    });

    it("should filter sources by personId", async () => {
      const mockSources = [
        {
          id: "source-1",
          title: "Census",
          author: null,
          publicationDate: null,
          sourceType: null,
          confidence: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "source-2",
          title: "Other Source",
          author: null,
          publicationDate: null,
          sourceType: null,
          confidence: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockEventSources = [
        { id: "es-1", sourceId: "source-1", personId: "p-1" },
      ];

      (
        mockDrizzleDb.query.sources.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSources);
      (
        mockDrizzleDb.query.eventSources.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockEventSources);
      (
        mockDrizzleDb.query.researchNotes.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);

      const result = await listSourcesData(
        undefined,
        "p-1",
        mockDrizzleDb as any
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("source-1");
      expect(result.total).toBe(1);
    });
  });

  describe("getResearchNotesData with grouping", () => {
    it("should group research notes by event type", async () => {
      const mockPerson = { id: "p-1", firstName: "John", lastName: "Doe" };
      const mockNotes = [
        {
          id: "note-1",
          personId: "p-1",
          eventType: "birth",
          findings: "Found birth record",
          methodology: null,
          limitations: null,
          relatedSources: "[]",
          conclusionReliability: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "note-2",
          personId: "p-1",
          eventType: "birth",
          findings: "Additional birth info",
          methodology: null,
          limitations: null,
          relatedSources: "[]",
          conclusionReliability: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "note-3",
          personId: "p-1",
          eventType: "marriage",
          findings: "Found marriage record",
          methodology: null,
          limitations: null,
          relatedSources: "[]",
          conclusionReliability: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const findFirstMock = vi.fn().mockResolvedValueOnce(mockPerson);
      const findManyMock = vi.fn().mockResolvedValueOnce(mockNotes);

      mockDrizzleDb.query.persons.findFirst = findFirstMock;
      mockDrizzleDb.query.researchNotes.findMany = findManyMock;

      const result = await getResearchNotesData("p-1", mockDrizzleDb as any);

      expect(result).toHaveProperty("birth");
      expect(result).toHaveProperty("marriage");
      expect(result.birth).toHaveLength(2);
      expect(result.marriage).toHaveLength(1);
      expect(result.birth[0].findings).toBe("Found birth record");
    });
  });
});
