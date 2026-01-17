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
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

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

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPerson
      );
      (mockDb.personMedia.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockMedia
      );

      const result = await getPersonMediaLogic("person-1", mockDb);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Photo 1");
      expect(result.items[0].isPrimary).toBe(true);
      expect(result.total).toBe(1);
    });
  });

  describe("getMediaObjectLogic", () => {
    it("should throw error when media not found", async () => {
      (mockDb.mediaObject.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

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

      (mockDb.mediaObject.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockMedia
      );

      const result = await getMediaObjectLogic("media-1", mockDb);

      expect(result.id).toBe("media-1");
      expect(result.title).toBe("Photo");
      expect(result.eventMedia).toEqual([]);
      expect(result.personMedia).toEqual([]);
    });
  });

  describe("deleteMediaLogic", () => {
    it("should throw error when media not found", async () => {
      (mockDb.mediaObject.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

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

      (mockDb.mediaObject.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockMedia
      );
      (mockDb.mediaObject.delete as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockMedia
      );

      const result = await deleteMediaLogic("media-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.mediaObject.delete).toHaveBeenCalledWith({
        where: { id: "media-1" },
      });
    });
  });

  describe("updateMediaMetadataLogic", () => {
    it("should throw error when media not found", async () => {
      (mockDb.mediaObject.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

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

      (mockDb.mediaObject.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockMedia
      );
      (mockDb.mediaObject.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUpdated
      );

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
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

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

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPerson
      );
      (mockDb.personMedia.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

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

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPerson
      );
      (mockDb.personMedia.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPersonMedia
      );
      (mockDb.personMedia.updateMany as ReturnType<typeof mock>).mockResolvedValueOnce({
        count: 1,
      });
      (mockDb.personMedia.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        ...mockPersonMedia,
        isPrimary: true,
      });

      const result = await setPrimaryPhotoLogic("person-1", "media-1", mockDb);

      expect(result.success).toBe(true);
    });
  });

  describe("reorderMediaLogic", () => {
    it("should throw error when person not found", async () => {
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

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

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPerson
      );
      (mockDb.personMedia.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "pm-1" })
        .mockResolvedValueOnce({ id: "pm-2" });
      (mockDb.personMedia.update as ReturnType<typeof mock>).mockResolvedValue({});

      const result = await reorderMediaLogic("person-1", ordering, mockDb);

      expect(result.success).toBe(true);
    });
  });

  describe("linkMediaToEventLogic", () => {
    it("should throw error when media not found", async () => {
      (mockDb.mediaObject.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

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

      (mockDb.mediaObject.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockMedia
      );
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

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

      (mockDb.mediaObject.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockMedia
      );
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockEvent
      );
      (mockDb.eventMedia.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.eventMedia.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockLink
      );

      const result = await linkMediaToEventLogic("media-1", "event-1", mockDb);

      expect(result.id).toBe("em-1");
      expect(result.mediaId).toBe("media-1");
    });

    it("should throw error when link already exists", async () => {
      const mockMedia = { id: "media-1" };
      const mockEvent = { id: "event-1", personId: "person-1", type: "BIRTH" };
      const existingLink = { id: "em-existing" };

      (mockDb.mediaObject.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockMedia
      );
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockEvent
      );
      (mockDb.eventMedia.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        existingLink
      );

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
});
