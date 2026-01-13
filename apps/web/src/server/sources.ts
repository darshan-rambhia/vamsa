import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import {
  sourceCreateSchema,
  sourceUpdateSchema,
  researchNoteCreateSchema,
  researchNoteUpdateSchema,
  citationGenerateSchema,
  linkSourceToEventSchema,
} from "@vamsa/schemas";
import { logger, serializeError } from "@vamsa/lib/logger";

// Get a single source with all details
export const getSource = createServerFn({ method: "GET" })
  .inputValidator((data: { sourceId: string }) => data)
  .handler(async ({ data }) => {
    const source = await prisma.source.findUnique({
      where: { id: data.sourceId },
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
  });

// List all sources with optional filters
export const listSources = createServerFn({ method: "GET" })
  .inputValidator((data: { type?: string; personId?: string } = {}) => data)
  .handler(async ({ data }) => {
    const where: Record<string, string> = {};

    if (data.type) {
      where.sourceType = data.type;
    }

    let sources = await prisma.source.findMany({
      where,
      include: {
        eventSources: true,
        researchNotes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by personId if provided
    if (data.personId) {
      sources = sources.filter(
        (source) =>
          source.eventSources.some((es) => es.personId === data.personId) ||
          source.researchNotes.some((rn) => rn.personId === data.personId)
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
  });

// Create a new source
export const createSource = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return sourceCreateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const source = await prisma.source.create({
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
  });

// Update a source
export const updateSource = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return sourceUpdateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const { id, ...updates } = data;

    // Verify source exists
    const source = await prisma.source.findUnique({
      where: { id },
    });

    if (!source) {
      throw new Error("Source not found");
    }

    const updatedSource = await prisma.source.update({
      where: { id },
      data: {
        ...updates,
        accessDate: updates.accessDate
          ? new Date(updates.accessDate)
          : undefined,
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
  });

// Delete a source
export const deleteSource = createServerFn({ method: "POST" })
  .inputValidator((data: { sourceId: string }) => data)
  .handler(async ({ data }) => {
    // Verify source exists
    const source = await prisma.source.findUnique({
      where: { id: data.sourceId },
    });

    if (!source) {
      throw new Error("Source not found");
    }

    await prisma.source.delete({
      where: { id: data.sourceId },
    });

    return { success: true };
  });

// Create a research note
export const createResearchNote = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return researchNoteCreateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    // Verify source exists
    const source = await prisma.source.findUnique({
      where: { id: data.sourceId },
    });

    if (!source) {
      throw new Error("Source not found");
    }

    // Verify person exists
    const person = await prisma.person.findUnique({
      where: { id: data.personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    const researchNote = await prisma.researchNote.create({
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
  });

// Update a research note
export const updateResearchNote = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return researchNoteUpdateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const { id, ...updates } = data;

    // Verify research note exists
    const researchNote = await prisma.researchNote.findUnique({
      where: { id },
    });

    if (!researchNote) {
      throw new Error("Research note not found");
    }

    const updatedNote = await prisma.researchNote.update({
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
  });

// Delete a research note
export const deleteResearchNote = createServerFn({ method: "POST" })
  .inputValidator((data: { noteId: string }) => data)
  .handler(async ({ data }) => {
    // Verify research note exists
    const researchNote = await prisma.researchNote.findUnique({
      where: { id: data.noteId },
    });

    if (!researchNote) {
      throw new Error("Research note not found");
    }

    await prisma.researchNote.delete({
      where: { id: data.noteId },
    });

    return { success: true };
  });

// Link source to event with confidence and notes
export const linkSourceToEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return linkSourceToEventSchema.parse(data);
  })
  .handler(async ({ data }) => {
    // Verify source exists
    const source = await prisma.source.findUnique({
      where: { id: data.sourceId },
    });

    if (!source) {
      throw new Error("Source not found");
    }

    // Verify person exists
    const person = await prisma.person.findUnique({
      where: { id: data.personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    // Check if link already exists
    const existingLink = await prisma.eventSource.findUnique({
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
      const updated = await prisma.eventSource.update({
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
    const eventSource = await prisma.eventSource.create({
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
  });

// Get all research notes for a person
export const getResearchNotes = createServerFn({ method: "GET" })
  .inputValidator((data: { personId: string }) => data)
  .handler(async ({ data }) => {
    // Verify person exists
    const person = await prisma.person.findUnique({
      where: { id: data.personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    const researchNotes = await prisma.researchNote.findMany({
      where: { personId: data.personId },
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
    const grouped: Record<
      string,
      Array<{
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
      }>
    > = {};

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
  });

// Generate formatted citation
export const generateCitation = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return citationGenerateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const source = await prisma.source.findUnique({
      where: { id: data.sourceId },
    });

    if (!source) {
      throw new Error("Source not found");
    }

    const citation = formatCitation(source, data.format);

    return {
      sourceId: source.id,
      format: data.format,
      citation,
    };
  });

// Helper function to format citations
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

// Legacy function for backward compatibility - Get all sources for a person, grouped by event type
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

export const getPersonSources = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<PersonSourcesResponse> => {
    try {
      const eventSources = await prisma.eventSource.findMany({
        where: { personId: data.id },
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
        { error: serializeError(error), personId: data.id },
        "Error fetching person sources"
      );
      throw new Error("Failed to fetch person sources");
    }
  });
