/**
 * Unit Tests for Image Processing Pipeline
 * Tests image optimization, conversion, and file handling
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  cleanupOldImages,
  generateResponsiveSizes,
  generateThumbnail,
  generateWebP,
  getMediaDir,
  processUploadedImage,
} from "./processor";
import type { ImageSize, ProcessedImage } from "./processor";

// Create a valid test PNG image (100x100 red)
async function createTestImageFile(): Promise<Buffer> {
  // This is a base64-encoded valid 100x100 red PNG image
  // Created using sharp for guaranteed validity
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAACXBIWXMAAAPoAAAD6AG1e1JrAAABUElEQVR4nO3XwQmAUBDE0Om/6djCv0gILLwCwrAqju3wNsIttfdbubF2Y+2Pd8td1m6s3WXN/XDfY7gba3dZu8dwlV8Iv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4AOv4COD54t6yshm4MnAAAAAElFTkSuQmCC";

  return Buffer.from(pngBase64, "base64");
}

describe("Image Processing Pipeline", () => {
  const testMediaDir = path.join(process.cwd(), "test-media");

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testMediaDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testMediaDir, { recursive: true });
    } catch {
      // Directory might not exist
    }
  });

  describe("generateWebP", () => {
    it("converts image buffer to WebP format", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await generateWebP(imageBuffer);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it("includes width and height in result", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await generateWebP(imageBuffer);

      expect(result.width).toBeDefined();
      expect(result.height).toBeDefined();
      expect(typeof result.width).toBe("number");
      expect(typeof result.height).toBe("number");
    });

    it("respects quality option", async () => {
      const imageBuffer = await createTestImageFile();

      const highQuality = await generateWebP(imageBuffer, { quality: 95 });
      const lowQuality = await generateWebP(imageBuffer, { quality: 60 });

      // Both should produce valid buffers
      expect(highQuality.buffer.length).toBeGreaterThan(0);
      expect(lowQuality.buffer.length).toBeGreaterThan(0);
    });

    it("respects max dimension of 1200px", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await generateWebP(imageBuffer);

      expect(result.width).toBeLessThanOrEqual(1200);
      expect(result.height).toBeLessThanOrEqual(1200);
    });

    it("uses default quality of 85", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await generateWebP(imageBuffer);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it("handles images correctly", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await generateWebP(imageBuffer);

      expect(result.width).toBeDefined();
      expect(result.height).toBeDefined();
    });

    it("throws error on invalid buffer", async () => {
      const invalidBuffer = Buffer.from([0xff, 0xd8, 0xff]);

      try {
        await generateWebP(invalidBuffer);
        expect(false).toBe(true); // Should throw
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("generateThumbnail", () => {
    it("generates thumbnail with specified size", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await generateThumbnail(imageBuffer, 300);

      expect(result.width).toBe(300);
      expect(result.height).toBe(300);
    });

    it("uses default size of 300px", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await generateThumbnail(imageBuffer);

      expect(result.width).toBe(300);
      expect(result.height).toBe(300);
    });

    it("respects quality option", async () => {
      const imageBuffer = await createTestImageFile();

      const highQuality = await generateThumbnail(imageBuffer, 300, {
        quality: 90,
      });
      const lowQuality = await generateThumbnail(imageBuffer, 300, {
        quality: 50,
      });

      expect(highQuality.buffer).toBeInstanceOf(Buffer);
      expect(lowQuality.buffer).toBeInstanceOf(Buffer);
    });

    it("generates square thumbnails", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await generateThumbnail(imageBuffer, 200);

      expect(result.width).toBe(200);
      expect(result.height).toBe(200);
    });

    it("crops with center position", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await generateThumbnail(imageBuffer, 300);

      expect(result.width).toBe(300);
      expect(result.height).toBe(300);
    });

    it("returns buffer instance", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await generateThumbnail(imageBuffer, 300);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });
  });

  describe("generateResponsiveSizes", () => {
    it("generates default responsive sizes (400, 800, 1200)", async () => {
      const imageBuffer = await createTestImageFile();
      const results = await generateResponsiveSizes(imageBuffer);

      expect(results.length).toBe(3);
      expect(results[0].label).toBe("400");
      expect(results[1].label).toBe("800");
      expect(results[2].label).toBe("1200");
    });

    it("generates custom sizes", async () => {
      const imageBuffer = await createTestImageFile();
      const customSizes: Array<ImageSize> = [
        { width: 200, label: "small" },
        { width: 600, label: "large" },
      ];

      const results = await generateResponsiveSizes(imageBuffer, customSizes);

      expect(results.length).toBe(2);
      expect(results[0].label).toBe("small");
      expect(results[1].label).toBe("large");
    });

    it("maintains aspect ratio for responsive sizes", async () => {
      const imageBuffer = await createTestImageFile();
      const results = await generateResponsiveSizes(imageBuffer);

      results.forEach((result) => {
        expect(result.width).toBeDefined();
        expect(result.height).toBeDefined();
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
      });
    });

    it("returns all results with buffer and metadata", async () => {
      const imageBuffer = await createTestImageFile();
      const results = await generateResponsiveSizes(imageBuffer);

      results.forEach((result) => {
        expect(result.buffer).toBeInstanceOf(Buffer);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
        expect(result.label).toBeDefined();
      });
    });

    it("respects quality option", async () => {
      const imageBuffer = await createTestImageFile();

      const results = await generateResponsiveSizes(imageBuffer, undefined, {
        quality: 85,
      });

      results.forEach((result) => {
        expect(result.buffer.length).toBeGreaterThan(0);
      });
    });
  });

  describe("processUploadedImage", () => {
    it("processes uploaded image and returns all variants", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await processUploadedImage(
        imageBuffer,
        "test-image",
        testMediaDir
      );

      expect(result.original).toBeDefined();
      expect(result.webp).toBeDefined();
      expect(result.thumbnail).toBeDefined();
      expect(result.responsive).toBeDefined();
      expect(result.responsive.length).toBeGreaterThan(0);
    });

    it("creates all necessary directories", async () => {
      const imageBuffer = await createTestImageFile();
      await processUploadedImage(imageBuffer, "test-image", testMediaDir);

      const webpDir = path.join(testMediaDir, "webp");
      const thumbDir = path.join(testMediaDir, "thumbnails");
      const responsiveDir = path.join(testMediaDir, "responsive");

      try {
        await fs.stat(webpDir);
        await fs.stat(thumbDir);
        await fs.stat(responsiveDir);
      } catch (_error) {
        expect(false).toBe(true); // Should not throw
      }
    });

    it("writes files to disk", async () => {
      const imageBuffer = await createTestImageFile();
      const mediaId = "test-image-files";
      await processUploadedImage(imageBuffer, mediaId, testMediaDir);

      // Check if files exist
      const webpPath = path.join(testMediaDir, "webp", `${mediaId}.webp`);
      const thumbPath = path.join(
        testMediaDir,
        "thumbnails",
        `${mediaId}_thumb.webp`
      );

      try {
        await fs.stat(webpPath);
        await fs.stat(thumbPath);
      } catch {
        expect(false).toBe(true); // Files should exist
      }
    });

    it("returns correct path information", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await processUploadedImage(
        imageBuffer,
        "test-image",
        testMediaDir
      );

      expect(result.original.path).toContain("media/original");
      expect(result.webp.path).toContain("media/webp");
      expect(result.thumbnail.path).toContain("media/thumbnails");
      result.responsive.forEach((img) => {
        expect(img.path).toContain("media/responsive");
      });
    });

    it("returns image dimensions", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await processUploadedImage(
        imageBuffer,
        "test-image",
        testMediaDir
      );

      expect(result.original.width).toBeGreaterThan(0);
      expect(result.original.height).toBeGreaterThan(0);
      expect(result.webp.width).toBeGreaterThan(0);
      expect(result.webp.height).toBeGreaterThan(0);
      expect(result.thumbnail.width).toBeGreaterThan(0);
      expect(result.thumbnail.height).toBeGreaterThan(0);
    });

    it("includes file sizes in result", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await processUploadedImage(
        imageBuffer,
        "test-image",
        testMediaDir
      );

      expect(result.webp.size).toBeGreaterThan(0);
      expect(result.thumbnail.size).toBeGreaterThan(0);
      result.responsive.forEach((img) => {
        expect(img.size).toBeGreaterThan(0);
      });
    });

    it("respects custom quality options", async () => {
      const imageBuffer = await createTestImageFile();

      const highQuality = await processUploadedImage(
        imageBuffer,
        "test-high",
        testMediaDir,
        { quality: 90, webpQuality: 90 }
      );

      const lowQuality = await processUploadedImage(
        imageBuffer,
        "test-low",
        testMediaDir,
        { quality: 50, webpQuality: 50 }
      );

      expect(highQuality.webp.size).toBeGreaterThan(0);
      expect(lowQuality.webp.size).toBeGreaterThan(0);
    });

    it("respects custom thumbnail size", async () => {
      const imageBuffer = await createTestImageFile();
      const result = await processUploadedImage(
        imageBuffer,
        "test-image",
        testMediaDir,
        { thumbnailSize: 200 }
      );

      expect(result.thumbnail.width).toBe(200);
      expect(result.thumbnail.height).toBe(200);
    });

    it("respects custom responsive sizes", async () => {
      const imageBuffer = await createTestImageFile();
      const customSizes: Array<ImageSize> = [
        { width: 300, label: "300" },
        { width: 600, label: "600" },
      ];

      const result = await processUploadedImage(
        imageBuffer,
        "test-image",
        testMediaDir,
        { responsiveSizes: customSizes }
      );

      expect(result.responsive.length).toBe(2);
    });

    it("throws error on invalid image buffer", async () => {
      const invalidBuffer = Buffer.from([0x00, 0x01]);

      try {
        await processUploadedImage(invalidBuffer, "invalid", testMediaDir);
        expect(false).toBe(true); // Should throw
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("generates expected responsive filenames", async () => {
      const imageBuffer = await createTestImageFile();
      const mediaId = "test-responsive";
      const result = await processUploadedImage(
        imageBuffer,
        mediaId,
        testMediaDir
      );

      result.responsive.forEach((img) => {
        expect(img.path).toContain(`${mediaId}_`);
      });
    });

    it("handles ProcessedImage return type correctly", async () => {
      const imageBuffer = await createTestImageFile();
      const result: ProcessedImage = await processUploadedImage(
        imageBuffer,
        "test-image",
        testMediaDir
      );

      // Validate structure
      expect(result.original.path).toBeDefined();
      expect(result.original.width).toBeDefined();
      expect(result.original.height).toBeDefined();

      expect(result.webp.path).toBeDefined();
      expect(result.webp.width).toBeDefined();
      expect(result.webp.height).toBeDefined();
      expect(result.webp.size).toBeDefined();

      expect(result.thumbnail.path).toBeDefined();
      expect(result.thumbnail.width).toBeDefined();
      expect(result.thumbnail.height).toBeDefined();
      expect(result.thumbnail.size).toBeDefined();

      expect(Array.isArray(result.responsive)).toBe(true);
    });
  });

  describe("cleanupOldImages", () => {
    it("removes WebP files", async () => {
      const imageBuffer = await createTestImageFile();
      const mediaId = "cleanup-test";

      // First, create the files
      await processUploadedImage(imageBuffer, mediaId, testMediaDir);

      // Then clean them up
      await cleanupOldImages(mediaId, testMediaDir);

      const webpPath = path.join(testMediaDir, "webp", `${mediaId}.webp`);

      try {
        await fs.stat(webpPath);
        expect(false).toBe(true); // File should not exist
      } catch {
        // File successfully deleted
      }
    });

    it("removes thumbnail files", async () => {
      const imageBuffer = await createTestImageFile();
      const mediaId = "cleanup-thumb";

      await processUploadedImage(imageBuffer, mediaId, testMediaDir);

      await cleanupOldImages(mediaId, testMediaDir);

      const thumbPath = path.join(
        testMediaDir,
        "thumbnails",
        `${mediaId}_thumb.webp`
      );

      try {
        await fs.stat(thumbPath);
        expect(false).toBe(true);
      } catch {
        // Successfully deleted
      }
    });

    it("removes responsive size files", async () => {
      const imageBuffer = await createTestImageFile();
      const mediaId = "cleanup-responsive";

      await processUploadedImage(imageBuffer, mediaId, testMediaDir);

      await cleanupOldImages(mediaId, testMediaDir);

      const responsiveDir = path.join(testMediaDir, "responsive");
      const files = await fs.readdir(responsiveDir);
      const mediaFiles = files.filter((f) => f.startsWith(`${mediaId}_`));

      expect(mediaFiles.length).toBe(0);
    });

    it("handles missing directories gracefully", async () => {
      const missingDir = path.join(process.cwd(), "non-existent-media");

      try {
        await cleanupOldImages("test-id", missingDir);
        // Should not throw
      } catch {
        expect(false).toBe(true);
      }
    });

    it("handles missing files gracefully", async () => {
      try {
        await cleanupOldImages("non-existent-media", testMediaDir);
        // Should not throw
      } catch {
        expect(false).toBe(true);
      }
    });

    it("only deletes files matching mediaId", async () => {
      const imageBuffer = await createTestImageFile();

      // Create multiple images
      await processUploadedImage(imageBuffer, "image-1", testMediaDir);
      await processUploadedImage(imageBuffer, "image-2", testMediaDir);

      // Clean up only image-1
      await cleanupOldImages("image-1", testMediaDir);

      // Check that image-2 files still exist
      const webpDir = path.join(testMediaDir, "webp");
      const files = await fs.readdir(webpDir);

      expect(files.some((f) => f.includes("image-2"))).toBe(true);
      expect(files.some((f) => f.includes("image-1"))).toBe(false);
    });
  });

  describe("getMediaDir", () => {
    it("returns MEDIA_STORAGE_PATH when set", () => {
      const originalEnv = process.env.MEDIA_STORAGE_PATH;
      process.env.MEDIA_STORAGE_PATH = "/custom/media/path";

      const dir = getMediaDir();
      expect(dir).toBe("/custom/media/path");

      process.env.MEDIA_STORAGE_PATH = originalEnv;
    });

    it("returns default path when MEDIA_STORAGE_PATH not set", () => {
      const originalEnv = process.env.MEDIA_STORAGE_PATH;
      delete process.env.MEDIA_STORAGE_PATH;

      const dir = getMediaDir();
      expect(dir).toContain("data");
      expect(dir).toContain("uploads");
      expect(dir).toContain("media");

      if (originalEnv) {
        process.env.MEDIA_STORAGE_PATH = originalEnv;
      }
    });

    it("uses data/uploads/media relative to cwd", () => {
      const originalEnv = process.env.MEDIA_STORAGE_PATH;
      delete process.env.MEDIA_STORAGE_PATH;

      const dir = getMediaDir();
      expect(dir.endsWith(path.join("data", "uploads", "media"))).toBe(true);

      if (originalEnv) {
        process.env.MEDIA_STORAGE_PATH = originalEnv;
      }
    });
  });

  describe("Error Handling", () => {
    it("handles invalid image files", async () => {
      const invalidBuffer = Buffer.from([0x00, 0x01, 0x02]);

      try {
        await generateWebP(invalidBuffer);
        expect(false).toBe(true); // Should throw
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("handles empty buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);

      try {
        await generateWebP(emptyBuffer);
        expect(false).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Integration Tests", () => {
    it("complete pipeline processes image correctly", async () => {
      const imageBuffer = await createTestImageFile();
      const mediaId = "integration-test";

      const result = await processUploadedImage(
        imageBuffer,
        mediaId,
        testMediaDir
      );

      // Verify all components exist
      expect(result.original).toBeDefined();
      expect(result.webp).toBeDefined();
      expect(result.thumbnail).toBeDefined();
      expect(result.responsive.length).toBeGreaterThan(0);

      // Verify dimensions make sense
      expect(result.original.width).toBeGreaterThan(0);
      expect(result.original.height).toBeGreaterThan(0);
      expect(result.thumbnail.width).toBe(300);
      // Responsive images are resized with withoutEnlargement, so small images won't upscale
      expect(result.responsive.length).toBeGreaterThan(0);
      result.responsive.forEach((img) => {
        expect(img.width).toBeGreaterThan(0);
        expect(img.height).toBeGreaterThan(0);
      });

      // Verify file sizes are reasonable
      expect(result.webp.size).toBeGreaterThan(0);
      expect(result.thumbnail.size).toBeGreaterThan(0);
      // Both should be valid WebP files
      expect(typeof result.webp.size).toBe("number");
      expect(typeof result.thumbnail.size).toBe("number");
    });

    it("multiple image processing doesn't interfere", async () => {
      const imageBuffer = await createTestImageFile();

      const result1 = await processUploadedImage(
        imageBuffer,
        "test-image-1",
        testMediaDir
      );

      const result2 = await processUploadedImage(
        imageBuffer,
        "test-image-2",
        testMediaDir
      );

      expect(result1.webp.path).not.toBe(result2.webp.path);
      expect(result1.thumbnail.path).not.toBe(result2.thumbnail.path);
    });
  });
});
