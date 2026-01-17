import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";
import { logger, serializeError } from "@vamsa/lib/logger";

/**
 * Type for the database client used by sources functions.
 * This allows dependency injection for testing.
 */
export type SourcesDb = Pick<
  PrismaClient,
  "source" | "researchNote" | "eventSource" | "person"
>;

/**
 * Source details with related data
 */
export interface SourceDetail {
  id: string;
  title: string;
  author: string | null;
  publicationDate: string | null;
  description: string | null;
  repository: string | null;
  notes: string | null;
  sourceType: string | null;
  citationFormat: string | null;
  doi: string | null;
  url: string | null;
  isbn: string | null;
  callNumber: string | null;
  accessDate: string | null;
  confidence: string | null;
  createdAt: string;
  updatedAt: string;
  eventSources: Array<{
    id: string;
    personId: string;
    eventType: string;
    confidence: string | null;
    sourceNotes: string | null;
    person: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  researchNotesRelated: Array<{
    id: string;
    personId: string;
    eventType: string;
    findings: string;
    methodology: string | null;
    limitations: string | null;
    relatedSources: string[];
    conclusionReliability: string | null;
    createdAt: string;
    updatedAt: string;
    person: {
      id: string;
      firstName: string;
      lastName: string;
    };
    createdBy: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }>;
  eventCount: number;
  researchNoteCount: number;
}

/**
 * Source list item
 */
export interface SourceListItem {
  id: string;
  title: string;
  author: string | null;
  publicationDate: string | null;
  sourceType: string | null;
  confidence: string | null;
  createdAt: string;
  updatedAt: string;
  eventCount: number;
  researchNoteCount: number;
}

/**
 * Source list result with pagination
 */
export interface SourceListResult {
  items: SourceListItem[];
  total: number;
}

/**
 * Created source result
 */
export interface SourceCreateResult {
  id: string;
  title: string;
  author: string | null;
  publicationDate: string | null;
  sourceType: string | null;
  confidence: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Updated source result
 */
export interface SourceUpdateResult {
  id: string;
  title: string;
  author: string | null;
  publicationDate: string | null;
  sourceType: string | null;
  confidence: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Research note result
 */
export interface ResearchNoteResult {
  id: string;
  sourceId: string;
  personId: string;
  eventType: string;
  findings: string;
  methodology: string | null;
  limitations: string | null;
  relatedSources: string[];
  conclusionReliability: string | null;
  createdAt: string;
  updatedAt: string;
  person: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Event source link result
 */
export interface EventSourceResult {
  id: string;
  sourceId: string;
  personId: string;
  eventType: string;
  confidence: string | null;
  sourceNotes: string | null;
}

/**
 * Research notes grouped by event type
 */
export interface ResearchNotesGrouped {
  [eventType: string]: Array<{
    id: string;
    eventType: string;
    findings: string;
    methodology: string | null;
    limitations: string | null;
    relatedSources: string[];
    conclusionReliability: string | null;
    createdAt: string;
    updatedAt: string;
    source: {
      id: string;
      title: string;
      author: string | null;
      sourceType: string | null;
    };
    createdBy: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }>;
}

/**
 * Person sources response (legacy format)
 */
export interface SourceWithEvents {
  id: string;
  title: string;
  author: string | null;
  publicationDate: string | null;
  description: string | null;
  repository: string | null;
  notes: string | null;
  eventTypes: string[];
}

export interface PersonSourcesResponse {
  [eventType: string]: SourceWithEvents[];
}

/**
 * Get a single source with all details
 * @param sourceId - The ID of the source to fetch
 * @param db - Optional database client (defaults to prisma)
 * @returns Complete source details with related data
 * @throws Error if source not found
 */
export async function getSourceData(
  sourceId: string,
  db: SourcesDb = defaultPrisma
): Promise<SourceDetail> {
  const source = await db.source.findUnique({
    where: { id: sourceId },
    include: {
      eventSources: {
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      researchNotes: {
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!source) {
    throw new Error("Source not found");
  }

  return {
    id: source.id,
    title: source.title,
    author: source.author,
    publicationDate: source.publicationDate,
    description: source.description,
    repository: source.repository,
    notes: source.notes,
    sourceType: source.sourceType,
    citationFormat: source.citationFormat,
    doi: source.doi,
    url: source.url,
    isbn: source.isbn,
    callNumber: source.callNumber,
    accessDate: source.accessDate?.toISOString() ?? null,
    confidence: source.confidence,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
    eventSources: source.eventSources.map((es) => ({
      id: es.id,
      personId: es.personId,
      eventType: es.eventType,
      confidence: es.confidence,
      sourceNotes: es.sourceNotes,
      person: es.person,
    })),
    researchNotesRelated: source.researchNotes.map((rn) => ({
      id: rn.id,
      personId: rn.personId,
      eventType: rn.eventType,
      findings: rn.findings,
      methodology: rn.methodology,
      limitations: rn.limitations,
      relatedSources: rn.relatedSources ? JSON.parse(rn.relatedSources) : [],
      conclusionReliability: rn.conclusionReliability,
      createdAt: rn.createdAt.toISOString(),
      updatedAt: rn.updatedAt.toISOString(),
      person: rn.person,
      createdBy: rn.createdBy,
    })),
    eventCount: source.eventSources.length,
    researchNoteCount: source.researchNotes.length,
  };
}

/**
 * List all sources with optional filters
 * @param type - Optional source type filter
 * @param personId - Optional person ID filter
 * @param db - Optional database client (defaults to prisma)
 * @returns List of sources matching filters
 */
export async function listSourcesData(
  type?: string,
  personId?: string,
  db: SourcesDb = defaultPrisma
): Promise<SourceListResult> {
  const where: Record<string, string> = {};

  if (type) {
    where.sourceType = type;
  }

  let sources = await db.source.findMany({
    where,
    include: {
      eventSources: true,
      researchNotes: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter by personId if provided
  if (personId) {
    sources = sources.filter(
      (source) =>
        source.eventSources.some((es) => es.personId === personId) ||
        source.researchNotes.some((rn) => rn.personId === personId)
    );
  }

  return {
    items: sources.map((source) => ({
      id: source.id,
      title: source.title,
      author: source.author,
      publicationDate: source.publicationDate,
      sourceType: source.sourceType,
      confidence: source.confidence,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      eventCount: source.eventSources.length,
      researchNoteCount: source.researchNotes.length,
    })),
    total: sources.length,
  };
}

/**
 * Create a new source
 * @param data - Source creation data
 * @param db - Optional database client (defaults to prisma)
 * @returns Created source
 */
export async function createSourceData(
  data: {
    title: string;
    author?: string | null;
    publicationDate?: string | null;
    description?: string | null;
    repository?: string | null;
    notes?: string | null;
    sourceType?: string | null;
    citationFormat?: string | null;
    doi?: string | null;
    url?: string | null;
    isbn?: string | null;
    callNumber?: string | null;
    accessDate?: string | null;
    confidence?: string | null;
  },
  db: SourcesDb = defaultPrisma
): Promise<SourceCreateResult> {
  const source = await db.source.create({
    data: {
      title: data.title,
      author: data.author || null,
      publicationDate: data.publicationDate || null,
      description: data.description || null,
      repository: data.repository || null,
      notes: data.notes || null,
      sourceType: data.sourceType || null,
      citationFormat: data.citationFormat || null,
      doi: data.doi || null,
      url: data.url || null,
      isbn: data.isbn || null,
      callNumber: data.callNumber || null,
      accessDate: data.accessDate ? new Date(data.accessDate) : null,
      confidence: data.confidence || null,
    },
  });

  return {
    id: source.id,
    title: source.title,
    author: source.author,
    publicationDate: source.publicationDate,
    sourceType: source.sourceType,
    confidence: source.confidence,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
  };
}

/**
 * Update an existing source
 * @param id - Source ID
 * @param updates - Fields to update
 * @param db - Optional database client (defaults to prisma)
 * @returns Updated source
 * @throws Error if source not found
 */
export async function updateSourceData(
  id: string,
  updates: Partial<{
    title: string;
    author: string | null;
    publicationDate: string | null;
    description: string | null;
    repository: string | null;
    notes: string | null;
    sourceType: string | null;
    citationFormat: string | null;
    doi: string | null;
    url: string | null;
    isbn: string | null;
    callNumber: string | null;
    accessDate: string | null;
    confidence: string | null;
  }>,
  db: SourcesDb = defaultPrisma
): Promise<SourceUpdateResult> {
  // Verify source exists
  const source = await db.source.findUnique({
    where: { id },
  });

  if (!source) {
    throw new Error("Source not found");
  }

  const updatedSource = await db.source.update({
    where: { id },
    data: {
      ...updates,
      accessDate: updates.accessDate ? new Date(updates.accessDate) : undefined,
    },
  });

  return {
    id: updatedSource.id,
    title: updatedSource.title,
    author: updatedSource.author,
    publicationDate: updatedSource.publicationDate,
    sourceType: updatedSource.sourceType,
    confidence: updatedSource.confidence,
    createdAt: updatedSource.createdAt.toISOString(),
    updatedAt: updatedSource.updatedAt.toISOString(),
  };
}

/**
 * Delete a source
 * @param sourceId - Source ID to delete
 * @param db - Optional database client (defaults to prisma)
 * @returns Success indicator
 * @throws Error if source not found
 */
export async function deleteSourceData(
  sourceId: string,
  db: SourcesDb = defaultPrisma
): Promise<{ success: boolean }> {
  // Verify source exists
  const source = await db.source.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error("Source not found");
  }

  await db.source.delete({
    where: { id: sourceId },
  });

  return { success: true };
}

/**
 * Create a research note
 * @param data - Research note creation data
 * @param db - Optional database client (defaults to prisma)
 * @returns Created research note
 * @throws Error if source or person not found
 */
export async function createResearchNoteData(
  data: {
    sourceId: string;
    personId: string;
    eventType: string;
    findings: string;
    methodology?: string | null;
    limitations?: string | null;
    relatedSources?: string;
    conclusionReliability?: string | null;
  },
  db: SourcesDb = defaultPrisma
): Promise<ResearchNoteResult> {
  // Verify source exists
  const source = await db.source.findUnique({
    where: { id: data.sourceId },
  });

  if (!source) {
    throw new Error("Source not found");
  }

  // Verify person exists
  const person = await db.person.findUnique({
    where: { id: data.personId },
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const researchNote = await db.researchNote.create({
    data: {
      sourceId: data.sourceId,
      personId: data.personId,
      eventType: data.eventType,
      findings: data.findings,
      methodology: data.methodology || null,
      limitations: data.limitations || null,
      relatedSources: data.relatedSources,
      conclusionReliability: data.conclusionReliability || null,
    },
    include: {
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return {
    id: researchNote.id,
    sourceId: researchNote.sourceId,
    personId: researchNote.personId,
    eventType: researchNote.eventType,
    findings: researchNote.findings,
    methodology: researchNote.methodology,
    limitations: researchNote.limitations,
    relatedSources: researchNote.relatedSources
      ? JSON.parse(researchNote.relatedSources)
      : [],
    conclusionReliability: researchNote.conclusionReliability,
    createdAt: researchNote.createdAt.toISOString(),
    updatedAt: researchNote.updatedAt.toISOString(),
    person: researchNote.person,
  };
}

/**
 * Update a research note
 * @param id - Research note ID
 * @param updates - Fields to update
 * @param db - Optional database client (defaults to prisma)
 * @returns Updated research note
 * @throws Error if research note not found
 */
export async function updateResearchNoteData(
  id: string,
  updates: Partial<{
    sourceId: string;
    personId: string;
    eventType: string;
    findings: string;
    methodology: string | null;
    limitations: string | null;
    relatedSources: string;
    conclusionReliability: string | null;
  }>,
  db: SourcesDb = defaultPrisma
): Promise<ResearchNoteResult> {
  // Verify research note exists
  const researchNote = await db.researchNote.findUnique({
    where: { id },
  });

  if (!researchNote) {
    throw new Error("Research note not found");
  }

  const updatedNote = await db.researchNote.update({
    where: { id },
    data: updates,
    include: {
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return {
    id: updatedNote.id,
    sourceId: updatedNote.sourceId,
    personId: updatedNote.personId,
    eventType: updatedNote.eventType,
    findings: updatedNote.findings,
    methodology: updatedNote.methodology,
    limitations: updatedNote.limitations,
    relatedSources: updatedNote.relatedSources
      ? JSON.parse(updatedNote.relatedSources)
      : [],
    conclusionReliability: updatedNote.conclusionReliability,
    createdAt: updatedNote.createdAt.toISOString(),
    updatedAt: updatedNote.updatedAt.toISOString(),
    person: updatedNote.person,
  };
}

/**
 * Delete a research note
 * @param noteId - Research note ID to delete
 * @param db - Optional database client (defaults to prisma)
 * @returns Success indicator
 * @throws Error if research note not found
 */
export async function deleteResearchNoteData(
  noteId: string,
  db: SourcesDb = defaultPrisma
): Promise<{ success: boolean }> {
  // Verify research note exists
  const researchNote = await db.researchNote.findUnique({
    where: { id: noteId },
  });

  if (!researchNote) {
    throw new Error("Research note not found");
  }

  await db.researchNote.delete({
    where: { id: noteId },
  });

  return { success: true };
}

/**
 * Link source to event with confidence and notes
 * @param data - Link data including sourceId, personId, eventType, confidence, sourceNotes
 * @param db - Optional database client (defaults to prisma)
 * @returns Created or updated event source link
 * @throws Error if source or person not found
 */
export async function linkSourceToEventData(
  data: {
    sourceId: string;
    personId: string;
    eventType: string;
    confidence?: string | null;
    sourceNotes?: string | null;
  },
  db: SourcesDb = defaultPrisma
): Promise<EventSourceResult> {
  // Verify source exists
  const source = await db.source.findUnique({
    where: { id: data.sourceId },
  });

  if (!source) {
    throw new Error("Source not found");
  }

  // Verify person exists
  const person = await db.person.findUnique({
    where: { id: data.personId },
  });

  if (!person) {
    throw new Error("Person not found");
  }

  // Check if link already exists
  const existingLink = await db.eventSource.findUnique({
    where: {
      sourceId_personId_eventType: {
        sourceId: data.sourceId,
        personId: data.personId,
        eventType: data.eventType,
      },
    },
  });

  if (existingLink) {
    // Update existing link
    const updated = await db.eventSource.update({
      where: { id: existingLink.id },
      data: {
        confidence: data.confidence || null,
        sourceNotes: data.sourceNotes || null,
      },
    });

    return {
      id: updated.id,
      sourceId: updated.sourceId,
      personId: updated.personId,
      eventType: updated.eventType,
      confidence: updated.confidence,
      sourceNotes: updated.sourceNotes,
    };
  }

  // Create new link
  const eventSource = await db.eventSource.create({
    data: {
      sourceId: data.sourceId,
      personId: data.personId,
      eventType: data.eventType,
      confidence: data.confidence || null,
      sourceNotes: data.sourceNotes || null,
    },
  });

  return {
    id: eventSource.id,
    sourceId: eventSource.sourceId,
    personId: eventSource.personId,
    eventType: eventSource.eventType,
    confidence: eventSource.confidence,
    sourceNotes: eventSource.sourceNotes,
  };
}

/**
 * Get all research notes for a person, grouped by event type
 * @param personId - Person ID
 * @param db - Optional database client (defaults to prisma)
 * @returns Research notes grouped by event type
 * @throws Error if person not found
 */
export async function getResearchNotesData(
  personId: string,
  db: SourcesDb = defaultPrisma
): Promise<ResearchNotesGrouped> {
  // Verify person exists
  const person = await db.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const researchNotes = await db.researchNote.findMany({
    where: { personId },
    include: {
      source: {
        select: {
          id: true,
          title: true,
          author: true,
          sourceType: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ eventType: "asc" }, { createdAt: "desc" }],
  });

  // Group by event type
  const grouped: ResearchNotesGrouped = {};

  researchNotes.forEach((note) => {
    const eventType = note.eventType;
    if (!grouped[eventType]) {
      grouped[eventType] = [];
    }

    grouped[eventType].push({
      id: note.id,
      eventType: note.eventType,
      findings: note.findings,
      methodology: note.methodology,
      limitations: note.limitations,
      relatedSources: note.relatedSources
        ? JSON.parse(note.relatedSources)
        : [],
      conclusionReliability: note.conclusionReliability,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      source: note.source,
      createdBy: note.createdBy,
    });
  });

  return grouped;
}

/**
 * Helper function to format citations in different styles
 * @param source - Source object with citation data
 * @param format - Citation format (MLA, APA, CHICAGO)
 * @returns Formatted citation string
 */
function formatCitation(
  source: {
    title: string;
    author: string | null;
    publicationDate: string | null;
    repository: string | null;
    url: string | null;
    doi: string | null;
    publisher?: string | null;
  },
  format: "MLA" | "APA" | "CHICAGO"
): string {
  const author = source.author || "Unknown Author";
  const title = source.title;
  const year = source.publicationDate
    ? new Date(source.publicationDate).getFullYear()
    : "n.d.";

  switch (format) {
    case "MLA": {
      let mla = `${author}. "${title}."`;
      if (source.publicationDate) {
        mla += ` ${year}`;
      }
      if (source.repository) {
        mla += ` ${source.repository}`;
      }
      if (source.url) {
        mla += ` ${source.url}`;
      }
      if (source.doi) {
        mla += ` DOI: ${source.doi}`;
      }
      return mla + ".";
    }

    case "APA": {
      let apa = `${author} (${year}). ${title}.`;
      if (source.repository) {
        apa += ` ${source.repository}.`;
      }
      if (source.url) {
        apa += ` Retrieved from ${source.url}`;
      }
      if (source.doi) {
        apa += ` https://doi.org/${source.doi}`;
      }
      return apa;
    }

    case "CHICAGO": {
      let chicago = `${author}. "${title}."`;
      if (source.publicationDate) {
        chicago += ` Accessed ${source.publicationDate}`;
      }
      if (source.repository) {
        chicago += ` ${source.repository}`;
      }
      if (source.url) {
        chicago += ` ${source.url}`;
      }
      if (source.doi) {
        chicago += ` doi:${source.doi}`;
      }
      return chicago + ".";
    }

    default:
      return title;
  }
}

/**
 * Generate formatted citation for a source
 * @param sourceId - Source ID
 * @param format - Citation format (MLA, APA, CHICAGO)
 * @param db - Optional database client (defaults to prisma)
 * @returns Citation object with format and generated citation text
 * @throws Error if source not found
 */
export async function generateCitationData(
  sourceId: string,
  format: "MLA" | "APA" | "CHICAGO",
  db: SourcesDb = defaultPrisma
): Promise<{
  sourceId: string;
  format: "MLA" | "APA" | "CHICAGO";
  citation: string;
}> {
  const source = await db.source.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error("Source not found");
  }

  const citation = formatCitation(source, format);

  return {
    sourceId: source.id,
    format,
    citation,
  };
}

/**
 * Get all sources for a person, grouped by event type (legacy format)
 * @param personId - Person ID
 * @param db - Optional database client (defaults to prisma)
 * @returns Sources grouped by event type
 */
export async function getPersonSourcesData(
  personId: string,
  db: SourcesDb = defaultPrisma
): Promise<PersonSourcesResponse> {
  try {
    const eventSources = await db.eventSource.findMany({
      where: { personId },
      include: {
        source: true,
      },
      orderBy: [{ eventType: "asc" }, { source: { title: "asc" } }],
    });

    // Group sources by event type
    const groupedSources: PersonSourcesResponse = {};

    eventSources.forEach((es) => {
      const eventType = es.eventType;

      if (!groupedSources[eventType]) {
        groupedSources[eventType] = [];
      }

      // Check if this source is already in this event type group
      const existingSource = groupedSources[eventType].find(
        (s) => s.id === es.source.id
      );

      if (existingSource) {
        // Add event type if not already present
        if (!existingSource.eventTypes.includes(eventType)) {
          existingSource.eventTypes.push(eventType);
        }
      } else {
        // Add new source to group
        groupedSources[eventType].push({
          id: es.source.id,
          title: es.source.title,
          author: es.source.author,
          publicationDate: es.source.publicationDate,
          description: es.source.description,
          repository: es.source.repository,
          notes: es.source.notes,
          eventTypes: [eventType],
        });
      }
    });

    return groupedSources;
  } catch (error) {
    logger.error(
      { error: serializeError(error), personId },
      "Error fetching person sources"
    );
    throw new Error("Failed to fetch person sources");
  }
}
