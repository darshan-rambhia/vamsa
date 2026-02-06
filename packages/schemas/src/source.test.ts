/**
 * Unit Tests for Source Schemas
 * Tests Zod schema validation for source management and research notes
 */
import { describe, expect, it } from "vitest";
import {
  citationFormatEnum,
  citationGenerateSchema,
  confidenceEnum,
  linkSourceToEventSchema,
  reliabilityEnum,
  researchNoteCreateSchema,
  researchNoteUpdateSchema,
  sourceCreateSchema,
  sourceTypeEnum,
  sourceUpdateSchema,
} from "./source";
import type {
  CitationGenerateInput,
  LinkSourceToEventInput,
  ResearchNoteCreateOutput,
  ResearchNoteUpdateOutput,
  SourceCreateOutput,
  SourceUpdateOutput,
} from "./source";

describe("sourceTypeEnum", () => {
  it("should accept all valid source types", () => {
    const validTypes = [
      "BOOK",
      "ARTICLE",
      "WEBSITE",
      "ARCHIVE",
      "LETTER",
      "FAMILY_RECORD",
      "CENSUS",
      "VITAL_RECORD",
      "OTHER",
    ];

    validTypes.forEach((type) => {
      const result = sourceTypeEnum.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid source types", () => {
    const invalidTypes = ["book", "INVALID", "Magazine", "", null, 123];

    invalidTypes.forEach((type) => {
      const result = sourceTypeEnum.safeParse(type);
      expect(result.success).toBe(false);
    });
  });
});

describe("citationFormatEnum", () => {
  it("should accept all valid citation formats", () => {
    const validFormats = ["MLA", "APA", "CHICAGO"];

    validFormats.forEach((format) => {
      const result = citationFormatEnum.safeParse(format);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid citation formats", () => {
    const invalidFormats = ["mla", "apa", "chicago", "INVALID", "", null];

    invalidFormats.forEach((format) => {
      const result = citationFormatEnum.safeParse(format);
      expect(result.success).toBe(false);
    });
  });
});

describe("confidenceEnum", () => {
  it("should accept all valid confidence levels", () => {
    const validLevels = ["HIGH", "MEDIUM", "LOW"];

    validLevels.forEach((level) => {
      const result = confidenceEnum.safeParse(level);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid confidence levels", () => {
    const invalidLevels = ["high", "UNCERTAIN", "", null];

    invalidLevels.forEach((level) => {
      const result = confidenceEnum.safeParse(level);
      expect(result.success).toBe(false);
    });
  });
});

describe("reliabilityEnum", () => {
  it("should accept all valid reliability levels", () => {
    const validLevels = ["CONCLUSIVE", "PROBABLE", "POSSIBLE", "SPECULATIVE"];

    validLevels.forEach((level) => {
      const result = reliabilityEnum.safeParse(level);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid reliability levels", () => {
    const invalidLevels = ["conclusive", "UNKNOWN", "", null];

    invalidLevels.forEach((level) => {
      const result = reliabilityEnum.safeParse(level);
      expect(result.success).toBe(false);
    });
  });
});

describe("sourceCreateSchema", () => {
  describe("Valid inputs", () => {
    it("should validate minimal valid source with only title", () => {
      const source = {
        title: "A Historical Document",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should validate complete source with all fields", () => {
      const source = {
        title: "The Complete History",
        author: "John Smith",
        publicationDate: "2020-01-15",
        description: "A comprehensive history",
        repository: "National Archives",
        notes: "Important source",
        sourceType: "BOOK" as const,
        citationFormat: "MLA" as const,
        doi: "10.1234/example",
        url: "https://example.com/source",
        isbn: "9780123456789",
        callNumber: "HB123.45",
        accessDate: "2023-01-01",
        confidence: "HIGH" as const,
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should accept source with only required title field", () => {
      const source = { title: "Minimal Source" };
      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should accept with all optional fields omitted", () => {
      const source = {
        title: "Title Only",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });
  });

  describe("Title validation", () => {
    it("should reject empty title", () => {
      const source = { title: "" };
      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });

    it("should reject missing title", () => {
      const source = { author: "John Smith" };
      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });

    it("should accept title with exactly 1 character", () => {
      const source = { title: "A" };
      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should accept title with exactly 500 characters", () => {
      const source = { title: "x".repeat(500) };
      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should reject title exceeding 500 characters", () => {
      const source = { title: "x".repeat(501) };
      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });
  });

  describe("ISBN validation", () => {
    it("should accept valid 10-digit ISBN", () => {
      const source = {
        title: "Test",
        isbn: "0123456789",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should accept valid 13-digit ISBN", () => {
      const source = {
        title: "Test",
        isbn: "9780123456789",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should reject ISBN with 11 digits", () => {
      const source = {
        title: "Test",
        isbn: "01234567890",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });

    it("should reject ISBN with 12 digits", () => {
      const source = {
        title: "Test",
        isbn: "012345678901",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });

    it("should reject ISBN with non-digit characters", () => {
      const source = {
        title: "Test",
        isbn: "012345678X",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });

    it("should reject ISBN with dashes", () => {
      const source = {
        title: "Test",
        isbn: "978-0-123456-78-9",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });

    it("should accept ISBN as optional", () => {
      const source = { title: "Test" };
      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should accept ISBN as undefined", () => {
      const source = {
        title: "Test",
        isbn: undefined,
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });
  });

  describe("DOI validation", () => {
    it("should accept valid DOI format", () => {
      const source = {
        title: "Test",
        doi: "10.1234/example",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should accept DOI with complex suffix", () => {
      const source = {
        title: "Test",
        doi: "10.1234/nature.12345",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should accept DOI with URL-like characters", () => {
      const source = {
        title: "Test",
        doi: "10.5555/12345678901234567890",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should reject DOI without 10. prefix", () => {
      const source = {
        title: "Test",
        doi: "1234/example",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });

    it("should reject DOI with less than 4 digits after 10.", () => {
      const source = {
        title: "Test",
        doi: "10.123/example",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });

    it("should reject DOI missing suffix", () => {
      const source = {
        title: "Test",
        doi: "10.1234/",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });

    it("should accept DOI as optional", () => {
      const source = { title: "Test" };
      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });
  });

  describe("URL validation", () => {
    it("should accept valid HTTP URL", () => {
      const source = {
        title: "Test",
        url: "http://example.com",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should accept valid HTTPS URL", () => {
      const source = {
        title: "Test",
        url: "https://example.com/path",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should accept URL with query parameters", () => {
      const source = {
        title: "Test",
        url: "https://example.com/path?param=value&other=123",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should reject invalid URL without protocol", () => {
      const source = {
        title: "Test",
        url: "example.com",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });

    it("should reject invalid URL format", () => {
      const source = {
        title: "Test",
        url: "not a url",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(false);
    });

    it("should accept URL as optional", () => {
      const source = { title: "Test" };
      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });
  });

  describe("Date transformation", () => {
    it("should transform accessDate string to Date object", () => {
      const source = {
        title: "Test",
        accessDate: "2023-01-15",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessDate).toBeInstanceOf(Date);
      }
    });

    it("should accept accessDate as Date object", () => {
      const date = new Date("2023-01-15");
      const source = {
        title: "Test",
        accessDate: date,
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessDate).toBeInstanceOf(Date);
      }
    });

    it("should transform null accessDate to null", () => {
      const source = {
        title: "Test",
        accessDate: null,
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessDate).toBeNull();
      }
    });

    it("should transform undefined accessDate to null", () => {
      const source = {
        title: "Test",
        accessDate: undefined,
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessDate).toBeNull();
      }
    });

    it("should transform ISO date string to Date", () => {
      const source = {
        title: "Test",
        accessDate: "2023-01-15T10:30:00Z",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessDate).toBeInstanceOf(Date);
      }
    });

    it("should accept empty string accessDate", () => {
      const source = {
        title: "Test",
        accessDate: "",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessDate).toBeNull();
      }
    });
  });

  describe("Optional fields", () => {
    it("should accept empty string for optional fields", () => {
      const source = {
        title: "Test",
        author: "",
        publicationDate: "",
        description: "",
        repository: "",
        notes: "",
      };

      const result = sourceCreateSchema.safeParse(source);
      expect(result.success).toBe(true);
    });

    it("should accept all optional sourceType values", () => {
      const types = ["BOOK", "ARTICLE", "WEBSITE", "ARCHIVE", "LETTER"];

      types.forEach((type) => {
        const source = {
          title: "Test",
          sourceType: type as any,
        };

        const result = sourceCreateSchema.safeParse(source);
        expect(result.success).toBe(true);
      });
    });

    it("should accept all optional citationFormat values", () => {
      const formats = ["MLA", "APA", "CHICAGO"];

      formats.forEach((format) => {
        const source = {
          title: "Test",
          citationFormat: format as any,
        };

        const result = sourceCreateSchema.safeParse(source);
        expect(result.success).toBe(true);
      });
    });

    it("should accept all optional confidence values", () => {
      const levels = ["HIGH", "MEDIUM", "LOW"];

      levels.forEach((level) => {
        const source = {
          title: "Test",
          confidence: level as any,
        };

        const result = sourceCreateSchema.safeParse(source);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Type inference", () => {
    it("should infer correct output type", () => {
      const source: SourceCreateOutput = {
        title: "Test",
        accessDate: null,
      };

      expect(source.title).toBe("Test");
    });
  });
});

describe("sourceUpdateSchema", () => {
  describe("Valid inputs", () => {
    it("should accept partial updates with id", () => {
      const update: SourceUpdateOutput = {
        id: "source-123",
        title: "Updated Title",
      };

      const result = sourceUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should require id field", () => {
      const update = { title: "Updated Title" };
      const result = sourceUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should accept id with all optional fields", () => {
      const update = {
        id: "source-123",
        title: "New Title",
        author: "New Author",
        doi: "10.1234/updated",
        url: "https://updated.com",
      };

      const result = sourceUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should reject empty id", () => {
      const update = {
        id: "",
        title: "Title",
      };

      const result = sourceUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe("Partial field updates", () => {
    it("should allow updating only title", () => {
      const result = sourceUpdateSchema.safeParse({
        id: "123",
        title: "New Title",
      });

      expect(result.success).toBe(true);
    });

    it("should allow updating only author", () => {
      const result = sourceUpdateSchema.safeParse({
        id: "123",
        author: "New Author",
      });

      expect(result.success).toBe(true);
    });

    it("should allow updating only ISBN", () => {
      const result = sourceUpdateSchema.safeParse({
        id: "123",
        isbn: "9780123456789",
      });

      expect(result.success).toBe(true);
    });

    it("should allow updating only confidence", () => {
      const result = sourceUpdateSchema.safeParse({
        id: "123",
        confidence: "HIGH" as const,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Type inference", () => {
    it("should infer correct update type", () => {
      const update: SourceUpdateOutput = {
        id: "source-123",
      };

      expect(update.id).toBe("source-123");
    });
  });
});

describe("researchNoteCreateSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete research note", () => {
      const note = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
        findings: "Found conclusive evidence of birth date",
        methodology: "Cross-referenced census records",
        limitations: "Limited by document quality",
        relatedSources: ["source-789", "source-101"],
        conclusionReliability: "CONCLUSIVE" as const,
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(true);
    });

    it("should validate minimal research note with required fields only", () => {
      const note = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
        findings: "Evidence found",
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(true);
    });

    it("should accept research note with optional fields omitted", () => {
      const note = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
        findings: "Evidence",
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(true);
    });
  });

  describe("Required field validation", () => {
    it("should reject missing sourceId", () => {
      const note = {
        personId: "person-456",
        eventType: "birth",
        findings: "Evidence",
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(false);
    });

    it("should reject empty sourceId", () => {
      const note = {
        sourceId: "",
        personId: "person-456",
        eventType: "birth",
        findings: "Evidence",
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(false);
    });

    it("should reject missing personId", () => {
      const note = {
        sourceId: "source-123",
        eventType: "birth",
        findings: "Evidence",
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(false);
    });

    it("should reject empty personId", () => {
      const note = {
        sourceId: "source-123",
        personId: "",
        eventType: "birth",
        findings: "Evidence",
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(false);
    });

    it("should reject missing eventType", () => {
      const note = {
        sourceId: "source-123",
        personId: "person-456",
        findings: "Evidence",
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(false);
    });

    it("should reject empty eventType", () => {
      const note = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "",
        findings: "Evidence",
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(false);
    });

    it("should reject missing findings", () => {
      const note = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(false);
    });

    it("should reject empty findings", () => {
      const note = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
        findings: "",
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(false);
    });
  });

  describe("relatedSources transformation", () => {
    it("should transform array of source IDs to JSON string", () => {
      const note = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
        findings: "Evidence",
        relatedSources: ["source-789", "source-101"],
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.relatedSources).toBe("string");
        const parsed = JSON.parse(result.data.relatedSources as string);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toEqual(["source-789", "source-101"]);
      }
    });

    it("should transform empty array to JSON string", () => {
      const note = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
        findings: "Evidence",
        relatedSources: [],
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.relatedSources).toBe("string");
        const parsed = JSON.parse(result.data.relatedSources as string);
        expect(Array.isArray(parsed)).toBe(true);
      }
    });

    it("should transform undefined relatedSources to null", () => {
      const note = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
        findings: "Evidence",
        relatedSources: undefined,
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.relatedSources).toBeNull();
      }
    });
  });

  describe("Reliability enum validation", () => {
    it("should accept all reliability levels", () => {
      const levels = ["CONCLUSIVE", "PROBABLE", "POSSIBLE", "SPECULATIVE"];

      levels.forEach((level) => {
        const note = {
          sourceId: "source-123",
          personId: "person-456",
          eventType: "birth",
          findings: "Evidence",
          conclusionReliability: level as any,
        };

        const result = researchNoteCreateSchema.safeParse(note);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid reliability level", () => {
      const note = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
        findings: "Evidence",
        conclusionReliability: "INVALID" as any,
      };

      const result = researchNoteCreateSchema.safeParse(note);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct output type", () => {
      const note: ResearchNoteCreateOutput = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
        findings: "Evidence",
        relatedSources: null,
      };

      expect(note.sourceId).toBe("source-123");
    });
  });
});

describe("researchNoteUpdateSchema", () => {
  describe("Valid inputs", () => {
    it("should accept partial updates with id", () => {
      const update: ResearchNoteUpdateOutput = {
        id: "note-123",
        findings: "Updated findings",
      };

      const result = researchNoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should require id field", () => {
      const update = { findings: "Updated" };
      const result = researchNoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should reject empty id", () => {
      const update = {
        id: "",
        findings: "Updated",
      };

      const result = researchNoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });
});

describe("citationGenerateSchema", () => {
  describe("Valid inputs", () => {
    it("should validate with required sourceId and default format", () => {
      const input: CitationGenerateInput = {
        sourceId: "source-123",
        format: "MLA",
      };

      const result = citationGenerateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should use MLA as default format", () => {
      const input = { sourceId: "source-123" };
      const result = citationGenerateSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe("MLA");
      }
    });

    it("should accept APA format", () => {
      const input = {
        sourceId: "source-123",
        format: "APA" as const,
      };

      const result = citationGenerateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept CHICAGO format", () => {
      const input = {
        sourceId: "source-123",
        format: "CHICAGO" as const,
      };

      const result = citationGenerateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("Invalid inputs", () => {
    it("should reject missing sourceId", () => {
      const input = { format: "MLA" as const };
      const result = citationGenerateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject empty sourceId", () => {
      const input = { sourceId: "", format: "MLA" as const };
      const result = citationGenerateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject invalid format", () => {
      const input = {
        sourceId: "source-123",
        format: "INVALID" as any,
      };

      const result = citationGenerateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe("linkSourceToEventSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete source-event link", () => {
      const link: LinkSourceToEventInput = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
        confidence: "HIGH" as const,
        sourceNotes: "Supporting evidence",
      };

      const result = linkSourceToEventSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should validate minimal source-event link", () => {
      const link = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
      };

      const result = linkSourceToEventSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should accept all confidence levels", () => {
      const confidences = ["HIGH", "MEDIUM", "LOW"];

      confidences.forEach((confidence) => {
        const link = {
          sourceId: "source-123",
          personId: "person-456",
          eventType: "birth",
          confidence: confidence as any,
        };

        const result = linkSourceToEventSchema.safeParse(link);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Required field validation", () => {
    it("should reject missing sourceId", () => {
      const link = {
        personId: "person-456",
        eventType: "birth",
      };

      const result = linkSourceToEventSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject empty sourceId", () => {
      const link = {
        sourceId: "",
        personId: "person-456",
        eventType: "birth",
      };

      const result = linkSourceToEventSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject missing personId", () => {
      const link = {
        sourceId: "source-123",
        eventType: "birth",
      };

      const result = linkSourceToEventSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject empty personId", () => {
      const link = {
        sourceId: "source-123",
        personId: "",
        eventType: "birth",
      };

      const result = linkSourceToEventSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject missing eventType", () => {
      const link = {
        sourceId: "source-123",
        personId: "person-456",
      };

      const result = linkSourceToEventSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject empty eventType", () => {
      const link = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "",
      };

      const result = linkSourceToEventSchema.safeParse(link);
      expect(result.success).toBe(false);
    });
  });

  describe("Invalid inputs", () => {
    it("should reject invalid confidence level", () => {
      const link = {
        sourceId: "source-123",
        personId: "person-456",
        eventType: "birth",
        confidence: "INVALID" as any,
      };

      const result = linkSourceToEventSchema.safeParse(link);
      expect(result.success).toBe(false);
    });
  });
});
