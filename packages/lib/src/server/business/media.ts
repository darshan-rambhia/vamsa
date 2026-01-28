/**
 * Media Server Module - Business Logic
 *
 * This module contains pure business logic functions for media/image operations.
 * Functions accept primitive parameters and return typed results.
 * All database operations are handled here.
 *
 * This layer is designed for testability and reusability.
 */

import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq, and } from "drizzle-orm";
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
import { loggers } from "@vamsa/lib/logger";

const log = loggers.media;

/**
 * Type for the database client used by media functions.
 * This module uses Drizzle ORM as the default database client.
 */
export type MediaDb = typeof drizzleDb;

/**
 * Retrieve all media associated with a person
 *
 * @param personId - The ID of the person
 * @param db - Optional database client (defaults to drizzleDb)
 * @returns Object containing array of person media items and total count
 * @throws Error if person not found
 */
export async function getPersonMediaLogic(
  personId: string,
  db: MediaDb = drizzleDb
) {
  // Verify person exists
  const person = await db
    .select()
    .from(drizzleSchema.persons)
    .where(eq(drizzleSchema.persons.id, personId))
    .limit(1);

  if (person.length === 0) {
    throw new Error("Person not found");
  }

  // Get all media for this person with related media object data
  const personMedia = await db
    .select()
    .from(drizzleSchema.personMedias)
    .leftJoin(
      drizzleSchema.mediaObjects,
      eq(drizzleSchema.personMedias.mediaId, drizzleSchema.mediaObjects.id)
    )
    .where(eq(drizzleSchema.personMedias.personId, personId))
    .orderBy(
      drizzleSchema.personMedias.isPrimary,
      drizzleSchema.personMedias.displayOrder,
      drizzleSchema.personMedias.createdAt
    );

  return {
    items: personMedia.map((pm) => ({
      id: pm.PersonMedia.id,
      mediaId: pm.MediaObject?.id ?? "",
      filePath: pm.MediaObject?.filePath ?? "",
      format: pm.MediaObject?.format ?? "",
      mimeType: pm.MediaObject?.mimeType ?? "",
      fileSize: pm.MediaObject?.fileSize ?? 0,
      title: pm.MediaObject?.title ?? "",
      description: pm.MediaObject?.description ?? null,
      source: pm.MediaObject?.source ?? null,
      width: pm.MediaObject?.width ?? null,
      height: pm.MediaObject?.height ?? null,
      thumbnailPath: pm.MediaObject?.thumbnailPath ?? null,
      webpPath: pm.MediaObject?.webpPath ?? null,
      thumb400Path: pm.MediaObject?.thumb400Path ?? null,
      thumb800Path: pm.MediaObject?.thumb800Path ?? null,
      thumb1200Path: pm.MediaObject?.thumb1200Path ?? null,
      uploadedAt: pm.MediaObject?.uploadedAt?.toISOString() ?? "",
      caption: pm.PersonMedia.caption,
      isPrimary: pm.PersonMedia.isPrimary,
      displayOrder: pm.PersonMedia.displayOrder,
      createdAt: pm.PersonMedia.createdAt.toISOString(),
    })),
    total: personMedia.length,
  };
}

/**
 * Retrieve a single media object with all its associations
 *
 * @param mediaId - The ID of the media object
 * @param db - Optional database client (defaults to drizzleDb)
 * @returns Media object with event and person associations
 * @throws Error if media not found
 */
export async function getMediaObjectLogic(
  mediaId: string,
  db: MediaDb = drizzleDb
) {
  const media = await db
    .select()
    .from(drizzleSchema.mediaObjects)
    .where(eq(drizzleSchema.mediaObjects.id, mediaId))
    .limit(1);

  if (media.length === 0) {
    throw new Error("Media not found");
  }

  const mediaObject = media[0];

  // Get event media associations
  const eventMedia = await db
    .select()
    .from(drizzleSchema.eventMedias)
    .where(eq(drizzleSchema.eventMedias.mediaId, mediaId));

  // Get person media associations
  const personMedia = await db
    .select()
    .from(drizzleSchema.personMedias)
    .where(eq(drizzleSchema.personMedias.mediaId, mediaId));

  return {
    id: mediaObject.id,
    filePath: mediaObject.filePath,
    format: mediaObject.format,
    mimeType: mediaObject.mimeType,
    fileSize: mediaObject.fileSize,
    title: mediaObject.title,
    description: mediaObject.description,
    source: mediaObject.source,
    width: mediaObject.width,
    height: mediaObject.height,
    thumbnailPath: mediaObject.thumbnailPath,
    webpPath: mediaObject.webpPath,
    thumb400Path: mediaObject.thumb400Path,
    thumb800Path: mediaObject.thumb800Path,
    thumb1200Path: mediaObject.thumb1200Path,
    uploadedAt: mediaObject.uploadedAt.toISOString(),
    createdAt: mediaObject.createdAt.toISOString(),
    updatedAt: mediaObject.updatedAt.toISOString(),
    eventMedia: eventMedia.map((em) => ({
      id: em.id,
      eventType: em.eventType,
      personId: em.personId,
    })),
    personMedia: personMedia.map((pm) => ({
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
 * @param db - Optional database client (defaults to drizzleDb)
 * @throws Error if media not found
 */
export async function deleteMediaLogic(
  mediaId: string,
  db: MediaDb = drizzleDb
) {
  // Verify media exists
  const media = await db
    .select()
    .from(drizzleSchema.mediaObjects)
    .where(eq(drizzleSchema.mediaObjects.id, mediaId))
    .limit(1);

  if (media.length === 0) {
    throw new Error("Media not found");
  }

  // Delete the media object (will cascade delete PersonMedia and EventMedia)
  await db
    .delete(drizzleSchema.mediaObjects)
    .where(eq(drizzleSchema.mediaObjects.id, mediaId));

  // Clean up processed images
  try {
    const mediaDir = getMediaDir();
    await cleanupOldImages(mediaId, mediaDir);
  } catch (error) {
    log.withErr(error).msg("Failed to cleanup processed images");
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
 * @param db - Optional database client (defaults to drizzleDb)
 * @returns Updated media object
 * @throws Error if media not found
 */
export async function updateMediaMetadataLogic(
  mediaId: string,
  title: string | undefined,
  description: string | undefined,
  caption: string | undefined,
  source: string | undefined,
  db: MediaDb = drizzleDb
) {
  // Verify media exists
  const media = await db
    .select()
    .from(drizzleSchema.mediaObjects)
    .where(eq(drizzleSchema.mediaObjects.id, mediaId))
    .limit(1);

  if (media.length === 0) {
    throw new Error("Media not found");
  }

  const mediaObject = media[0];

  // Update media metadata
  await db
    .update(drizzleSchema.mediaObjects)
    .set({
      title: title ?? mediaObject.title,
      description: description ?? mediaObject.description,
      source: source ?? mediaObject.source,
    })
    .where(eq(drizzleSchema.mediaObjects.id, mediaId));

  // Update caption in PersonMedia if provided
  if (caption !== undefined) {
    const personMedia = await db
      .select()
      .from(drizzleSchema.personMedias)
      .where(eq(drizzleSchema.personMedias.mediaId, mediaId))
      .limit(1);

    if (personMedia.length > 0) {
      await db
        .update(drizzleSchema.personMedias)
        .set({ caption })
        .where(eq(drizzleSchema.personMedias.id, personMedia[0].id));
    }
  }

  // Fetch updated media
  const updated = await db
    .select()
    .from(drizzleSchema.mediaObjects)
    .where(eq(drizzleSchema.mediaObjects.id, mediaId))
    .limit(1);

  const updatedMedia = updated[0];

  return {
    id: updatedMedia.id,
    filePath: updatedMedia.filePath,
    format: updatedMedia.format,
    mimeType: updatedMedia.mimeType,
    fileSize: updatedMedia.fileSize,
    title: updatedMedia.title,
    description: updatedMedia.description,
    source: updatedMedia.source,
    width: updatedMedia.width,
    height: updatedMedia.height,
    thumbnailPath: updatedMedia.thumbnailPath,
    uploadedAt: updatedMedia.uploadedAt.toISOString(),
    createdAt: updatedMedia.createdAt.toISOString(),
    updatedAt: updatedMedia.updatedAt.toISOString(),
  };
}

/**
 * Set a media object as the primary photo for a person
 * Unsets any previously primary photo
 *
 * @param personId - The ID of the person
 * @param mediaId - The ID of the media to set as primary
 * @param db - Optional database client (defaults to drizzleDb)
 * @throws Error if person or media not found, or media doesn't belong to person
 */
export async function setPrimaryPhotoLogic(
  personId: string,
  mediaId: string,
  db: MediaDb = drizzleDb
) {
  // Verify person exists
  const person = await db
    .select()
    .from(drizzleSchema.persons)
    .where(eq(drizzleSchema.persons.id, personId))
    .limit(1);

  if (person.length === 0) {
    throw new Error("Person not found");
  }

  // Verify media exists and belongs to person
  const personMedia = await db
    .select()
    .from(drizzleSchema.personMedias)
    .where(
      and(
        eq(drizzleSchema.personMedias.personId, personId),
        eq(drizzleSchema.personMedias.mediaId, mediaId)
      )
    )
    .limit(1);

  if (personMedia.length === 0) {
    throw new Error("Media not found for this person");
  }

  // Unset previous primary photo
  await db
    .update(drizzleSchema.personMedias)
    .set({ isPrimary: false })
    .where(
      and(
        eq(drizzleSchema.personMedias.personId, personId),
        eq(drizzleSchema.personMedias.isPrimary, true)
      )
    );

  // Set new primary photo
  await db
    .update(drizzleSchema.personMedias)
    .set({ isPrimary: true })
    .where(eq(drizzleSchema.personMedias.id, personMedia[0].id));

  return { success: true };
}

/**
 * Reorder media for a person by updating display order
 *
 * @param personId - The ID of the person
 * @param ordering - Array of {mediaId, order} pairs
 * @param db - Optional database client (defaults to drizzleDb)
 * @throws Error if person not found
 */
export async function reorderMediaLogic(
  personId: string,
  ordering: Array<{ mediaId: string; order: number }>,
  db: MediaDb = drizzleDb
) {
  // Verify person exists
  const person = await db
    .select()
    .from(drizzleSchema.persons)
    .where(eq(drizzleSchema.persons.id, personId))
    .limit(1);

  if (person.length === 0) {
    throw new Error("Person not found");
  }

  // Update display order for each media
  for (const item of ordering) {
    const personMedia = await db
      .select()
      .from(drizzleSchema.personMedias)
      .where(
        and(
          eq(drizzleSchema.personMedias.personId, personId),
          eq(drizzleSchema.personMedias.mediaId, item.mediaId)
        )
      )
      .limit(1);

    if (personMedia.length > 0) {
      await db
        .update(drizzleSchema.personMedias)
        .set({ displayOrder: item.order })
        .where(eq(drizzleSchema.personMedias.id, personMedia[0].id));
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
 * @param db - Optional database client (defaults to drizzleDb)
 * @returns Created event media link
 * @throws Error if media or event not found, or link already exists
 */
export async function linkMediaToEventLogic(
  mediaId: string,
  eventId: string,
  db: MediaDb = drizzleDb
) {
  // Verify media exists
  const media = await db
    .select()
    .from(drizzleSchema.mediaObjects)
    .where(eq(drizzleSchema.mediaObjects.id, mediaId))
    .limit(1);

  if (media.length === 0) {
    throw new Error("Media not found");
  }

  // Verify event exists and get its type and person
  const event = await db
    .select()
    .from(drizzleSchema.events)
    .where(eq(drizzleSchema.events.id, eventId))
    .limit(1);

  if (event.length === 0) {
    throw new Error("Event not found");
  }

  const eventRecord = event[0];

  // Check if link already exists
  const existingLink = await db
    .select()
    .from(drizzleSchema.eventMedias)
    .where(
      and(
        eq(drizzleSchema.eventMedias.mediaId, mediaId),
        eq(drizzleSchema.eventMedias.personId, eventRecord.personId),
        eq(drizzleSchema.eventMedias.eventType, eventRecord.type)
      )
    )
    .limit(1);

  if (existingLink.length > 0) {
    throw new Error("Media is already linked to this event");
  }

  // Create the link
  const linkId = randomUUID();
  await db.insert(drizzleSchema.eventMedias).values({
    id: linkId,
    mediaId,
    personId: eventRecord.personId,
    eventType: eventRecord.type,
  });

  return {
    id: linkId,
    mediaId,
    personId: eventRecord.personId,
    eventType: eventRecord.type,
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
 * @param db - Optional database client (defaults to drizzleDb)
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
  db: MediaDb = drizzleDb
) {
  const uploadStart = Date.now();

  // Verify person exists
  const person = await db
    .select()
    .from(drizzleSchema.persons)
    .where(eq(drizzleSchema.persons.id, personId))
    .limit(1);

  if (person.length === 0) {
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
      log.withErr(error).msg("Failed to process image");
      // Continue without processed images - still save original
    }
  }

  // Create media object in database
  const mediaObjectId = randomUUID();
  const now = new Date();
  await db.insert(drizzleSchema.mediaObjects).values({
    id: mediaObjectId,
    filePath: relativePath,
    format,
    mimeType,
    fileSize,
    title: title || fileName,
    description: description || null,
    source: source || null,
    width: processedImage?.original.width ?? null,
    height: processedImage?.original.height ?? null,
    webpPath,
    thumb400Path,
    thumb800Path,
    thumb1200Path,
    uploadedAt: now,
    updatedAt: now,
  });

  // Get existing media count for this person
  const existingMedia = await db
    .select()
    .from(drizzleSchema.personMedias)
    .where(eq(drizzleSchema.personMedias.personId, personId))
    .orderBy(drizzleSchema.personMedias.displayOrder)
    .limit(1);

  const displayOrder =
    existingMedia.length > 0 ? (existingMedia[0]?.displayOrder ?? 0) + 1 : 0;
  const isPrimary = existingMedia.length === 0;

  // Link media to person
  const personMediaId = randomUUID();
  const personMediaNow = new Date();
  await db.insert(drizzleSchema.personMedias).values({
    id: personMediaId,
    personId,
    mediaId: mediaObjectId,
    caption: caption || null,
    isPrimary,
    displayOrder,
    updatedAt: personMediaNow,
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
    id: personMediaId,
    mediaId: mediaObjectId,
    filePath: relativePath,
    format,
    mimeType,
    fileSize,
    title: title || fileName,
    description: description || null,
    source: source || null,
    width: processedImage?.original.width ?? null,
    height: processedImage?.original.height ?? null,
    webpPath,
    thumb400Path,
    thumb800Path,
    thumb1200Path,
    caption: caption || null,
    isPrimary,
    displayOrder,
    uploadedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}
