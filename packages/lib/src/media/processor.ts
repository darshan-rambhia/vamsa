import { promises as fs } from "node:fs";
import path from "node:path";

export interface ImageSize {
  width: number;
  label: string;
}

export interface ProcessedImage {
  original: {
    path: string;
    width: number;
    height: number;
  };
  webp: {
    path: string;
    width: number;
    height: number;
    size: number;
  };
  thumbnail: {
    path: string;
    width: number;
    height: number;
    size: number;
  };
  responsive: Array<{
    path: string;
    width: number;
    height: number;
    size: number;
  }>;
}

/**
 * Lazy-load sharp with graceful fallback.
 *
 * sharp is a native C++ addon that cannot be bundled into a single binary
 * via `bun build --compile`. When running as a compiled binary without
 * sharp installed, image processing is skipped and originals are served
 * as-is. For typical Vamsa deployments (200-2000 persons), this is an
 * acceptable tradeoff for zero-dependency binary distribution.
 *
 * Returns null when sharp is unavailable.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sharpModule: any | null | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSharp(): Promise<any | null> {
  if (sharpModule !== undefined) return sharpModule;
  try {
    const mod = await import("sharp");
    sharpModule = mod.default ?? mod;
    return sharpModule;
  } catch {
    sharpModule = null;
    return null;
  }
}

/**
 * Check if image processing is available (sharp is installed).
 */
export async function isImageProcessingAvailable(): Promise<boolean> {
  return (await getSharp()) !== null;
}

/**
 * Generate WebP version of an image
 */
export async function generateWebP(
  buffer: Buffer,
  options: { quality?: number } = {}
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const sharp = await getSharp();
  if (!sharp) {
    throw new Error(
      "Image processing unavailable: sharp is not installed. " +
        "Install sharp or use Docker deployment for image optimization."
    );
  }

  const { quality = 85 } = options;
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const webpBuffer = await image
    .resize(1200, 1200, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();

  return {
    buffer: webpBuffer,
    width: Math.min(metadata.width || 1200, 1200),
    height: Math.min(metadata.height || 1200, 1200),
  };
}

/**
 * Generate a thumbnail image
 */
export async function generateThumbnail(
  buffer: Buffer,
  size: number = 300,
  options: { quality?: number } = {}
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const sharp = await getSharp();
  if (!sharp) {
    throw new Error("Image processing unavailable: sharp is not installed.");
  }

  const { quality = 80 } = options;
  const thumbBuffer = await sharp(buffer)
    .resize(size, size, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality })
    .toBuffer();

  return {
    buffer: thumbBuffer,
    width: size,
    height: size,
  };
}

/**
 * Generate responsive image sizes
 */
export async function generateResponsiveSizes(
  buffer: Buffer,
  sizes: Array<ImageSize> = [
    { width: 400, label: "400" },
    { width: 800, label: "800" },
    { width: 1200, label: "1200" },
  ],
  options: { quality?: number } = {}
): Promise<
  Array<{
    buffer: Buffer;
    width: number;
    height: number;
    label: string;
  }>
> {
  const sharp = await getSharp();
  if (!sharp) {
    throw new Error("Image processing unavailable: sharp is not installed.");
  }

  const { quality = 85 } = options;
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const results = await Promise.all(
    sizes.map(async (size) => {
      const responsive = await sharp(buffer)
        .resize(size.width, size.width, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      return {
        buffer: responsive,
        width: Math.min(metadata.width || size.width, size.width),
        height: Math.min(metadata.height || size.width, size.width),
        label: size.label,
      };
    })
  );

  return results;
}

/**
 * Process an uploaded image file
 * Generates WebP, thumbnail, and responsive versions
 *
 * When sharp is unavailable (compiled binary mode), saves the original
 * image without optimization and returns paths pointing to the original.
 */
export async function processUploadedImage(
  buffer: Buffer,
  mediaId: string,
  mediaDir: string,
  options: {
    quality?: number;
    webpQuality?: number;
    thumbnailSize?: number;
    responsiveSizes?: Array<ImageSize>;
  } = {}
): Promise<ProcessedImage> {
  const sharp = await getSharp();

  // Fallback: no image processing available (compiled binary mode)
  if (!sharp) {
    // Save original as-is — no WebP conversion, no thumbnails
    const originalDir = path.join(mediaDir, "original");
    await fs.mkdir(originalDir, { recursive: true });
    const originalPath = path.join(originalDir, mediaId);
    await fs.writeFile(originalPath, buffer);

    return {
      original: {
        path: `media/original/${mediaId}`,
        width: 0,
        height: 0,
      },
      webp: {
        path: `media/original/${mediaId}`,
        width: 0,
        height: 0,
        size: buffer.length,
      },
      thumbnail: {
        path: `media/original/${mediaId}`,
        width: 0,
        height: 0,
        size: buffer.length,
      },
      responsive: [],
    };
  }

  const {
    quality = 85,
    webpQuality = 85,
    thumbnailSize = 300,
    responsiveSizes = [
      { width: 400, label: "400" },
      { width: 800, label: "800" },
      { width: 1200, label: "1200" },
    ],
  } = options;

  // Get original image metadata
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to determine image dimensions");
  }

  const originalWidth = metadata.width;
  const originalHeight = metadata.height;

  // Create directories if they don't exist
  const dirs = [
    path.join(mediaDir, "webp"),
    path.join(mediaDir, "thumbnails"),
    path.join(mediaDir, "responsive"),
  ];

  await Promise.all(dirs.map((dir) => fs.mkdir(dir, { recursive: true })));

  // Generate WebP version
  const webpData = await generateWebP(buffer, { quality: webpQuality });
  const webpPath = path.join(mediaDir, "webp", `${mediaId}.webp`);
  await fs.writeFile(webpPath, webpData.buffer);

  // Generate thumbnail
  const thumbData = await generateThumbnail(buffer, thumbnailSize, { quality });
  const thumbPath = path.join(mediaDir, "thumbnails", `${mediaId}_thumb.webp`);
  await fs.writeFile(thumbPath, thumbData.buffer);

  // Generate responsive sizes
  const responsiveImages = await generateResponsiveSizes(
    buffer,
    responsiveSizes,
    {
      quality,
    }
  );
  const responsivePaths = await Promise.all(
    responsiveImages.map(async (img) => {
      const responsivePath = path.join(
        mediaDir,
        "responsive",
        `${mediaId}_${img.label}.webp`
      );
      await fs.writeFile(responsivePath, img.buffer);
      return {
        path: responsivePath,
        width: img.width,
        height: img.height,
        size: img.buffer.length,
      };
    })
  );

  return {
    original: {
      path: `media/original/${mediaId}`,
      width: originalWidth,
      height: originalHeight,
    },
    webp: {
      path: `media/webp/${mediaId}.webp`,
      width: webpData.width,
      height: webpData.height,
      size: webpData.buffer.length,
    },
    thumbnail: {
      path: `media/thumbnails/${mediaId}_thumb.webp`,
      width: thumbData.width,
      height: thumbData.height,
      size: thumbData.buffer.length,
    },
    responsive: responsivePaths.map((p) => ({
      path: `media/responsive/${path.basename(p.path)}`,
      width: p.width,
      height: p.height,
      size: p.size,
    })),
  };
}

/**
 * Clean up old processed images when a media object is deleted or updated
 */
export async function cleanupOldImages(
  mediaId: string,
  mediaDir: string
): Promise<void> {
  // Simple cleanup for non-glob patterns
  const filesToDelete = [
    path.join(mediaDir, "webp", `${mediaId}.webp`),
    path.join(mediaDir, "thumbnails", `${mediaId}_thumb.webp`),
  ];

  // Also try to find responsive sizes
  const responsiveDir = path.join(mediaDir, "responsive");
  try {
    const files = await fs.readdir(responsiveDir);
    const mediaFiles = files.filter((f) => f.startsWith(`${mediaId}_`));
    filesToDelete.push(...mediaFiles.map((f) => path.join(responsiveDir, f)));
  } catch {
    // Directory might not exist
  }

  await Promise.all(
    filesToDelete.map(async (file) => {
      try {
        await fs.unlink(file);
      } catch {
        // File might not exist, that's okay
      }
    })
  );
}

/**
 * Get storage directory for media
 */
export function getMediaDir(): string {
  if (process.env.MEDIA_STORAGE_PATH) {
    return process.env.MEDIA_STORAGE_PATH;
  }
  // Use data/uploads/media directory
  return path.join(process.cwd(), "data", "uploads", "media");
}
