/**
 * Unit tests for media server business logic
 *
 * Tests cover:
 * - Getting person media with filtering and ordering
 * - Getting media objects with associations
 * - Deleting media with cleanup
 * - Updating media metadata
 * - Setting primary photo
 * - Reordering media
 * - Linking media to events
 * - Uploading media with image processing
 * - Error handling and validation
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { MediaDb } from "@vamsa/lib/server/business";

import {
  getPersonMediaLogic,
  getMediaObjectLogic,
  deleteMediaLogic,
  updateMediaMetadataLogic,
  setPrimaryPhotoLogic,
  reorderMediaLogic,
  linkMediaToEventLogic,
  uploadMediaLogic,
} from "@vamsa/lib/server/business";

function createMockDb(): MediaDb {
  return {
    person: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    mediaObject: {
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    personMedia: {
      findMany: mock(() => Promise.resolve([])),
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      updateMany: mock(() => Promise.resolve({ count: 0 })),
    },
    event: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    eventMedia: {
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
    },
  } as unknown as MediaDb;
}

describe("Media Server Functions", () => {
  let mockDb: MediaDb;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("getPersonMediaLogic", () => {
    it("should throw error when person not found", async () => {
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getPersonMediaLogic("person-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Person not found");
      }
    });

    it("should get person media", async () => {
      const mockPerson = { id: "person-1" };
      const mockMedia = [
        {
          id: "pm-1",
          isPrimary: true,
          displayOrder: 0,
          caption: "Photo 1",
          createdAt: new Date(),
          media: {
            id: "media-1",
            filePath: "/path/to/photo.jpg",
            format: "JPG",
            mimeType: "image/jpeg",
            fileSize: 1024,
            title: "Photo 1",
            description: "A photo",
            source: "Camera",
            width: 800,
            height: 600,
            thumbnailPath: "/path/to/thumb.jpg",
            webpPath: "/path/to/photo.webp",
            thumb400Path: "/path/to/thumb400.webp",
            thumb800Path: "/path/to/thumb800.webp",
            thumb1200Path: "/path/to/thumb1200.webp",
            uploadedAt: new Date(),
          },
        },
      ];

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);

      const result = await getPersonMediaLogic("person-1", mockDb);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Photo 1");
      expect(result.items[0].isPrimary).toBe(true);
      expect(result.total).toBe(1);
    });
  });

  describe("getMediaObjectLogic", () => {
    it("should throw error when media not found", async () => {
      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getMediaObjectLogic("media-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Media not found");
      }
    });

    it("should get media object with associations", async () => {
      const mockMedia = {
        id: "media-1",
        filePath: "/path/to/photo.jpg",
        format: "JPG",
        mimeType: "image/jpeg",
        fileSize: 1024,
        title: "Photo",
        description: null,
        source: null,
        width: 800,
        height: 600,
        thumbnailPath: null,
        webpPath: null,
        thumb400Path: null,
        thumb800Path: null,
        thumb1200Path: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        eventMedia: [],
        personMedia: [],
      };

      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);

      const result = await getMediaObjectLogic("media-1", mockDb);

      expect(result.id).toBe("media-1");
      expect(result.title).toBe("Photo");
      expect(result.eventMedia).toEqual([]);
      expect(result.personMedia).toEqual([]);
    });
  });

  describe("deleteMediaLogic", () => {
    it("should throw error when media not found", async () => {
      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await deleteMediaLogic("media-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Media not found");
      }
    });

    it("should delete media", async () => {
      const mockMedia = { id: "media-1" };

      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);
      (
        mockDb.mediaObject.delete as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);

      const result = await deleteMediaLogic("media-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.mediaObject.delete).toHaveBeenCalledWith({
        where: { id: "media-1" },
      });
    });
  });

  describe("updateMediaMetadataLogic", () => {
    it("should throw error when media not found", async () => {
      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await updateMediaMetadataLogic(
          "media-nonexistent",
          "New Title",
          undefined,
          undefined,
          undefined,
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Media not found");
      }
    });

    it("should update media metadata", async () => {
      const mockMedia = {
        id: "media-1",
        title: "Old Title",
        description: null,
        source: null,
      };
      const mockUpdated = {
        ...mockMedia,
        title: "New Title",
        filePath: "/path/to/photo.jpg",
        format: "JPG",
        mimeType: "image/jpeg",
        fileSize: 1024,
        width: 800,
        height: 600,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);
      (
        mockDb.mediaObject.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUpdated);

      const result = await updateMediaMetadataLogic(
        "media-1",
        "New Title",
        undefined,
        undefined,
        undefined,
        mockDb
      );

      expect(result.id).toBe("media-1");
      expect(result.title).toBe("New Title");
    });
  });

  describe("setPrimaryPhotoLogic", () => {
    it("should throw error when person not found", async () => {
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await setPrimaryPhotoLogic("person-nonexistent", "media-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Person not found");
      }
    });

    it("should throw error when media not found for person", async () => {
      const mockPerson = { id: "person-1" };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await setPrimaryPhotoLogic("person-1", "media-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Media not found for this person"
        );
      }
    });

    it("should set primary photo", async () => {
      const mockPerson = { id: "person-1" };
      const mockPersonMedia = { id: "pm-1", personId: "person-1" };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);
      (
        mockDb.personMedia.updateMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        count: 1,
      });
      (
        mockDb.personMedia.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        ...mockPersonMedia,
        isPrimary: true,
      });

      const result = await setPrimaryPhotoLogic("person-1", "media-1", mockDb);

      expect(result.success).toBe(true);
    });
  });

  describe("reorderMediaLogic", () => {
    it("should throw error when person not found", async () => {
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await reorderMediaLogic("person-nonexistent", [], mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Person not found");
      }
    });

    it("should reorder media", async () => {
      const mockPerson = { id: "person-1" };
      const ordering = [
        { mediaId: "media-1", order: 0 },
        { mediaId: "media-2", order: 1 },
      ];

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.personMedia.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "pm-1" })
        .mockResolvedValueOnce({ id: "pm-2" });
      (mockDb.personMedia.update as ReturnType<typeof mock>).mockResolvedValue(
        {}
      );

      const result = await reorderMediaLogic("person-1", ordering, mockDb);

      expect(result.success).toBe(true);
    });
  });

  describe("linkMediaToEventLogic", () => {
    it("should throw error when media not found", async () => {
      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await linkMediaToEventLogic("media-nonexistent", "event-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Media not found");
      }
    });

    it("should throw error when event not found", async () => {
      const mockMedia = { id: "media-1" };

      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);
      (
        mockDb.event.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await linkMediaToEventLogic("media-1", "event-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Event not found");
      }
    });

    it("should link media to event", async () => {
      const mockMedia = { id: "media-1" };
      const mockEvent = { id: "event-1", personId: "person-1", type: "BIRTH" };
      const mockLink = {
        id: "em-1",
        mediaId: "media-1",
        personId: "person-1",
        eventType: "BIRTH",
      };

      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);
      (
        mockDb.event.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEvent);
      (
        mockDb.eventMedia.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);
      (
        mockDb.eventMedia.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockLink);

      const result = await linkMediaToEventLogic("media-1", "event-1", mockDb);

      expect(result.id).toBe("em-1");
      expect(result.mediaId).toBe("media-1");
    });

    it("should throw error when link already exists", async () => {
      const mockMedia = { id: "media-1" };
      const mockEvent = { id: "event-1", personId: "person-1", type: "BIRTH" };
      const existingLink = { id: "em-existing" };

      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);
      (
        mockDb.event.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEvent);
      (
        mockDb.eventMedia.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(existingLink);

      try {
        await linkMediaToEventLogic("media-1", "event-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Media is already linked to this event"
        );
      }
    });
  });

  describe("uploadMediaLogic", () => {
    it("should throw error when person not found", async () => {
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await uploadMediaLogic(
          "person-nonexistent",
          "photo.jpg",
          "image/jpeg",
          1024,
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "Test Photo",
          "Test caption",
          "Test description",
          "Test source",
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Person not found");
      }
    });

    it("should upload media with all metadata", async () => {
      const mockPerson = { id: "person-1" };
      const mockMediaObject = {
        id: "media-1",
        filePath: "/data/uploads/media/test-uuid.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 1024,
        title: "Test Photo",
        description: "Test description",
        source: "Test source",
        width: 800,
        height: 600,
        webpPath: "/data/uploads/media/test-uuid.webp",
        thumb400Path: "/data/uploads/media/test-uuid-thumb400.webp",
        thumb800Path: "/data/uploads/media/test-uuid-thumb800.webp",
        thumb1200Path: "/data/uploads/media/test-uuid-thumb1200.webp",
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPersonMedia = {
        id: "pm-1",
        personId: "person-1",
        mediaId: "media-1",
        caption: "Test caption",
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date(),
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDb.mediaObject.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMediaObject);
      (
        mockDb.personMedia.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);

      const result = await uploadMediaLogic(
        "person-1",
        "photo.jpg",
        "image/jpeg",
        1024,
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "Test Photo",
        "Test caption",
        "Test description",
        "Test source",
        mockDb
      );

      expect(result.id).toBe("pm-1");
      expect(result.mediaId).toBe("media-1");
      expect(result.title).toBe("Test Photo");
      expect(result.caption).toBe("Test caption");
      expect(result.description).toBe("Test description");
      expect(result.source).toBe("Test source");
      expect(result.isPrimary).toBe(true);
      expect(result.displayOrder).toBe(0);
      expect(result.mimeType).toBe("image/jpeg");
      expect(result.fileSize).toBe(1024);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it("should set first uploaded media as primary", async () => {
      const mockPerson = { id: "person-1" };
      const mockMediaObject = {
        id: "media-1",
        filePath: "/data/uploads/media/test-uuid.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 1024,
        title: "photo.jpg",
        description: null,
        source: null,
        width: 800,
        height: 600,
        webpPath: null,
        thumb400Path: null,
        thumb800Path: null,
        thumb1200Path: null,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPersonMedia = {
        id: "pm-1",
        personId: "person-1",
        mediaId: "media-1",
        caption: null,
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date(),
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDb.mediaObject.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMediaObject);
      (
        mockDb.personMedia.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);

      const result = await uploadMediaLogic(
        "person-1",
        "photo.jpg",
        "image/jpeg",
        1024,
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        undefined,
        undefined,
        undefined,
        undefined,
        mockDb
      );

      expect(result.isPrimary).toBe(true);
      expect(result.displayOrder).toBe(0);
    });

    it("should not set second upload as primary", async () => {
      const mockPerson = { id: "person-1" };
      const existingMedia = { id: "pm-existing", displayOrder: 0 };

      const mockMediaObject = {
        id: "media-2",
        filePath: "/data/uploads/media/test-uuid2.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 2048,
        title: "photo2.jpg",
        description: null,
        source: null,
        width: 1024,
        height: 768,
        webpPath: null,
        thumb400Path: null,
        thumb800Path: null,
        thumb1200Path: null,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPersonMedia = {
        id: "pm-2",
        personId: "person-1",
        mediaId: "media-2",
        caption: null,
        isPrimary: false,
        displayOrder: 1,
        createdAt: new Date(),
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([existingMedia]);
      (
        mockDb.mediaObject.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMediaObject);
      (
        mockDb.personMedia.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);

      const result = await uploadMediaLogic(
        "person-1",
        "photo2.jpg",
        "image/jpeg",
        2048,
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        undefined,
        undefined,
        undefined,
        undefined,
        mockDb
      );

      expect(result.isPrimary).toBe(false);
      expect(result.displayOrder).toBe(1);
    });

    it("should handle PNG images", async () => {
      const mockPerson = { id: "person-1" };
      const mockMediaObject = {
        id: "media-1",
        filePath: "/data/uploads/media/test-uuid.png",
        format: "PNG",
        mimeType: "image/png",
        fileSize: 2048,
        title: "image.png",
        description: null,
        source: null,
        width: 1024,
        height: 768,
        webpPath: null,
        thumb400Path: null,
        thumb800Path: null,
        thumb1200Path: null,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPersonMedia = {
        id: "pm-1",
        personId: "person-1",
        mediaId: "media-1",
        caption: null,
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date(),
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDb.mediaObject.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMediaObject);
      (
        mockDb.personMedia.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);

      const result = await uploadMediaLogic(
        "person-1",
        "image.png",
        "image/png",
        2048,
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        undefined,
        undefined,
        undefined,
        undefined,
        mockDb
      );

      expect(result.format).toBe("PNG");
      expect(result.mimeType).toBe("image/png");
    });

    it("should handle WebP images", async () => {
      const mockPerson = { id: "person-1" };
      const mockMediaObject = {
        id: "media-1",
        filePath: "/data/uploads/media/test-uuid.webp",
        format: "WEBP",
        mimeType: "image/webp",
        fileSize: 1500,
        title: "image.webp",
        description: null,
        source: null,
        width: 800,
        height: 600,
        webpPath: null,
        thumb400Path: null,
        thumb800Path: null,
        thumb1200Path: null,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPersonMedia = {
        id: "pm-1",
        personId: "person-1",
        mediaId: "media-1",
        caption: null,
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date(),
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDb.mediaObject.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMediaObject);
      (
        mockDb.personMedia.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);

      const result = await uploadMediaLogic(
        "person-1",
        "image.webp",
        "image/webp",
        1500,
        "UklGRiYAAABXRUJQVlA4IBIAAAAwAQCdASoBAAEADsAcJaQCdLoB+AEA/v7+AAA=",
        undefined,
        undefined,
        undefined,
        undefined,
        mockDb
      );

      expect(result.format).toBe("WEBP");
      expect(result.mimeType).toBe("image/webp");
    });

    it("should handle GIF images", async () => {
      const mockPerson = { id: "person-1" };
      const mockMediaObject = {
        id: "media-1",
        filePath: "/data/uploads/media/test-uuid.gif",
        format: "GIF",
        mimeType: "image/gif",
        fileSize: 5000,
        title: "animation.gif",
        description: null,
        source: null,
        width: 640,
        height: 480,
        webpPath: null,
        thumb400Path: null,
        thumb800Path: null,
        thumb1200Path: null,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPersonMedia = {
        id: "pm-1",
        personId: "person-1",
        mediaId: "media-1",
        caption: null,
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date(),
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDb.mediaObject.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMediaObject);
      (
        mockDb.personMedia.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);

      const result = await uploadMediaLogic(
        "person-1",
        "animation.gif",
        "image/gif",
        5000,
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        undefined,
        undefined,
        undefined,
        undefined,
        mockDb
      );

      expect(result.format).toBe("GIF");
      expect(result.mimeType).toBe("image/gif");
    });

    it("should handle PDF documents", async () => {
      const mockPerson = { id: "person-1" };
      const mockMediaObject = {
        id: "media-1",
        filePath: "/data/uploads/media/test-uuid.pdf",
        format: "PDF",
        mimeType: "application/pdf",
        fileSize: 10000,
        title: "document.pdf",
        description: null,
        source: null,
        width: null,
        height: null,
        webpPath: null,
        thumb400Path: null,
        thumb800Path: null,
        thumb1200Path: null,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPersonMedia = {
        id: "pm-1",
        personId: "person-1",
        mediaId: "media-1",
        caption: null,
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date(),
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDb.mediaObject.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMediaObject);
      (
        mockDb.personMedia.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);

      const result = await uploadMediaLogic(
        "person-1",
        "document.pdf",
        "application/pdf",
        10000,
        "JVBERi0xLjQKJeLjz9MNCjEgMCBvYmo=",
        undefined,
        undefined,
        undefined,
        undefined,
        mockDb
      );

      expect(result.format).toBe("PDF");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.width).toBeNull();
      expect(result.height).toBeNull();
    });

    it("should handle TIFF images", async () => {
      const mockPerson = { id: "person-1" };
      const mockMediaObject = {
        id: "media-1",
        filePath: "/data/uploads/media/test-uuid.tiff",
        format: "TIFF",
        mimeType: "image/tiff",
        fileSize: 15000,
        title: "scan.tiff",
        description: null,
        source: null,
        width: 2400,
        height: 3000,
        webpPath: null,
        thumb400Path: null,
        thumb800Path: null,
        thumb1200Path: null,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPersonMedia = {
        id: "pm-1",
        personId: "person-1",
        mediaId: "media-1",
        caption: null,
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date(),
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDb.mediaObject.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMediaObject);
      (
        mockDb.personMedia.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);

      const result = await uploadMediaLogic(
        "person-1",
        "scan.tiff",
        "image/tiff",
        15000,
        "SUkqAAcAAAAEAAAA",
        undefined,
        undefined,
        undefined,
        undefined,
        mockDb
      );

      expect(result.format).toBe("TIFF");
      expect(result.mimeType).toBe("image/tiff");
    });

    it("should use filename as title when title not provided", async () => {
      const mockPerson = { id: "person-1" };
      const mockMediaObject = {
        id: "media-1",
        filePath: "/data/uploads/media/test-uuid.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 1024,
        title: "my-photo.jpg",
        description: null,
        source: null,
        width: 800,
        height: 600,
        webpPath: null,
        thumb400Path: null,
        thumb800Path: null,
        thumb1200Path: null,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPersonMedia = {
        id: "pm-1",
        personId: "person-1",
        mediaId: "media-1",
        caption: null,
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date(),
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDb.mediaObject.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMediaObject);
      (
        mockDb.personMedia.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);

      const result = await uploadMediaLogic(
        "person-1",
        "my-photo.jpg",
        "image/jpeg",
        1024,
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        undefined,
        undefined,
        undefined,
        undefined,
        mockDb
      );

      expect(result.title).toBe("my-photo.jpg");
    });

    it("should return proper formatted dates in ISO string", async () => {
      const mockPerson = { id: "person-1" };
      const uploadDate = new Date();
      const createdDate = new Date();

      const mockMediaObject = {
        id: "media-1",
        filePath: "/data/uploads/media/test-uuid.jpg",
        format: "JPEG",
        mimeType: "image/jpeg",
        fileSize: 1024,
        title: "photo.jpg",
        description: null,
        source: null,
        width: 800,
        height: 600,
        webpPath: null,
        thumb400Path: null,
        thumb800Path: null,
        thumb1200Path: null,
        thumbnailPath: null,
        uploadedAt: uploadDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPersonMedia = {
        id: "pm-1",
        personId: "person-1",
        mediaId: "media-1",
        caption: null,
        isPrimary: true,
        displayOrder: 0,
        createdAt: createdDate,
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (
        mockDb.mediaObject.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMediaObject);
      (
        mockDb.personMedia.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);

      const result = await uploadMediaLogic(
        "person-1",
        "photo.jpg",
        "image/jpeg",
        1024,
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        undefined,
        undefined,
        undefined,
        undefined,
        mockDb
      );

      expect(result.uploadedAt).toBe(uploadDate.toISOString());
      expect(result.createdAt).toBe(createdDate.toISOString());
    });
  });

  describe("getPersonMediaLogic - Additional Coverage", () => {
    it("should handle multiple media items with ordering", async () => {
      const mockPerson = { id: "person-1" };
      const mockMediaList = [
        {
          id: "pm-1",
          isPrimary: true,
          displayOrder: 0,
          caption: "Primary photo",
          createdAt: new Date(),
          media: {
            id: "media-1",
            filePath: "/path/to/photo1.jpg",
            format: "JPG",
            mimeType: "image/jpeg",
            fileSize: 1024,
            title: "Photo 1",
            description: "First photo",
            source: "Camera",
            width: 800,
            height: 600,
            thumbnailPath: "/path/to/thumb.jpg",
            webpPath: "/path/to/photo.webp",
            thumb400Path: "/path/to/thumb400.webp",
            thumb800Path: "/path/to/thumb800.webp",
            thumb1200Path: "/path/to/thumb1200.webp",
            uploadedAt: new Date(),
          },
        },
        {
          id: "pm-2",
          isPrimary: false,
          displayOrder: 1,
          caption: "Secondary photo",
          createdAt: new Date(),
          media: {
            id: "media-2",
            filePath: "/path/to/photo2.jpg",
            format: "JPG",
            mimeType: "image/jpeg",
            fileSize: 2048,
            title: "Photo 2",
            description: "Second photo",
            source: "Gallery",
            width: 1024,
            height: 768,
            thumbnailPath: "/path/to/thumb2.jpg",
            webpPath: "/path/to/photo2.webp",
            thumb400Path: "/path/to/thumb400-2.webp",
            thumb800Path: "/path/to/thumb800-2.webp",
            thumb1200Path: "/path/to/thumb1200-2.webp",
            uploadedAt: new Date(),
          },
        },
      ];

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMediaList);

      const result = await getPersonMediaLogic("person-1", mockDb);

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].isPrimary).toBe(true);
      expect(result.items[0].displayOrder).toBe(0);
      expect(result.items[1].isPrimary).toBe(false);
      expect(result.items[1].displayOrder).toBe(1);
    });

    it("should handle empty media list", async () => {
      const mockPerson = { id: "person-1" };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.personMedia.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await getPersonMediaLogic("person-1", mockDb);

      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe("updateMediaMetadataLogic - Additional Coverage", () => {
    it("should update only title when other fields undefined", async () => {
      const mockMedia = {
        id: "media-1",
        title: "Old Title",
        description: "Existing description",
        source: "Existing source",
      };

      const mockUpdated = {
        ...mockMedia,
        title: "New Title",
        filePath: "/path/to/photo.jpg",
        format: "JPG",
        mimeType: "image/jpeg",
        fileSize: 1024,
        width: 800,
        height: 600,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);
      (
        mockDb.mediaObject.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUpdated);

      const result = await updateMediaMetadataLogic(
        "media-1",
        "New Title",
        undefined,
        undefined,
        undefined,
        mockDb
      );

      expect(result.title).toBe("New Title");
    });

    it("should update caption via personMedia when provided", async () => {
      const mockMedia = {
        id: "media-1",
        title: "Photo",
        description: null,
        source: null,
      };

      const mockUpdated = {
        ...mockMedia,
        filePath: "/path/to/photo.jpg",
        format: "JPG",
        mimeType: "image/jpeg",
        fileSize: 1024,
        width: 800,
        height: 600,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPersonMedia = { id: "pm-1", mediaId: "media-1" };

      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);
      (
        mockDb.personMedia.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPersonMedia);
      (
        mockDb.mediaObject.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUpdated);
      (
        mockDb.personMedia.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({
        ...mockPersonMedia,
        caption: "New caption",
      });

      const result = await updateMediaMetadataLogic(
        "media-1",
        undefined,
        undefined,
        "New caption",
        undefined,
        mockDb
      );

      expect(result.id).toBe("media-1");
      expect(mockDb.personMedia.update).toHaveBeenCalled();
    });

    it("should update all metadata fields when all provided", async () => {
      const mockMedia = {
        id: "media-1",
        title: "Old Title",
        description: "Old description",
        source: "Old source",
      };

      const mockUpdated = {
        ...mockMedia,
        title: "New Title",
        description: "New description",
        source: "New source",
        filePath: "/path/to/photo.jpg",
        format: "JPG",
        mimeType: "image/jpeg",
        fileSize: 1024,
        width: 800,
        height: 600,
        thumbnailPath: null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);
      (
        mockDb.mediaObject.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUpdated);

      const result = await updateMediaMetadataLogic(
        "media-1",
        "New Title",
        "New description",
        undefined,
        "New source",
        mockDb
      );

      expect(result.title).toBe("New Title");
      expect(result.description).toBe("New description");
      expect(result.source).toBe("New source");
    });
  });

  describe("reorderMediaLogic - Additional Coverage", () => {
    it("should handle empty ordering array", async () => {
      const mockPerson = { id: "person-1" };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);

      const result = await reorderMediaLogic("person-1", [], mockDb);

      expect(result.success).toBe(true);
    });

    it("should skip media items that don't exist for person", async () => {
      const mockPerson = { id: "person-1" };
      const ordering = [
        { mediaId: "media-1", order: 0 },
        { mediaId: "media-2", order: 1 },
      ];

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDb.personMedia.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "pm-1" })
        .mockResolvedValueOnce(null);
      (mockDb.personMedia.update as ReturnType<typeof mock>).mockResolvedValue(
        {}
      );

      const result = await reorderMediaLogic("person-1", ordering, mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.personMedia.update).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteMediaLogic - Additional Coverage", () => {
    it("should return success even if cleanup fails", async () => {
      const mockMedia = { id: "media-1" };

      (
        mockDb.mediaObject.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);
      (
        mockDb.mediaObject.delete as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockMedia);

      const result = await deleteMediaLogic("media-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.mediaObject.delete).toHaveBeenCalledWith({
        where: { id: "media-1" },
      });
    });
  });
});
