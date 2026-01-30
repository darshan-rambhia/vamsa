/**
 * Media Server Functions - Framework Wrappers
 *
 * This module contains thin `createServerFn` wrappers that call the business logic
 * functions from media.server.ts. These wrappers handle:
 * - Input validation with Zod schemas
 * - Calling the corresponding server function
 * - Authentication (delegated to server layer)
 * - Error handling
 *
 * This layer is excluded from unit test coverage as it's framework integration code.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  linkMediaToEventSchema,
  mediaMetadataSchema,
  mediaReorderSchema,
  setPrimaryPhotoSchema,
} from "@vamsa/schemas";
import {
  deleteMediaLogic,
  getMediaObjectLogic,
  getPersonMediaLogic,
  linkMediaToEventLogic,
  reorderMediaLogic,
  setPrimaryPhotoLogic,
  updateMediaMetadataLogic,
  uploadMediaLogic,
} from "@vamsa/lib/server/business";

/**
 * Get all media for a person
 *
 * Retrieves all media objects associated with a person,
 * ordered by primary status, display order, and creation date.
 */
export const getPersonMedia = createServerFn({ method: "GET" })
  .inputValidator((data: { personId: string }) => data)
  .handler(async ({ data }) => {
    const { personId } = data;
    return getPersonMediaLogic(personId);
  });

/**
 * Get a single media object with full details
 *
 * Retrieves a media object and all its associations
 * (events and person links).
 */
export const getMediaObject = createServerFn({ method: "GET" })
  .inputValidator((data: { mediaId: string }) => data)
  .handler(async ({ data }) => {
    const { mediaId } = data;
    return getMediaObjectLogic(mediaId);
  });

/**
 * Delete media (cascades to PersonMedia and EventMedia)
 *
 * Removes a media object and all its associations.
 * Also cleans up processed image files from disk.
 */
export const deleteMedia = createServerFn({ method: "POST" })
  .inputValidator((data: { mediaId: string }) => data)
  .handler(async ({ data }) => {
    const { mediaId } = data;
    return deleteMediaLogic(mediaId);
  });

/**
 * Update media metadata
 *
 * Updates title, description, caption, and source fields.
 */
export const updateMediaMetadata = createServerFn({ method: "POST" })
  .inputValidator((data) => mediaMetadataSchema.parse(data))
  .handler(async ({ data }) => {
    const { mediaId, title, description, caption, source } = data;
    return updateMediaMetadataLogic(
      mediaId,
      title,
      description,
      caption,
      source
    );
  });

/**
 * Set media as primary photo for a person
 *
 * Sets the specified media as the primary photo,
 * unsetting any previously primary photo.
 */
export const setPrimaryPhoto = createServerFn({ method: "POST" })
  .inputValidator((data) => setPrimaryPhotoSchema.parse(data))
  .handler(async ({ data }) => {
    const { personId, mediaId } = data;
    return setPrimaryPhotoLogic(personId, mediaId);
  });

/**
 * Reorder media for a person
 *
 * Updates the display order of media for a person.
 */
export const reorderMedia = createServerFn({ method: "POST" })
  .inputValidator((data) => mediaReorderSchema.parse(data))
  .handler(async ({ data }) => {
    const { personId, ordering } = data;
    return reorderMediaLogic(personId, ordering);
  });

/**
 * Link existing media to an event
 *
 * Creates an association between a media object and an event.
 * Prevents duplicate links for the same event-person-type combination.
 */
export const linkMediaToEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => linkMediaToEventSchema.parse(data))
  .handler(async ({ data }) => {
    const { mediaId, eventId } = data;
    return linkMediaToEventLogic(mediaId, eventId);
  });

/**
 * Upload media for a person
 *
 * Creates a media object and associates it with a person.
 * Automatically processes images into multiple formats.
 * Sets the first upload as the primary photo.
 */
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

    return uploadMediaLogic(
      personId,
      fileName,
      mimeType,
      fileSize,
      base64Data,
      title,
      caption,
      description,
      source
    );
  });
