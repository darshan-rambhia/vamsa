/**
 * Unit tests for image utilities
 *
 * Tests cover:
 * - buildSrcSet: srcSet string generation
 * - selectImageSource: Image source selection
 * - selectAvatarSource: Avatar fallback chain
 * - calculateInitials: Name to initials conversion
 */

import { describe, it, expect } from "bun:test";
import {
  buildSrcSet,
  selectImageSource,
  selectAvatarSource,
  calculateInitials,
} from "./image-utils";

describe("Image Utilities", () => {
  describe("buildSrcSet", () => {
    it("should build srcSet with all three sizes", () => {
      const result = buildSrcSet(
        "media/thumb400.webp",
        "media/thumb800.webp",
        "media/thumb1200.webp"
      );

      expect(result).toBe(
        "/media/thumb400.webp 400w, /media/thumb800.webp 800w, /media/thumb1200.webp 1200w"
      );
    });

    it("should build srcSet with only some sizes", () => {
      const result = buildSrcSet(
        "media/thumb400.webp",
        null,
        "media/thumb1200.webp"
      );

      expect(result).toBe(
        "/media/thumb400.webp 400w, /media/thumb1200.webp 1200w"
      );
    });

    it("should build srcSet with single size", () => {
      const result = buildSrcSet(null, "media/thumb800.webp", null);

      expect(result).toBe("/media/thumb800.webp 800w");
    });

    it("should return empty string when no paths provided", () => {
      const result = buildSrcSet(null, null, null);

      expect(result).toBe("");
    });

    it("should return empty string when all paths are undefined", () => {
      const result = buildSrcSet(undefined, undefined, undefined);

      expect(result).toBe("");
    });

    it("should handle empty string paths as falsy", () => {
      const result = buildSrcSet("", "", "");

      expect(result).toBe("");
    });
  });

  describe("selectImageSource", () => {
    it("should prefer webpPath when available", () => {
      const result = selectImageSource("media/photo.webp", "media/photo.jpg");

      expect(result).toBe("/media/photo.webp");
    });

    it("should fall back to filePath when webpPath is null", () => {
      const result = selectImageSource(null, "media/photo.jpg");

      expect(result).toBe("media/photo.jpg");
    });

    it("should fall back to filePath when webpPath is undefined", () => {
      const result = selectImageSource(undefined, "media/photo.jpg");

      expect(result).toBe("media/photo.jpg");
    });

    it("should return empty string when no paths available", () => {
      const result = selectImageSource(null, undefined);

      expect(result).toBe("");
    });

    it("should prepend slash to webpPath", () => {
      const result = selectImageSource("path/to/image.webp", undefined);

      expect(result).toBe("/path/to/image.webp");
    });

    it("should not prepend slash to filePath (preserves existing format)", () => {
      const result = selectImageSource(null, "/already/has/slash.jpg");

      expect(result).toBe("/already/has/slash.jpg");
    });
  });

  describe("selectAvatarSource", () => {
    it("should prefer thumbnailPath when available", () => {
      const result = selectAvatarSource(
        "media/thumb.webp",
        "media/full.webp",
        "media/original.jpg"
      );

      expect(result).toBe("/media/thumb.webp");
    });

    it("should fall back to webpPath when thumbnailPath is null", () => {
      const result = selectAvatarSource(
        null,
        "media/full.webp",
        "media/original.jpg"
      );

      expect(result).toBe("/media/full.webp");
    });

    it("should fall back to filePath when both thumb and webp are null", () => {
      const result = selectAvatarSource(null, null, "media/original.jpg");

      expect(result).toBe("media/original.jpg");
    });

    it("should return null when no paths available", () => {
      const result = selectAvatarSource(null, null, null);

      expect(result).toBeNull();
    });

    it("should return null when all paths are undefined", () => {
      const result = selectAvatarSource(undefined, undefined, undefined);

      expect(result).toBeNull();
    });

    it("should prepend slash to thumbnailPath", () => {
      const result = selectAvatarSource("path/to/thumb.webp", null, null);

      expect(result).toBe("/path/to/thumb.webp");
    });

    it("should prepend slash to webpPath", () => {
      const result = selectAvatarSource(null, "path/to/full.webp", null);

      expect(result).toBe("/path/to/full.webp");
    });
  });

  describe("calculateInitials", () => {
    it("should calculate initials from two-word name", () => {
      const result = calculateInitials("John Doe", undefined);

      expect(result).toBe("JD");
    });

    it("should calculate initials from single-word name", () => {
      const result = calculateInitials("Jane", undefined);

      expect(result).toBe("J");
    });

    it("should limit to two initials for long names", () => {
      const result = calculateInitials("John Paul Smith Jones", undefined);

      expect(result).toBe("JP");
    });

    it("should use fallbackInitials when provided", () => {
      const result = calculateInitials("John Doe", "X");

      expect(result).toBe("X");
    });

    it("should convert to uppercase", () => {
      const result = calculateInitials("john doe", undefined);

      expect(result).toBe("JD");
    });

    it("should return ? for empty name", () => {
      const result = calculateInitials("", undefined);

      expect(result).toBe("?");
    });

    it("should return ? for whitespace-only name", () => {
      const result = calculateInitials("   ", undefined);

      expect(result).toBe("?");
    });

    it("should handle names with extra spaces", () => {
      const result = calculateInitials("John  Doe", undefined);

      // Extra spaces are filtered out before processing
      expect(result).toBe("JD");
    });

    it("should return fallback even if empty string", () => {
      const result = calculateInitials("John Doe", "");

      // Empty string is falsy, so it should calculate
      expect(result).toBe("JD");
    });

    it("should handle single character names", () => {
      const result = calculateInitials("J D", undefined);

      expect(result).toBe("JD");
    });
  });
});
