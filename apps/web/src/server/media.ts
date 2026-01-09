import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { z } from "zod";
import {
  mediaMetadataSchema,
  mediaReorderSchema,
  linkMediaToEventSchema,
  setPrimaryPhotoSchema,
} from "@vamsa/schemas";

// Get all media for a person
export const getPersonMedia = createServerFn({ method: "GET" })
  .inputValidator((data: { personId: string }) => data)
  .handler(async ({ data }) => {
    const { personId } = data;

    // Verify person exists
    const person = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    // Get all media for this person
    const personMedia = await prisma.personMedia.findMany({
      where: { personId },
      include: {
        media: {
          select: {
            id: true,
            filePath: true,
            format: true,
            mimeType: true,
            fileSize: true,
            title: true,
            description: true,
            source: true,
            width: true,
            height: true,
            thumbnailPath: true,
            uploadedAt: true,
          },
        },
      },
      orderBy: [
        { isPrimary: "desc" },
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return {
      items: personMedia.map((pm) => ({
        id: pm.id,
        mediaId: pm.media.id,
        filePath: pm.media.filePath,
        format: pm.media.format,
        mimeType: pm.media.mimeType,
        fileSize: pm.media.fileSize,
        title: pm.media.title,
        description: pm.media.description,
        source: pm.media.source,
        width: pm.media.width,
        height: pm.media.height,
        thumbnailPath: pm.media.thumbnailPath,
        uploadedAt: pm.media.uploadedAt.toISOString(),
        caption: pm.caption,
        isPrimary: pm.isPrimary,
        displayOrder: pm.displayOrder,
        createdAt: pm.createdAt.toISOString(),
      })),
      total: personMedia.length,
    };
  });

// Get a single media object with full details
export const getMediaObject = createServerFn({ method: "GET" })
  .inputValidator((data: { mediaId: string }) => data)
  .handler(async ({ data }) => {
    const { mediaId } = data;

    const media = await prisma.mediaObject.findUnique({
      where: { id: mediaId },
      include: {
        eventMedia: {
          select: {
            id: true,
            eventType: true,
            personId: true,
          },
        },
        personMedia: {
          select: {
            id: true,
            personId: true,
            isPrimary: true,
            caption: true,
            displayOrder: true,
          },
        },
      },
    });

    if (!media) {
      throw new Error("Media not found");
    }

    return {
      id: media.id,
      filePath: media.filePath,
      format: media.format,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      title: media.title,
      description: media.description,
      source: media.source,
      width: media.width,
      height: media.height,
      thumbnailPath: media.thumbnailPath,
      uploadedAt: media.uploadedAt.toISOString(),
      createdAt: media.createdAt.toISOString(),
      updatedAt: media.updatedAt.toISOString(),
      eventMedia: media.eventMedia.map((em) => ({
        id: em.id,
        eventType: em.eventType,
        personId: em.personId,
      })),
      personMedia: media.personMedia.map((pm) => ({
        id: pm.id,
        personId: pm.personId,
        isPrimary: pm.isPrimary,
        caption: pm.caption,
        displayOrder: pm.displayOrder,
      })),
    };
  });

// Delete media (cascades to PersonMedia and EventMedia)
export const deleteMedia = createServerFn({ method: "POST" })
  .inputValidator((data: { mediaId: string }) => data)
  .handler(async ({ data }) => {
    const { mediaId } = data;

    // Verify media exists
    const media = await prisma.mediaObject.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new Error("Media not found");
    }

    // Delete the media object (will cascade delete PersonMedia and EventMedia)
    await prisma.mediaObject.delete({
      where: { id: mediaId },
    });

    // TODO: Delete actual file from storage
    // const storage = await getStorageProvider();
    // await storage.delete(media.filePath);

    return { success: true };
  });

// Update media metadata
export const updateMediaMetadata = createServerFn({ method: "POST" })
  .inputValidator((data) => mediaMetadataSchema.parse(data))
  .handler(async ({ data }) => {
    const { mediaId, title, description, caption, source } = data;

    // Verify media exists
    const media = await prisma.mediaObject.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new Error("Media not found");
    }

    // Update media metadata
    const updated = await prisma.mediaObject.update({
      where: { id: mediaId },
      data: {
        title: title ?? media.title,
        description: description ?? media.description,
        source: source ?? media.source,
      },
    });

    // Update caption in PersonMedia if provided
    if (caption !== undefined) {
      const personMedia = await prisma.personMedia.findFirst({
        where: { mediaId },
      });

      if (personMedia) {
        await prisma.personMedia.update({
          where: { id: personMedia.id },
          data: { caption },
        });
      }
    }

    return {
      id: updated.id,
      filePath: updated.filePath,
      format: updated.format,
      mimeType: updated.mimeType,
      fileSize: updated.fileSize,
      title: updated.title,
      description: updated.description,
      source: updated.source,
      width: updated.width,
      height: updated.height,
      thumbnailPath: updated.thumbnailPath,
      uploadedAt: updated.uploadedAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

// Set media as primary photo for a person
export const setPrimaryPhoto = createServerFn({ method: "POST" })
  .inputValidator((data) => setPrimaryPhotoSchema.parse(data))
  .handler(async ({ data }) => {
    const { personId, mediaId } = data;

    // Verify person exists
    const person = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    // Verify media exists and belongs to person
    const personMedia = await prisma.personMedia.findFirst({
      where: { personId, mediaId },
    });

    if (!personMedia) {
      throw new Error("Media not found for this person");
    }

    // Unset previous primary photo
    await prisma.personMedia.updateMany({
      where: { personId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set new primary photo
    await prisma.personMedia.update({
      where: { id: personMedia.id },
      data: { isPrimary: true },
    });

    return { success: true };
  });

// Reorder media for a person
export const reorderMedia = createServerFn({ method: "POST" })
  .inputValidator((data) => mediaReorderSchema.parse(data))
  .handler(async ({ data }) => {
    const { personId, ordering } = data;

    // Verify person exists
    const person = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    // Update display order for each media
    for (const item of ordering) {
      const personMedia = await prisma.personMedia.findFirst({
        where: { personId, mediaId: item.mediaId },
      });

      if (personMedia) {
        await prisma.personMedia.update({
          where: { id: personMedia.id },
          data: { displayOrder: item.order },
        });
      }
    }

    return { success: true };
  });

// Link existing media to an event
export const linkMediaToEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => linkMediaToEventSchema.parse(data))
  .handler(async ({ data }) => {
    const { mediaId, eventId } = data;

    // Verify media exists
    const media = await prisma.mediaObject.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new Error("Media not found");
    }

    // Verify event exists and get its type and person
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    // Check if link already exists
    const existingLink = await prisma.eventMedia.findFirst({
      where: {
        mediaId,
        personId: event.personId,
        eventType: event.type,
      },
    });

    if (existingLink) {
      throw new Error("Media is already linked to this event");
    }

    // Create the link
    const link = await prisma.eventMedia.create({
      data: {
        mediaId,
        personId: event.personId,
        eventType: event.type,
      },
    });

    return {
      id: link.id,
      mediaId: link.mediaId,
      personId: link.personId,
      eventType: link.eventType,
    };
  });
