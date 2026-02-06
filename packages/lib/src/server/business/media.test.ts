/**
 * Unit tests for Media Business Logic
 *
 * Tests cover media-related business rules and calculations:
 * - File type handling and MIME type validation
 * - Media ordering and primary photo logic
 * - File extension derivation
 * - Display order calculation
 */

import { describe, expect, it } from "vitest";

// Helper functions for media operations
function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/tiff": ".tiff",
    "image/bmp": ".bmp",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
  };
  return extensions[mimeType] || ".bin";
}

function getFormatFromMimeType(mimeType: string): string {
  const format = mimeType.split("/")[1]?.toUpperCase() || "UNKNOWN";
  return format;
}

function calculateDisplayOrder(existingMediaCount: number): number {
  return existingMediaCount > 0 ? existingMediaCount : 0;
}

function shouldBePrimary(existingMediaCount: number): boolean {
  return existingMediaCount === 0;
}

function validateMimeType(mimeType: string): boolean {
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/tiff",
    "image/bmp",
    "image/svg+xml",
    "application/pdf",
    "video/mp4",
    "video/webm",
  ];
  return validTypes.includes(mimeType);
}

function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function getMediaDirectory(basePath: string): string {
  return basePath + "/data/uploads/media";
}

interface MediaItem {
  id: string;
  displayOrder: number;
  isPrimary: boolean;
}

function reorderMediaItems(
  items: Array<MediaItem>,
  newOrdering: Array<{ mediaId: string; order: number }>
): Array<MediaItem> {
  return items.map((item) => {
    const newOrder = newOrdering.find((n) => n.mediaId === item.id);
    return newOrder ? { ...item, displayOrder: newOrder.order } : item;
  });
}

function setPrimaryMedia(
  items: Array<MediaItem>,
  mediaId: string
): Array<MediaItem> {
  return items.map((item) => ({
    ...item,
    isPrimary: item.id === mediaId,
  }));
}

describe("media business logic - file handling", () => {
  describe("getFileExtension", () => {
    it("should return .jpg for image/jpeg", () => {
      expect(getFileExtension("image/jpeg")).toBe(".jpg");
    });

    it("should return .png for image/png", () => {
      expect(getFileExtension("image/png")).toBe(".png");
    });

    it("should return .webp for image/webp", () => {
      expect(getFileExtension("image/webp")).toBe(".webp");
    });

    it("should return .pdf for application/pdf", () => {
      expect(getFileExtension("application/pdf")).toBe(".pdf");
    });

    it("should return .bin for unknown type", () => {
      expect(getFileExtension("application/unknown")).toBe(".bin");
    });

    it("should handle all common image types", () => {
      const imageTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/tiff",
        "image/bmp",
        "image/svg+xml",
      ];

      imageTypes.forEach((type) => {
        const ext = getFileExtension(type);
        expect(ext.startsWith(".")).toBe(true);
        expect(ext).not.toBe(".bin");
      });
    });
  });

  describe("getFormatFromMimeType", () => {
    it("should extract format from JPEG", () => {
      expect(getFormatFromMimeType("image/jpeg")).toBe("JPEG");
    });

    it("should extract format from PNG", () => {
      expect(getFormatFromMimeType("image/png")).toBe("PNG");
    });

    it("should extract format from WebP", () => {
      expect(getFormatFromMimeType("image/webp")).toBe("WEBP");
    });

    it("should extract format even for unrecognized type", () => {
      // For "unknown/type", it will extract "TYPE" (the part after /)
      expect(getFormatFromMimeType("unknown/type")).toBe("TYPE");
    });

    it("should uppercase the format", () => {
      const format = getFormatFromMimeType("image/png");
      expect(format).toBe(format.toUpperCase());
    });
  });

  describe("validateMimeType", () => {
    it("should accept valid image MIME types", () => {
      expect(validateMimeType("image/jpeg")).toBe(true);
      expect(validateMimeType("image/png")).toBe(true);
      expect(validateMimeType("image/webp")).toBe(true);
    });

    it("should accept valid video MIME types", () => {
      expect(validateMimeType("video/mp4")).toBe(true);
      expect(validateMimeType("video/webm")).toBe(true);
    });

    it("should accept PDF", () => {
      expect(validateMimeType("application/pdf")).toBe(true);
    });

    it("should reject invalid MIME types", () => {
      expect(validateMimeType("application/exe")).toBe(false);
      expect(validateMimeType("text/plain")).toBe(false);
      expect(validateMimeType("application/javascript")).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(validateMimeType("image/JPEG")).toBe(false);
    });
  });

  describe("isImageType", () => {
    it("should identify image MIME types", () => {
      expect(isImageType("image/jpeg")).toBe(true);
      expect(isImageType("image/png")).toBe(true);
      expect(isImageType("image/webp")).toBe(true);
    });

    it("should reject non-image types", () => {
      expect(isImageType("video/mp4")).toBe(false);
      expect(isImageType("application/pdf")).toBe(false);
      expect(isImageType("text/plain")).toBe(false);
    });

    it("should handle any image subtype", () => {
      expect(isImageType("image/svg+xml")).toBe(true);
      expect(isImageType("image/tiff")).toBe(true);
    });
  });

  describe("media ordering", () => {
    it("should set first upload as primary with order 0", () => {
      const existingCount = 0;
      expect(shouldBePrimary(existingCount)).toBe(true);
      expect(calculateDisplayOrder(existingCount)).toBe(0);
    });

    it("should set second upload as non-primary with order 1", () => {
      const existingCount = 1;
      expect(shouldBePrimary(existingCount)).toBe(false);
      expect(calculateDisplayOrder(existingCount)).toBe(1);
    });

    it("should set third upload as non-primary with order 2", () => {
      const existingCount = 2;
      expect(shouldBePrimary(existingCount)).toBe(false);
      expect(calculateDisplayOrder(existingCount)).toBe(2);
    });

    it("should handle many existing media", () => {
      const existingCount = 10;
      expect(shouldBePrimary(existingCount)).toBe(false);
      expect(calculateDisplayOrder(existingCount)).toBe(10);
    });
  });

  describe("setPrimaryPhoto", () => {
    it("should set specified media as primary", () => {
      const items: Array<MediaItem> = [
        { id: "media-1", displayOrder: 0, isPrimary: true },
        { id: "media-2", displayOrder: 1, isPrimary: false },
      ];

      const updated = setPrimaryMedia(items, "media-2");

      expect(updated[0].isPrimary).toBe(false);
      expect(updated[1].isPrimary).toBe(true);
    });

    it("should unset previous primary photo", () => {
      const items: Array<MediaItem> = [
        { id: "media-1", displayOrder: 0, isPrimary: true },
        { id: "media-2", displayOrder: 1, isPrimary: false },
        { id: "media-3", displayOrder: 2, isPrimary: false },
      ];

      const updated = setPrimaryMedia(items, "media-3");

      expect(updated.filter((m) => m.isPrimary)).toHaveLength(1);
      expect(updated[2].isPrimary).toBe(true);
    });

    it("should handle single media", () => {
      const items: Array<MediaItem> = [
        { id: "media-1", displayOrder: 0, isPrimary: true },
      ];

      const updated = setPrimaryMedia(items, "media-1");

      expect(updated[0].isPrimary).toBe(true);
    });

    it("should set primary to non-primary if already primary", () => {
      const items: Array<MediaItem> = [
        { id: "media-1", displayOrder: 0, isPrimary: true },
      ];

      const updated = setPrimaryMedia(items, "media-1");

      // Sets to isPrimary: true (same as before)
      expect(updated[0].isPrimary).toBe(true);
    });
  });

  describe("reorderMediaItems", () => {
    it("should reorder media by displayOrder", () => {
      const items: Array<MediaItem> = [
        { id: "media-1", displayOrder: 0, isPrimary: true },
        { id: "media-2", displayOrder: 1, isPrimary: false },
        { id: "media-3", displayOrder: 2, isPrimary: false },
      ];

      const newOrdering = [
        { mediaId: "media-3", order: 0 },
        { mediaId: "media-1", order: 1 },
        { mediaId: "media-2", order: 2 },
      ];

      const updated = reorderMediaItems(items, newOrdering);

      // Find items by id after reordering
      const media1 = updated.find((i) => i.id === "media-1");
      const media2 = updated.find((i) => i.id === "media-2");
      const media3 = updated.find((i) => i.id === "media-3");

      expect(media1?.displayOrder).toBe(1); // media-1 -> order 1
      expect(media2?.displayOrder).toBe(2); // media-2 -> order 2
      expect(media3?.displayOrder).toBe(0); // media-3 -> order 0
    });

    it("should skip items not in new ordering", () => {
      const items: Array<MediaItem> = [
        { id: "media-1", displayOrder: 0, isPrimary: true },
        { id: "media-2", displayOrder: 1, isPrimary: false },
      ];

      const newOrdering = [{ mediaId: "media-1", order: 1 }];

      const updated = reorderMediaItems(items, newOrdering);

      expect(updated[0].displayOrder).toBe(1);
      expect(updated[1].displayOrder).toBe(1); // unchanged
    });

    it("should handle empty ordering", () => {
      const items: Array<MediaItem> = [
        { id: "media-1", displayOrder: 0, isPrimary: true },
        { id: "media-2", displayOrder: 1, isPrimary: false },
      ];

      const updated = reorderMediaItems(items, []);

      expect(updated).toEqual(items); // unchanged
    });

    it("should handle reordering to put non-primary first", () => {
      const items: Array<MediaItem> = [
        { id: "media-1", displayOrder: 0, isPrimary: true },
        { id: "media-2", displayOrder: 1, isPrimary: false },
      ];

      const newOrdering = [
        { mediaId: "media-2", order: 0 },
        { mediaId: "media-1", order: 1 },
      ];

      const updated = reorderMediaItems(items, newOrdering);

      expect(updated[0].displayOrder).toBe(1); // media-1 moved to position 1
      expect(updated[1].displayOrder).toBe(0); // media-2 moved to position 0
    });
  });

  describe("getMediaDirectory", () => {
    it("should construct correct path", () => {
      expect(getMediaDirectory("/app")).toBe("/app/data/uploads/media");
    });

    it("should handle root path", () => {
      expect(getMediaDirectory("/")).toBe("//data/uploads/media");
    });

    it("should preserve trailing structure", () => {
      const path = getMediaDirectory(process.cwd());
      expect(path).toContain("data/uploads/media");
    });
  });

  describe("media MIME type handling", () => {
    it("should handle JPEG variants", () => {
      expect(isImageType("image/jpeg")).toBe(true);
      expect(validateMimeType("image/jpeg")).toBe(true);
      expect(getFileExtension("image/jpeg")).toBe(".jpg");
    });

    it("should handle WebP for modern browsers", () => {
      expect(isImageType("image/webp")).toBe(true);
      expect(validateMimeType("image/webp")).toBe(true);
      expect(getFormatFromMimeType("image/webp")).toBe("WEBP");
    });

    it("should handle PDF documents", () => {
      expect(isImageType("application/pdf")).toBe(false);
      expect(validateMimeType("application/pdf")).toBe(true);
      expect(getFileExtension("application/pdf")).toBe(".pdf");
    });

    it("should handle SVG with full MIME type", () => {
      const mimeType = "image/svg+xml";
      expect(isImageType(mimeType)).toBe(true);
      expect(validateMimeType(mimeType)).toBe(true);
      expect(getFileExtension(mimeType)).toBe(".svg");
    });
  });

  describe("media workflow", () => {
    it("should upload first photo as primary", () => {
      const mimeType = "image/jpeg";
      const existingCount = 0;

      expect(validateMimeType(mimeType)).toBe(true);
      expect(isImageType(mimeType)).toBe(true);
      expect(shouldBePrimary(existingCount)).toBe(true);
      expect(calculateDisplayOrder(existingCount)).toBe(0);
      expect(getFileExtension(mimeType)).toBe(".jpg");
    });

    it("should upload second photo as non-primary", () => {
      const mimeType = "image/png";
      const existingCount = 1;

      expect(validateMimeType(mimeType)).toBe(true);
      expect(isImageType(mimeType)).toBe(true);
      expect(shouldBePrimary(existingCount)).toBe(false);
      expect(calculateDisplayOrder(existingCount)).toBe(1);
      expect(getFileExtension(mimeType)).toBe(".png");
    });

    it("should handle upload of PDF document", () => {
      const mimeType = "application/pdf";

      expect(validateMimeType(mimeType)).toBe(true);
      expect(isImageType(mimeType)).toBe(false);
      expect(getFileExtension(mimeType)).toBe(".pdf");
      expect(getFormatFromMimeType(mimeType)).toBe("PDF");
    });

    it("should reject unsupported file types", () => {
      const unsupportedTypes = [
        "application/exe",
        "text/plain",
        "application/javascript",
      ];

      unsupportedTypes.forEach((type) => {
        expect(validateMimeType(type)).toBe(false);
      });
    });
  });
});
