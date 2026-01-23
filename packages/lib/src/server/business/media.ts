/**
 * Media Server Module - Business Logic
 *
 * This module contains pure business logic functions for media/image operations.
 * Functions accept primitive parameters and return typed results.
 * All database operations are handled here.
 *
 * This layer is designed for testability and reusability.
 */

import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  processUploadedImage,
  cleanupOldImages,
  getMediaDir,
} from "@vamsa/lib/server";
import { recordMediaUpload } from "../metrics";
import { logger, serializeError } from "@vamsa/lib/logger";

/**
 * Type for the database client used by media functions.
 * This allows dependency injection for testing.
 */
export type MediaDb = Pick<
  PrismaClient,
  "person" | "mediaObject" | "personMedia" | "event" | "eventMedia"
>;

/**
 * Retrieve all media associated with a person
 *
 * @param personId - The ID of the person
 * @param db - Optional database client (defaults to prisma)
 * @returns Object containing array of person media items and total count
 * @throws Error if person not found
 */
export async function getPersonMediaLogic(
  personId: string,
  db: MediaDb = defaultPrisma
) {
  // Verify person exists
  const person = await db.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new Error("Person not found");
  }

  // Get all media for this person
  const personMedia = await db.personMedia.findMany({
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
}

/**
 * Retrieve a single media object with all its associations
 *
 * @param mediaId - The ID of the media object
 * @param db - Optional database client (defaults to prisma)
 * @returns Media object with event and person associations
 * @throws Error if media not found
 */
export async function getMediaObjectLogic(
  mediaId: string,
  db: MediaDb = defaultPrisma
) {
  const media = await db.mediaObject.findUnique({
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
}

/**
 * Delete a media object and all its associations
 * Cascades to PersonMedia and EventMedia via foreign key constraints
 *
 * @param mediaId - The ID of the media to delete
 * @param db - Optional database client (defaults to prisma)
 * @throws Error if media not found
 */
export async function deleteMediaLogic(
  mediaId: string,
  db: MediaDb = defaultPrisma
) {
  // Verify media exists
  const media = await db.mediaObject.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    throw new Error("Media not found");
  }

  // Delete the media object (will cascade delete PersonMedia and EventMedia)
  await db.mediaObject.delete({
    where: { id: mediaId },
  });

  // Clean up processed images
  try {
    const mediaDir = getMediaDir();
    await cleanupOldImages(mediaId, mediaDir);
  } catch (error) {
    logger.error(
      { error: serializeError(error) },
      "Failed to cleanup processed images"
    );
    // Continue - deletion succeeded even if cleanup failed
  }

  return { success: true };
}

/**
 * Update media metadata (title, description, source, caption)
 *
 * @param mediaId - The ID of the media to update
 * @param title - New title (optional)
 * @param description - New description (optional)
 * @param caption - New caption for primary person (optional)
 * @param source - New source (optional)
 * @param db - Optional database client (defaults to prisma)
 * @returns Updated media object
 * @throws Error if media not found
 */
export async function updateMediaMetadataLogic(
  mediaId: string,
  title: string | undefined,
  description: string | undefined,
  caption: string | undefined,
  source: string | undefined,
  db: MediaDb = defaultPrisma
) {
  // Verify media exists
  const media = await db.mediaObject.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    throw new Error("Media not found");
  }

  // Update media metadata
  const updated = await db.mediaObject.update({
    where: { id: mediaId },
    data: {
      title: title ?? media.title,
      description: description ?? media.description,
      source: source ?? media.source,
    },
  });

  // Update caption in PersonMedia if provided
  if (caption !== undefined) {
    const personMedia = await db.personMedia.findFirst({
      where: { mediaId },
    });

    if (personMedia) {
      await db.personMedia.update({
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
}

/**
 * Set a media object as the primary photo for a person
 * Unsets any previously primary photo
 *
 * @param personId - The ID of the person
 * @param mediaId - The ID of the media to set as primary
 * @param db - Optional database client (defaults to prisma)
 * @throws Error if person or media not found, or media doesn't belong to person
 */
export async function setPrimaryPhotoLogic(
  personId: string,
  mediaId: string,
  db: MediaDb = defaultPrisma
) {
  // Verify person exists
  const person = await db.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new Error("Person not found");
  }

  // Verify media exists and belongs to person
  const personMedia = await db.personMedia.findFirst({
    where: { personId, mediaId },
  });

  if (!personMedia) {
    throw new Error("Media not found for this person");
  }

  // Unset previous primary photo
  await db.personMedia.updateMany({
    where: { personId, isPrimary: true },
    data: { isPrimary: false },
  });

  // Set new primary photo
  await db.personMedia.update({
    where: { id: personMedia.id },
    data: { isPrimary: true },
  });

  return { success: true };
}

/**
 * Reorder media for a person by updating display order
 *
 * @param personId - The ID of the person
 * @param ordering - Array of {mediaId, order} pairs
 * @param db - Optional database client (defaults to prisma)
 * @throws Error if person not found
 */
export async function reorderMediaLogic(
  personId: string,
  ordering: Array<{ mediaId: string; order: number }>,
  db: MediaDb = defaultPrisma
) {
  // Verify person exists
  const person = await db.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new Error("Person not found");
  }

  // Update display order for each media
  for (const item of ordering) {
    const personMedia = await db.personMedia.findFirst({
      where: { personId, mediaId: item.mediaId },
    });

    if (personMedia) {
      await db.personMedia.update({
        where: { id: personMedia.id },
        data: { displayOrder: item.order },
      });
    }
  }

  return { success: true };
}

/**
 * Link existing media to an event
 * Prevents duplicate links for the same event-person-type combination
 *
 * @param mediaId - The ID of the media
 * @param eventId - The ID of the event
 * @param db - Optional database client (defaults to prisma)
 * @returns Created event media link
 * @throws Error if media or event not found, or link already exists
 */
export async function linkMediaToEventLogic(
  mediaId: string,
  eventId: string,
  db: MediaDb = defaultPrisma
) {
  // Verify media exists
  const media = await db.mediaObject.findUnique({
    where: { id: mediaId },
  });

  if (!media) {
    throw new Error("Media not found");
  }

  // Verify event exists and get its type and person
  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Check if link already exists
  const existingLink = await db.eventMedia.findFirst({
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
  const link = await db.eventMedia.create({
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
}

/**
 * Get the upload directory path
 * Uses MEDIA_STORAGE_PATH env var or defaults to data/uploads/media
 */
function getUploadDir(): string {
  if (process.env.MEDIA_STORAGE_PATH) {
    return process.env.MEDIA_STORAGE_PATH;
  }
  return path.join(process.cwd(), "data", "uploads", "media");
}

/**
 * Ensure upload directory exists, creating it if needed
 */
async function ensureUploadDir(): Promise<void> {
  const uploadDir = getUploadDir();
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
}

/**
 * Get file extension from MIME type
 */
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

/**
 * Upload media for a person
 * Processes images into multiple formats (WebP, responsive thumbnails)
 * Automatically sets first upload as primary photo
 *
 * @param personId - The ID of the person
 * @param fileName - Original filename
 * @param mimeType - MIME type of the file
 * @param fileSize - Size in bytes
 * @param base64Data - Base64 encoded file content
 * @param title - Optional media title (defaults to filename)
 * @param caption - Optional caption for primary person association
 * @param description - Optional detailed description
 * @param source - Optional source attribution
 * @param db - Optional database client (defaults to prisma)
 * @returns Created person media record with all metadata
 * @throws Error if person not found or upload fails
 */
export async function uploadMediaLogic(
  personId: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
  base64Data: string,
  title?: string,
  caption?: string,
  description?: string,
  source?: string,
  db: MediaDb = defaultPrisma
) {
  const uploadStart = Date.now();

  // Verify person exists
  const person = await db.person.findUnique({
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
  let processingDuration = 0;

  if (mimeType.startsWith("image/")) {
    try {
      const processingStart = Date.now();
      processedImage = await processUploadedImage(buffer, mediaId, mediaDir);
      processingDuration = Date.now() - processingStart;
      webpPath = processedImage.webp.path;
      thumb400Path = processedImage.responsive[0]?.path || null;
      thumb800Path = processedImage.responsive[1]?.path || null;
      thumb1200Path = processedImage.responsive[2]?.path || null;
    } catch (error) {
      logger.error({ error: serializeError(error) }, "Failed to process image");
      // Continue without processed images - still save original
    }
  }

  // Create media object in database
  const mediaObject = await db.mediaObject.create({
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
  const existingMedia = await db.personMedia.findMany({
    where: { personId },
    orderBy: { displayOrder: "desc" },
    take: 1,
  });

  const displayOrder =
    existingMedia.length > 0 ? (existingMedia[0]?.displayOrder ?? 0) + 1 : 0;
  const isPrimary = existingMedia.length === 0;

  // Link media to person
  const personMedia = await db.personMedia.create({
    data: {
      personId,
      mediaId: mediaObject.id,
      caption: caption || null,
      isPrimary,
      displayOrder,
    },
  });

  // Record metrics
  const uploadDuration = Date.now() - uploadStart;
  recordMediaUpload(
    fileSize,
    uploadDuration,
    processingDuration,
    mimeType,
    true
  );

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
}
