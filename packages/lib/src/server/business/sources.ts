import { loggers } from "@vamsa/lib/logger";

const log = loggers.db;

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
    relatedSources: Array<string>;
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
  items: Array<SourceListItem>;
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
  relatedSources: Array<string>;
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
    relatedSources: Array<string>;
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
  eventTypes: Array<string>;
}

export interface PersonSourcesResponse {
  [eventType: string]: Array<SourceWithEvents>;
}

/**
 * Get a single source with all details
 * @param sourceId - The ID of the source to fetch
 * @returns Complete source details with related data
 * @throws Error if source not found
 */
export async function getSourceData(sourceId: string): Promise<SourceDetail> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  const source = await drizzleDb.query.sources.findFirst({
    where: eq(drizzleSchema.sources.id, sourceId),
  });

  if (!source) {
    throw new Error("Source not found");
  }

  // Fetch related data
  const eventSources = await drizzleDb.query.eventSources.findMany({
    where: eq(drizzleSchema.eventSources.sourceId, sourceId),
  });

  const researchNotes = await drizzleDb.query.researchNotes.findMany({
    where: eq(drizzleSchema.researchNotes.sourceId, sourceId),
  });

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
    eventSources: eventSources.map((es) => ({
      id: es.id,
      personId: es.personId,
      eventType: es.eventType,
      confidence: es.confidence,
      sourceNotes: es.sourceNotes,
      person: {
        id: "",
        firstName: "",
        lastName: "",
      },
    })),
    researchNotesRelated: researchNotes.map((rn) => ({
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
      person: {
        id: "",
        firstName: "",
        lastName: "",
      },
      createdBy: null,
    })),
    eventCount: eventSources.length,
    researchNoteCount: researchNotes.length,
  };
}

/**
 * List all sources with optional filters
 * @param type - Optional source type filter
 * @param personId - Optional person ID filter
 * @returns List of sources matching filters
 */
export async function listSourcesData(
  type?: string,
  personId?: string
): Promise<SourceListResult> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq, desc } = await import("drizzle-orm");

  const where = type ? eq(drizzleSchema.sources.sourceType, type) : undefined;

  const sources = await drizzleDb.query.sources.findMany({
    where,
    orderBy: desc(drizzleSchema.sources.createdAt),
  });

  // Filter by personId if provided (client-side filtering)
  let filtered = sources;
  if (personId) {
    const eventSources = await drizzleDb.query.eventSources.findMany({
      where: eq(drizzleSchema.eventSources.personId, personId),
    });

    const researchNotes = await drizzleDb.query.researchNotes.findMany({
      where: eq(drizzleSchema.researchNotes.personId, personId),
    });

    const sourceIds = new Set([
      ...eventSources.map((es) => es.sourceId),
      ...researchNotes.map((rn) => rn.sourceId),
    ]);

    filtered = sources.filter((s) => sourceIds.has(s.id));
  }

  return {
    items: filtered.map((source) => ({
      id: source.id,
      title: source.title,
      author: source.author,
      publicationDate: source.publicationDate,
      sourceType: source.sourceType,
      confidence: source.confidence,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      eventCount: 0,
      researchNoteCount: 0,
    })),
    total: filtered.length,
  };
}

/**
 * Create a new source
 * @param data - Source creation data
 * @returns Created source
 */
export async function createSourceData(data: {
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
}): Promise<SourceCreateResult> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");

  const sourceId = crypto.randomUUID();
  const now = new Date();

  const [source] = await drizzleDb
    .insert(drizzleSchema.sources)
    .values({
      id: sourceId,
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
      updatedAt: now,
    })
    .returning();

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
  }>
): Promise<SourceUpdateResult> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  // Verify source exists
  const source = await drizzleDb.query.sources.findFirst({
    where: eq(drizzleSchema.sources.id, id),
  });

  if (!source) {
    throw new Error("Source not found");
  }

  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date(),
  };

  if (updates.accessDate) {
    updateData.accessDate = new Date(updates.accessDate);
  }

  const [updatedSource] = await drizzleDb
    .update(drizzleSchema.sources)
    .set(updateData)
    .where(eq(drizzleSchema.sources.id, id))
    .returning();

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
 * @returns Success indicator
 * @throws Error if source not found
 */
export async function deleteSourceData(
  sourceId: string
): Promise<{ success: boolean }> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  // Verify source exists
  const source = await drizzleDb.query.sources.findFirst({
    where: eq(drizzleSchema.sources.id, sourceId),
  });

  if (!source) {
    throw new Error("Source not found");
  }

  await drizzleDb
    .delete(drizzleSchema.sources)
    .where(eq(drizzleSchema.sources.id, sourceId));

  return { success: true };
}

/**
 * Create a research note
 * @param data - Research note creation data
 * @returns Created research note
 * @throws Error if source or person not found
 */
export async function createResearchNoteData(data: {
  sourceId: string;
  personId: string;
  eventType: string;
  findings: string;
  methodology?: string | null;
  limitations?: string | null;
  relatedSources?: string;
  conclusionReliability?: string | null;
}): Promise<ResearchNoteResult> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  // Verify source exists
  const source = await drizzleDb.query.sources.findFirst({
    where: eq(drizzleSchema.sources.id, data.sourceId),
  });

  if (!source) {
    throw new Error("Source not found");
  }

  // Verify person exists
  const person = await drizzleDb.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, data.personId),
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const noteId = crypto.randomUUID();
  const now = new Date();

  const [researchNote] = await drizzleDb
    .insert(drizzleSchema.researchNotes)
    .values({
      id: noteId,
      sourceId: data.sourceId,
      personId: data.personId,
      eventType: data.eventType,
      findings: data.findings,
      methodology: data.methodology || null,
      limitations: data.limitations || null,
      relatedSources: data.relatedSources,
      conclusionReliability: data.conclusionReliability || null,
      updatedAt: now,
    })
    .returning();

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
    person: {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
    },
  };
}

/**
 * Update a research note
 * @param id - Research note ID
 * @param updates - Fields to update
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
  }>
): Promise<ResearchNoteResult> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  // Verify research note exists
  const researchNote = await drizzleDb.query.researchNotes.findFirst({
    where: eq(drizzleSchema.researchNotes.id, id),
  });

  if (!researchNote) {
    throw new Error("Research note not found");
  }

  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date(),
  };

  const [updatedNote] = await drizzleDb
    .update(drizzleSchema.researchNotes)
    .set(updateData)
    .where(eq(drizzleSchema.researchNotes.id, id))
    .returning();

  const person = await drizzleDb.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, updatedNote.personId),
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
    person: {
      id: person?.id || "",
      firstName: person?.firstName || "",
      lastName: person?.lastName || "",
    },
  };
}

/**
 * Delete a research note
 * @param noteId - Research note ID to delete
 * @returns Success indicator
 * @throws Error if research note not found
 */
export async function deleteResearchNoteData(
  noteId: string
): Promise<{ success: boolean }> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq } = await import("drizzle-orm");

  // Verify research note exists
  const researchNote = await drizzleDb.query.researchNotes.findFirst({
    where: eq(drizzleSchema.researchNotes.id, noteId),
  });

  if (!researchNote) {
    throw new Error("Research note not found");
  }

  await drizzleDb
    .delete(drizzleSchema.researchNotes)
    .where(eq(drizzleSchema.researchNotes.id, noteId));

  return { success: true };
}

/**
 * Link source to event with confidence and notes
 * @param data - Link data including sourceId, personId, eventType, confidence, sourceNotes
 * @returns Created or updated event source link
 * @throws Error if source or person not found
 */
export async function linkSourceToEventData(data: {
  sourceId: string;
  personId: string;
  eventType: string;
  confidence?: string | null;
  sourceNotes?: string | null;
}): Promise<EventSourceResult> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq, and } = await import("drizzle-orm");

  // Verify source exists
  const source = await drizzleDb.query.sources.findFirst({
    where: eq(drizzleSchema.sources.id, data.sourceId),
  });

  if (!source) {
    throw new Error("Source not found");
  }

  // Verify person exists
  const person = await drizzleDb.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, data.personId),
  });

  if (!person) {
    throw new Error("Person not found");
  }

  // Check if link already exists
  const existingLink = await drizzleDb.query.eventSources.findFirst({
    where: and(
      eq(drizzleSchema.eventSources.sourceId, data.sourceId),
      eq(drizzleSchema.eventSources.personId, data.personId),
      eq(drizzleSchema.eventSources.eventType, data.eventType)
    ),
  });

  if (existingLink) {
    // Update existing link
    const [updated] = await drizzleDb
      .update(drizzleSchema.eventSources)
      .set({
        confidence: data.confidence || null,
        sourceNotes: data.sourceNotes || null,
      })
      .where(eq(drizzleSchema.eventSources.id, existingLink.id))
      .returning();

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
  const linkId = crypto.randomUUID();
  const [eventSource] = await drizzleDb
    .insert(drizzleSchema.eventSources)
    .values({
      id: linkId,
      sourceId: data.sourceId,
      personId: data.personId,
      eventType: data.eventType,
      confidence: data.confidence || null,
      sourceNotes: data.sourceNotes || null,
    })
    .returning();

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
 * @returns Research notes grouped by event type
 * @throws Error if person not found
 */
export async function getResearchNotesData(
  personId: string
): Promise<ResearchNotesGrouped> {
  const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
  const { eq, asc, desc } = await import("drizzle-orm");

  // Verify person exists
  const person = await drizzleDb.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, personId),
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const researchNotes = await drizzleDb.query.researchNotes.findMany({
    where: eq(drizzleSchema.researchNotes.personId, personId),
    orderBy: [
      asc(drizzleSchema.researchNotes.eventType),
      desc(drizzleSchema.researchNotes.createdAt),
    ],
  });

  // Group by event type
  const grouped: ResearchNotesGrouped = {};

  for (const note of researchNotes) {
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
      source: {
        id: "",
        title: "",
        author: null,
        sourceType: null,
      },
      createdBy: null,
    });
  }

  return grouped;
}

/**
 * Get all sources for a person, grouped by event type (legacy format)
 * @param personId - Person ID
 * @returns Sources grouped by event type
 */
export async function getPersonSourcesData(
  personId: string
): Promise<PersonSourcesResponse> {
  try {
    const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
    const { eq, asc } = await import("drizzle-orm");

    const eventSources = await drizzleDb.query.eventSources.findMany({
      where: eq(drizzleSchema.eventSources.personId, personId),
      orderBy: [
        asc(drizzleSchema.eventSources.eventType),
        asc(drizzleSchema.eventSources.sourceId),
      ],
    });

    // Group sources by event type
    const groupedSources: PersonSourcesResponse = {};

    for (const es of eventSources) {
      const eventType = es.eventType;

      if (!groupedSources[eventType]) {
        groupedSources[eventType] = [];
      }

      // Check if this source is already in this event type group
      const existingSource = groupedSources[eventType].find(
        (s) => s.id === es.sourceId
      );

      if (!existingSource) {
        // Fetch source details
        const source = await drizzleDb.query.sources.findFirst({
          where: eq(drizzleSchema.sources.id, es.sourceId),
        });

        if (source) {
          groupedSources[eventType].push({
            id: source.id,
            title: source.title,
            author: source.author,
            publicationDate: source.publicationDate,
            description: source.description,
            repository: source.repository,
            notes: source.notes,
            eventTypes: [eventType],
          });
        }
      }
    }

    return groupedSources;
  } catch (error) {
    log.withErr(error).ctx({ personId }).msg("Error fetching person sources");
    throw new Error("Failed to fetch person sources");
  }
}

/**
 * Citation format types supported by the application
 */
export type CitationFormat =
  | "MLA"
  | "APA"
  | "CHICAGO"
  | "TURABIAN"
  | "EVIDENCE_EXPLAINED";

/**
 * Generated citation result
 */
export interface GeneratedCitation {
  sourceId: string;
  format: CitationFormat;
  citation: string;
}

/**
 * Generate a formatted citation for a source
 * @param sourceId - Source ID to generate citation for
 * @param format - Citation format (MLA, APA, etc.)
 * @returns Generated citation string
 */
export async function generateCitationData(
  sourceId: string,
  format: CitationFormat = "MLA"
): Promise<GeneratedCitation> {
  try {
    const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
    const { eq } = await import("drizzle-orm");

    const source = await drizzleDb.query.sources.findFirst({
      where: eq(drizzleSchema.sources.id, sourceId),
    });

    if (!source) {
      throw new Error("Source not found");
    }

    // Generate citation based on format
    let citation: string;

    switch (format) {
      case "MLA":
        citation = formatMLA(source);
        break;
      case "APA":
        citation = formatAPA(source);
        break;
      case "CHICAGO":
        citation = formatChicago(source);
        break;
      case "TURABIAN":
        citation = formatTurabian(source);
        break;
      case "EVIDENCE_EXPLAINED":
        citation = formatEvidenceExplained(source);
        break;
      default:
        citation = formatMLA(source);
    }

    return {
      sourceId,
      format,
      citation,
    };
  } catch (error) {
    log
      .withErr(error)
      .ctx({ sourceId, format })
      .msg("Error generating citation");
    throw new Error("Failed to generate citation");
  }
}

// Helper functions for citation formatting
function formatMLA(source: {
  title: string;
  author: string | null;
  publicationDate: string | null;
  repository: string | null;
}): string {
  const parts: Array<string> = [];
  if (source.author) parts.push(`${source.author}.`);
  parts.push(`"${source.title}."`);
  if (source.repository) parts.push(`${source.repository},`);
  if (source.publicationDate) parts.push(`${source.publicationDate}.`);
  return parts.join(" ");
}

function formatAPA(source: {
  title: string;
  author: string | null;
  publicationDate: string | null;
  repository: string | null;
}): string {
  const parts: Array<string> = [];
  if (source.author) parts.push(`${source.author}`);
  if (source.publicationDate) parts.push(`(${source.publicationDate}).`);
  parts.push(`${source.title}.`);
  if (source.repository) parts.push(`${source.repository}.`);
  return parts.join(" ");
}

function formatChicago(source: {
  title: string;
  author: string | null;
  publicationDate: string | null;
  repository: string | null;
}): string {
  const parts: Array<string> = [];
  if (source.author) parts.push(`${source.author}.`);
  parts.push(`"${source.title}."`);
  if (source.repository) parts.push(`${source.repository},`);
  if (source.publicationDate) parts.push(`${source.publicationDate}.`);
  return parts.join(" ");
}

function formatTurabian(source: {
  title: string;
  author: string | null;
  publicationDate: string | null;
  repository: string | null;
}): string {
  // Turabian is similar to Chicago
  return formatChicago(source);
}

function formatEvidenceExplained(source: {
  title: string;
  author: string | null;
  publicationDate: string | null;
  repository: string | null;
  description: string | null;
}): string {
  const parts: Array<string> = [];
  if (source.author) parts.push(`${source.author},`);
  parts.push(`"${source.title},"`);
  if (source.description) parts.push(`${source.description};`);
  if (source.repository) parts.push(`${source.repository};`);
  if (source.publicationDate) parts.push(`${source.publicationDate}.`);
  return parts.join(" ");
}
