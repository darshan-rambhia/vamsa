import { z } from "zod";

export const sourceTypeEnum = z.enum([
  "BOOK",
  "ARTICLE",
  "WEBSITE",
  "ARCHIVE",
  "LETTER",
  "FAMILY_RECORD",
  "CENSUS",
  "VITAL_RECORD",
  "OTHER",
]);

export const citationFormatEnum = z.enum(["MLA", "APA", "CHICAGO"]);

export const confidenceEnum = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const reliabilityEnum = z.enum([
  "CONCLUSIVE",
  "PROBABLE",
  "POSSIBLE",
  "SPECULATIVE",
]);

// Validate ISBN format (basic check for 10 or 13 digits)
const isbnValidator = z
  .string()
  .regex(/^(?:\d{10}|\d{13})$/, "ISBN must be 10 or 13 digits")
  .optional();

// Validate DOI format (basic check)
const doiValidator = z
  .string()
  .regex(
    /^10\.\d{4,}\/\S+$/,
    "DOI must be in valid format (e.g., 10.1234/example)"
  )
  .optional();

// Validate URL format
const urlValidator = z.string().url("Must be a valid URL").optional();

export const sourceCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  author: z.string().optional(),
  publicationDate: z.string().optional(),
  description: z.string().optional(),
  repository: z.string().optional(),
  notes: z.string().optional(),
  sourceType: sourceTypeEnum.optional(),
  citationFormat: citationFormatEnum.optional(),
  doi: doiValidator,
  url: urlValidator,
  isbn: isbnValidator,
  callNumber: z.string().optional(),
  accessDate: z
    .union([z.string(), z.date(), z.null(), z.undefined()])
    .transform((val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      return new Date(val);
    })
    .optional(),
  confidence: confidenceEnum.optional(),
});

export const sourceUpdateSchema = sourceCreateSchema.partial().extend({
  id: z.string().min(1, "Source ID is required"),
});

export const researchNoteCreateSchema = z.object({
  sourceId: z.string().min(1, "Source is required"),
  personId: z.string().min(1, "Person is required"),
  eventType: z.string().min(1, "Event type is required"),
  findings: z.string().min(1, "Findings are required"),
  methodology: z.string().optional(),
  limitations: z.string().optional(),
  relatedSources: z
    .array(z.string())
    .optional()
    .transform((val) => (val ? JSON.stringify(val) : null)),
  conclusionReliability: reliabilityEnum.optional(),
});

export const researchNoteUpdateSchema = researchNoteCreateSchema
  .partial()
  .extend({
    id: z.string().min(1, "Research note ID is required"),
  });

export const citationGenerateSchema = z.object({
  sourceId: z.string().min(1, "Source ID is required"),
  format: citationFormatEnum.default("MLA"),
});

export const linkSourceToEventSchema = z.object({
  sourceId: z.string().min(1, "Source is required"),
  personId: z.string().min(1, "Person is required"),
  eventType: z.string().min(1, "Event type is required"),
  confidence: confidenceEnum.optional(),
  sourceNotes: z.string().optional(),
});

export type SourceType = z.infer<typeof sourceTypeEnum>;
export type CitationFormat = z.infer<typeof citationFormatEnum>;
export type Confidence = z.infer<typeof confidenceEnum>;
export type Reliability = z.infer<typeof reliabilityEnum>;
export type SourceCreateInput = z.input<typeof sourceCreateSchema>;
export type SourceCreateOutput = z.infer<typeof sourceCreateSchema>;
export type SourceUpdateInput = z.input<typeof sourceUpdateSchema>;
export type SourceUpdateOutput = z.infer<typeof sourceUpdateSchema>;
export type ResearchNoteCreateInput = z.input<typeof researchNoteCreateSchema>;
export type ResearchNoteCreateOutput = z.infer<typeof researchNoteCreateSchema>;
export type ResearchNoteUpdateInput = z.input<typeof researchNoteUpdateSchema>;
export type ResearchNoteUpdateOutput = z.infer<typeof researchNoteUpdateSchema>;
export type CitationGenerateInput = z.infer<typeof citationGenerateSchema>;
export type LinkSourceToEventInput = z.infer<typeof linkSourceToEventSchema>;
