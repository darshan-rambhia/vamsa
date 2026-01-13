import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import {
  mediaMetadataSchema,
  mediaReorderSchema,
  linkMediaToEventSchema,
  setPrimaryPhotoSchema,
} from "@vamsa/schemas";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  processUploadedImage,
  cleanupOldImages,
  getMediaDir,
} from "@vamsa/lib/server";

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
            webpPath: true,
            thumb400Path: true,
            thumb800Path: true,
            thumb1200Path: true,
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
        webpPath: pm.media.webpPath,
        thumb400Path: pm.media.thumb400Path,
        thumb800Path: pm.media.thumb800Path,
        thumb1200Path: pm.media.thumb1200Path,
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
      webpPath: media.webpPath,
      thumb400Path: media.thumb400Path,
      thumb800Path: media.thumb800Path,
      thumb1200Path: media.thumb1200Path,
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

    // Clean up processed images
    try {
      const mediaDir = getMediaDir();
      await cleanupOldImages(mediaId, mediaDir);
    } catch (error) {
      console.error(
        "Failed to cleanup processed images:",
        error instanceof Error ? error.message : String(error)
      );
      // Continue - deletion succeeded even if cleanup failed
    }

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

// Helper to get upload directory
function getUploadDir(): string {
  if (process.env.MEDIA_STORAGE_PATH) {
    return process.env.MEDIA_STORAGE_PATH;
  }
  // Use data/uploads/media directory in project root
  return path.join(process.cwd(), "data", "uploads", "media");
}

// Helper to ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
  const uploadDir = getUploadDir();
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
}

// Helper to get file extension from mime type
function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/tiff": ".tiff",
    "application/pdf": ".pdf",
    "image/bmp": ".bmp",
    "image/svg+xml": ".svg",
  };
  return extensions[mimeType] || ".bin";
}

// Upload media for a person
export const uploadMedia = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      personId: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      base64Data: string;
      title?: string;
      caption?: string;
      description?: string;
      source?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const {
      personId,
      fileName,
      mimeType,
      fileSize,
      base64Data,
      title,
      caption,
      description,
      source,
    } = data;

    // Verify person exists
    const person = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    // Ensure upload directory exists
    await ensureUploadDir();

    // Generate unique filename
    const ext = getExtension(mimeType);
    const uniqueFileName = `${randomUUID()}${ext}`;
    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, uniqueFileName);
    const relativePath = `/data/uploads/media/${uniqueFileName}`;

    // Decode buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Data, "base64");
      await writeFile(filePath, buffer);
    } catch (error) {
      throw new Error(
        `Failed to save file: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Determine format from mime type
    const format = mimeType.split("/")[1]?.toUpperCase() || "UNKNOWN";

    // Generate unique media ID for processing
    const mediaId = randomUUID();
    const mediaDir = getMediaDir();

    // Process image if it's an image type
    let processedImage = null;
    let webpPath: string | null = null;
    let thumb400Path: string | null = null;
    let thumb800Path: string | null = null;
    let thumb1200Path: string | null = null;

    if (mimeType.startsWith("image/")) {
      try {
        processedImage = await processUploadedImage(buffer, mediaId, mediaDir);
        webpPath = processedImage.webp.path;
        thumb400Path = processedImage.responsive[0]?.path || null;
        thumb800Path = processedImage.responsive[1]?.path || null;
        thumb1200Path = processedImage.responsive[2]?.path || null;
      } catch (error) {
        console.error(
          "Failed to process image:",
          error instanceof Error ? error.message : String(error)
        );
        // Continue without processed images - still save original
      }
    }

    // Create media object in database
    const mediaObject = await prisma.mediaObject.create({
      data: {
        filePath: relativePath,
        format,
        mimeType,
        fileSize,
        title: title || fileName,
        description: description || null,
        source: source || null,
        width: processedImage?.original.width,
        height: processedImage?.original.height,
        webpPath,
        thumb400Path,
        thumb800Path,
        thumb1200Path,
        uploadedAt: new Date(),
      },
    });

    // Get existing media count for this person
    const existingMedia = await prisma.personMedia.findMany({
      where: { personId },
      orderBy: { displayOrder: "desc" },
      take: 1,
    });

    const displayOrder =
      existingMedia.length > 0 ? (existingMedia[0]?.displayOrder ?? 0) + 1 : 0;
    const isPrimary = existingMedia.length === 0; // First photo is primary

    // Link media to person
    const personMedia = await prisma.personMedia.create({
      data: {
        personId,
        mediaId: mediaObject.id,
        caption: caption || null,
        isPrimary,
        displayOrder,
      },
    });

    return {
      id: personMedia.id,
      mediaId: mediaObject.id,
      filePath: mediaObject.filePath,
      format: mediaObject.format,
      mimeType: mediaObject.mimeType,
      fileSize: mediaObject.fileSize,
      title: mediaObject.title,
      description: mediaObject.description,
      source: mediaObject.source,
      width: mediaObject.width,
      height: mediaObject.height,
      webpPath: mediaObject.webpPath,
      thumb400Path: mediaObject.thumb400Path,
      thumb800Path: mediaObject.thumb800Path,
      thumb1200Path: mediaObject.thumb1200Path,
      caption: personMedia.caption,
      isPrimary: personMedia.isPrimary,
      displayOrder: personMedia.displayOrder,
      uploadedAt: mediaObject.uploadedAt.toISOString(),
      createdAt: personMedia.createdAt.toISOString(),
    };
  });
