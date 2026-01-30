import { createServerFn } from "@tanstack/react-start";
import {
  citationGenerateSchema,
  linkSourceToEventSchema,
  researchNoteCreateSchema,
  researchNoteUpdateSchema,
  sourceCreateSchema,
  sourceUpdateSchema,
} from "@vamsa/schemas";
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
} from "@vamsa/lib/server/business";
import type {
  CitationFormat,
  EventSourceResult,
  GeneratedCitation,
  PersonSourcesResponse,
  ResearchNoteResult,
  ResearchNotesGrouped,
  SourceCreateResult,
  SourceDetail,
  SourceListResult,
  SourceUpdateResult,
  SourceWithEvents,
} from "@vamsa/lib/server/business";

/**
 * Server function: Get a single source with all details
 * @returns Source detail with related data
 * @throws Error if source not found
 */
export const getSource = createServerFn({ method: "GET" })
  .inputValidator((data: { sourceId: string }) => data)
  .handler(async ({ data }): Promise<SourceDetail> => {
    return getSourceData(data.sourceId);
  });

/**
 * Server function: List all sources with optional filters
 * @returns List of sources matching filters
 */
export const listSources = createServerFn({ method: "GET" })
  .inputValidator((data: { type?: string; personId?: string } = {}) => data)
  .handler(async ({ data }): Promise<SourceListResult> => {
    return listSourcesData(data.type, data.personId);
  });

/**
 * Server function: Create a new source
 * @returns Created source
 */
export const createSource = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return sourceCreateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<SourceCreateResult> => {
    return createSourceData(data as Parameters<typeof createSourceData>[0]);
  });

/**
 * Server function: Update an existing source
 * @returns Updated source
 * @throws Error if source not found
 */
export const updateSource = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return sourceUpdateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<SourceUpdateResult> => {
    const { id, ...updates } = data;
    return updateSourceData(
      id,
      updates as Parameters<typeof updateSourceData>[1]
    );
  });

/**
 * Server function: Delete a source
 * @returns Success indicator
 * @throws Error if source not found
 */
export const deleteSource = createServerFn({ method: "POST" })
  .inputValidator((data: { sourceId: string }) => data)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    return deleteSourceData(data.sourceId);
  });

/**
 * Server function: Create a research note
 * @returns Created research note
 * @throws Error if source or person not found
 */
export const createResearchNote = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return researchNoteCreateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<ResearchNoteResult> => {
    return createResearchNoteData(
      data as Parameters<typeof createResearchNoteData>[0]
    );
  });

/**
 * Server function: Update a research note
 * @returns Updated research note
 * @throws Error if research note not found
 */
export const updateResearchNote = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return researchNoteUpdateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<ResearchNoteResult> => {
    const { id, ...updates } = data;
    return updateResearchNoteData(
      id,
      updates as Parameters<typeof updateResearchNoteData>[1]
    );
  });

/**
 * Server function: Delete a research note
 * @returns Success indicator
 * @throws Error if research note not found
 */
export const deleteResearchNote = createServerFn({ method: "POST" })
  .inputValidator((data: { noteId: string }) => data)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    return deleteResearchNoteData(data.noteId);
  });

/**
 * Server function: Link source to event with confidence and notes
 * @returns Created or updated event source link
 * @throws Error if source or person not found
 */
export const linkSourceToEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return linkSourceToEventSchema.parse(data);
  })
  .handler(async ({ data }): Promise<EventSourceResult> => {
    return linkSourceToEventData(
      data as Parameters<typeof linkSourceToEventData>[0]
    );
  });

/**
 * Server function: Get all research notes for a person
 * @returns Research notes grouped by event type
 * @throws Error if person not found
 */
export const getResearchNotes = createServerFn({ method: "GET" })
  .inputValidator((data: { personId: string }) => data)
  .handler(async ({ data }): Promise<ResearchNotesGrouped> => {
    return getResearchNotesData(data.personId);
  });

/**
 * Server function: Generate formatted citation
 * @returns Citation object with format and generated citation text
 * @throws Error if source not found
 */
export const generateCitation = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return citationGenerateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<GeneratedCitation> => {
    return generateCitationData(data.sourceId, data.format as CitationFormat);
  });

/**
 * Server function: Get all sources for a person, grouped by event type (legacy format)
 * @returns Sources grouped by event type
 */
export const getPersonSources = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<PersonSourcesResponse> => {
    return getPersonSourcesData(data.id);
  });

// Export types for public API
export type {
  SourceDetail,
  SourceListResult,
  SourceCreateResult,
  SourceUpdateResult,
  ResearchNoteResult,
  EventSourceResult,
  ResearchNotesGrouped,
  PersonSourcesResponse,
  SourceWithEvents,
};
