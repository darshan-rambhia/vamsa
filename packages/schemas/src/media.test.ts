/**
 * Unit Tests for Media Schemas
 * Tests Zod schema validation for media management and uploads
 */
import { describe, expect, it } from "bun:test";
import {
  linkMediaToEventSchema,
  mediaFormatEnum,
  mediaMetadataSchema,
  mediaReorderSchema,
  mediaUploadSchema,
  setPrimaryPhotoSchema,
} from "./media";
import type {
  LinkMediaToEventInput,
  MediaMetadataInput,
  MediaReorderInput,
  MediaUploadInput,
  SetPrimaryPhotoInput,
} from "./media";

describe("mediaFormatEnum", () => {
  it("should accept all valid media formats", () => {
    const validFormats = [
      "JPEG",
      "PNG",
      "GIF",
      "WEBP",
      "PDF",
      "TIFF",
      "BMP",
      "SVG",
    ];

    validFormats.forEach((format) => {
      const result = mediaFormatEnum.safeParse(format);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid media formats", () => {
    const invalidFormats = [
      "jpeg",
      "jpg",
      "png",
      "INVALID",
      "MP4",
      "DOC",
      "",
      null,
    ];

    invalidFormats.forEach((format) => {
      const result = mediaFormatEnum.safeParse(format);
      expect(result.success).toBe(false);
    });
  });

  it("should be case-sensitive for format values", () => {
    const result = mediaFormatEnum.safeParse("jpeg");
    expect(result.success).toBe(false);
  });
});

describe("mediaUploadSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete media upload", () => {
      const upload: MediaUploadInput = {
        personId: "person-123",
        file: {
          name: "photo.jpg",
          size: 1024000,
          type: "image/jpeg",
        },
        title: "Family Photo",
        description: "A precious family memory",
        source: "Personal Collection",
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(true);
    });

    it("should validate minimal media upload with required fields only", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "photo.jpg",
          size: 1024,
          type: "image/jpeg",
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(true);
    });

    it("should accept file with various MIME types", () => {
      const mimeTypes = ["image/jpeg", "image/png", "application/pdf"];

      mimeTypes.forEach((type) => {
        const upload = {
          personId: "person-123",
          file: {
            name: "file",
            size: 1000,
            type,
          },
        };

        const result = mediaUploadSchema.safeParse(upload);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Person ID validation", () => {
    it("should reject missing personId", () => {
      const upload = {
        file: {
          name: "photo.jpg",
          size: 1024,
          type: "image/jpeg",
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(false);
    });

    it("should reject empty personId", () => {
      const upload = {
        personId: "",
        file: {
          name: "photo.jpg",
          size: 1024,
          type: "image/jpeg",
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(false);
    });

    it("should accept various personId formats", () => {
      const personIds = ["p1", "person-123", "uuid-format-id", "123"];

      personIds.forEach((personId) => {
        const upload = {
          personId,
          file: {
            name: "photo.jpg",
            size: 1024,
            type: "image/jpeg",
          },
        };

        const result = mediaUploadSchema.safeParse(upload);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("File object validation", () => {
    it("should reject missing file object", () => {
      const upload = { personId: "person-123" };
      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(false);
    });

    it("should reject file with missing name", () => {
      const upload = {
        personId: "person-123",
        file: {
          size: 1024,
          type: "image/jpeg",
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(false);
    });

    it("should reject file with empty name", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "",
          size: 1024,
          type: "image/jpeg",
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(false);
    });

    it("should reject file with missing size", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "photo.jpg",
          type: "image/jpeg",
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(false);
    });

    it("should reject file with missing type", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "photo.jpg",
          size: 1024,
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(false);
    });

    it("should reject file with empty type", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "photo.jpg",
          size: 1024,
          type: "",
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(false);
    });
  });

  describe("File size validation", () => {
    it("should reject zero file size", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "photo.jpg",
          size: 0,
          type: "image/jpeg",
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(false);
    });

    it("should reject negative file size", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "photo.jpg",
          size: -1,
          type: "image/jpeg",
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(false);
    });

    it("should accept small file size", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "tiny.jpg",
          size: 1,
          type: "image/jpeg",
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(true);
    });

    it("should accept large file size", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "huge.jpg",
          size: 5000000000,
          type: "image/jpeg",
        },
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(true);
    });
  });

  describe("Optional fields", () => {
    it("should accept empty string for title", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "photo.jpg",
          size: 1024,
          type: "image/jpeg",
        },
        title: "",
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(true);
    });

    it("should accept empty string for description", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "photo.jpg",
          size: 1024,
          type: "image/jpeg",
        },
        description: "",
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(true);
    });

    it("should accept empty string for source", () => {
      const upload = {
        personId: "person-123",
        file: {
          name: "photo.jpg",
          size: 1024,
          type: "image/jpeg",
        },
        source: "",
      };

      const result = mediaUploadSchema.safeParse(upload);
      expect(result.success).toBe(true);
    });
  });

  describe("Type inference", () => {
    it("should infer correct upload input type", () => {
      const upload: MediaUploadInput = {
        personId: "person-123",
        file: {
          name: "photo.jpg",
          size: 1024,
          type: "image/jpeg",
        },
      };

      expect(upload.personId).toBe("person-123");
    });
  });
});

describe("mediaMetadataSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete metadata", () => {
      const metadata: MediaMetadataInput = {
        mediaId: "media-123",
        title: "Photo Title",
        description: "Photo Description",
        caption: "Photo Caption",
        source: "Family Collection",
      };

      const result = mediaMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should validate with only mediaId", () => {
      const metadata = {
        mediaId: "media-123",
      };

      const result = mediaMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should accept empty strings for optional fields", () => {
      const metadata = {
        mediaId: "media-123",
        title: "",
        description: "",
        caption: "",
        source: "",
      };

      const result = mediaMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });
  });

  describe("Media ID validation", () => {
    it("should reject missing mediaId", () => {
      const metadata = {
        title: "Photo",
      };

      const result = mediaMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it("should reject empty mediaId", () => {
      const metadata = {
        mediaId: "",
        title: "Photo",
      };

      const result = mediaMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it("should accept various mediaId formats", () => {
      const mediaIds = ["m1", "media-123", "uuid-format-id"];

      mediaIds.forEach((mediaId) => {
        const metadata = { mediaId };
        const result = mediaMetadataSchema.safeParse(metadata);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Type inference", () => {
    it("should infer correct metadata input type", () => {
      const metadata: MediaMetadataInput = {
        mediaId: "media-123",
        title: "Title",
      };

      expect(metadata.mediaId).toBe("media-123");
    });
  });
});

describe("mediaReorderSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete reorder with multiple items", () => {
      const reorder: MediaReorderInput = {
        personId: "person-123",
        ordering: [
          { mediaId: "media-1", order: 0 },
          { mediaId: "media-2", order: 1 },
          { mediaId: "media-3", order: 2 },
        ],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(true);
    });

    it("should validate with single item", () => {
      const reorder = {
        personId: "person-123",
        ordering: [{ mediaId: "media-1", order: 0 }],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(true);
    });

    it("should validate with empty ordering", () => {
      const reorder = {
        personId: "person-123",
        ordering: [],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(true);
    });

    it("should accept order 0", () => {
      const reorder = {
        personId: "person-123",
        ordering: [{ mediaId: "media-1", order: 0 }],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(true);
    });

    it("should accept large order values", () => {
      const reorder = {
        personId: "person-123",
        ordering: [
          { mediaId: "media-1", order: 9999 },
          { mediaId: "media-2", order: 10000 },
        ],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(true);
    });
  });

  describe("Person ID validation", () => {
    it("should reject missing personId", () => {
      const reorder = {
        ordering: [{ mediaId: "media-1", order: 0 }],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(false);
    });

    it("should reject empty personId", () => {
      const reorder = {
        personId: "",
        ordering: [{ mediaId: "media-1", order: 0 }],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(false);
    });
  });

  describe("Ordering array validation", () => {
    it("should reject missing ordering", () => {
      const reorder = { personId: "person-123" };
      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(false);
    });

    it("should reject item without mediaId", () => {
      const reorder = {
        personId: "person-123",
        ordering: [{ order: 0 }],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(false);
    });

    it("should reject item with empty mediaId", () => {
      const reorder = {
        personId: "person-123",
        ordering: [{ mediaId: "", order: 0 }],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(false);
    });

    it("should reject item without order", () => {
      const reorder = {
        personId: "person-123",
        ordering: [{ mediaId: "media-1" }],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(false);
    });

    it("should reject negative order value", () => {
      const reorder = {
        personId: "person-123",
        ordering: [{ mediaId: "media-1", order: -1 }],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer order", () => {
      const reorder = {
        personId: "person-123",
        ordering: [{ mediaId: "media-1", order: 1.5 }],
      };

      const result = mediaReorderSchema.safeParse(reorder);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct reorder input type", () => {
      const reorder: MediaReorderInput = {
        personId: "person-123",
        ordering: [{ mediaId: "media-1", order: 0 }],
      };

      expect(reorder.personId).toBe("person-123");
    });
  });
});

describe("linkMediaToEventSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete media-event link", () => {
      const link: LinkMediaToEventInput = {
        mediaId: "media-123",
        eventId: "event-456",
      };

      const result = linkMediaToEventSchema.safeParse(link);
      expect(result.success).toBe(true);
    });
  });

  describe("Media ID validation", () => {
    it("should reject missing mediaId", () => {
      const link = { eventId: "event-456" };
      const result = linkMediaToEventSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject empty mediaId", () => {
      const link = {
        mediaId: "",
        eventId: "event-456",
      };

      const result = linkMediaToEventSchema.safeParse(link);
      expect(result.success).toBe(false);
    });
  });

  describe("Event ID validation", () => {
    it("should reject missing eventId", () => {
      const link = { mediaId: "media-123" };
      const result = linkMediaToEventSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject empty eventId", () => {
      const link = {
        mediaId: "media-123",
        eventId: "",
      };

      const result = linkMediaToEventSchema.safeParse(link);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct link input type", () => {
      const link: LinkMediaToEventInput = {
        mediaId: "media-123",
        eventId: "event-456",
      };

      expect(link.mediaId).toBe("media-123");
    });
  });
});

describe("setPrimaryPhotoSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete primary photo set", () => {
      const setPrimary: SetPrimaryPhotoInput = {
        personId: "person-123",
        mediaId: "media-456",
      };

      const result = setPrimaryPhotoSchema.safeParse(setPrimary);
      expect(result.success).toBe(true);
    });

    it("should accept various ID formats", () => {
      const inputs = [
        { personId: "p1", mediaId: "m1" },
        { personId: "person-123", mediaId: "media-456" },
        { personId: "uuid-format-id", mediaId: "uuid-media-id" },
      ];

      inputs.forEach((input) => {
        const result = setPrimaryPhotoSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Person ID validation", () => {
    it("should reject missing personId", () => {
      const setPrimary = { mediaId: "media-456" };
      const result = setPrimaryPhotoSchema.safeParse(setPrimary);
      expect(result.success).toBe(false);
    });

    it("should reject empty personId", () => {
      const setPrimary = {
        personId: "",
        mediaId: "media-456",
      };

      const result = setPrimaryPhotoSchema.safeParse(setPrimary);
      expect(result.success).toBe(false);
    });
  });

  describe("Media ID validation", () => {
    it("should reject missing mediaId", () => {
      const setPrimary = { personId: "person-123" };
      const result = setPrimaryPhotoSchema.safeParse(setPrimary);
      expect(result.success).toBe(false);
    });

    it("should reject empty mediaId", () => {
      const setPrimary = {
        personId: "person-123",
        mediaId: "",
      };

      const result = setPrimaryPhotoSchema.safeParse(setPrimary);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct set primary photo input type", () => {
      const setPrimary: SetPrimaryPhotoInput = {
        personId: "person-123",
        mediaId: "media-456",
      };

      expect(setPrimary.personId).toBe("person-123");
    });
  });
});
