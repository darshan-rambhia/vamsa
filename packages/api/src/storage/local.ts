import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { FileInfo, StorageMetadata, StorageProvider } from "./index";

const STORAGE_DIR = process.env.STORAGE_DIR || "./storage/media";
const THUMBNAILS_DIR = path.join(STORAGE_DIR, "thumbnails");

export class LocalStorage implements StorageProvider {
  async save(filename: string, data: Buffer): Promise<FileInfo> {
    // Ensure storage directories exist
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    await fs.mkdir(THUMBNAILS_DIR, { recursive: true });

    // Generate unique filename with random prefix
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    const randomPrefix = randomBytes(4).toString("hex");
    const uniqueFilename = `${randomPrefix}-${name}${ext}`;
    const filePath = path.join(STORAGE_DIR, uniqueFilename);

    // Save file
    await fs.writeFile(filePath, data);

    // Get file metadata
    const metadata = await this.extractMetadata(data, filename);

    // Generate thumbnail if image
    let thumbnailPath: string | null = null;
    if (this.isImage(filename)) {
      thumbnailPath = await this.generateThumbnail(filePath, uniqueFilename);
    }

    return {
      path: `/media/${uniqueFilename}`,
      thumbnailPath: thumbnailPath
        ? `/media/thumbnails/${path.basename(thumbnailPath)}`
        : undefined,
      metadata,
    };
  }

  async delete(filePath: string): Promise<void> {
    try {
      // Extract filename from path
      const filename = path.basename(filePath);
      const fullPath = path.join(STORAGE_DIR, filename);

      // Delete main file
      await fs.unlink(fullPath);

      // Delete thumbnail if exists
      const thumbnailPath = path.join(THUMBNAILS_DIR, `thumb-${filename}`);
      try {
        await fs.unlink(thumbnailPath);
      } catch {
        // Thumbnail may not exist, that's fine
      }
    } catch (error) {
      throw new Error(`Failed to delete media file: ${error}`);
    }
  }

  async getThumbnail(filePath: string): Promise<string | null> {
    try {
      const filename = path.basename(filePath);
      const thumbnailPath = path.join(THUMBNAILS_DIR, `thumb-${filename}`);
      await fs.access(thumbnailPath);
      return `/media/thumbnails/thumb-${filename}`;
    } catch {
      return null;
    }
  }

  private isImage(filename: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
    const ext = path.extname(filename).toLowerCase();
    return imageExtensions.includes(ext);
  }

  private async extractMetadata(
    data: Buffer,
    filename: string
  ): Promise<StorageMetadata> {
    // Get MIME type from filename
    const mimeType = this.getMimeType(filename);
    const fileSize = data.length;

    // Try to extract image dimensions if it's an image
    let width: number | undefined;
    let height: number | undefined;

    if (this.isImage(filename)) {
      try {
        const dimensions = this.getImageDimensions(data, filename);
        if (dimensions) {
          width = dimensions.width;
          height = dimensions.height;
        }
      } catch {
        // If we can't extract dimensions, that's okay
      }
    }

    return {
      mimeType,
      fileSize,
      width,
      height,
    };
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
      ".tiff": "image/tiff",
      ".bmp": "image/bmp",
      ".svg": "image/svg+xml",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  private getImageDimensions(
    data: Buffer,
    filename: string
  ): { width: number; height: number } | null {
    const ext = path.extname(filename).toLowerCase();

    if (ext === ".png") {
      return this.parsePngDimensions(data);
    } else if (ext === ".jpg" || ext === ".jpeg") {
      return this.parseJpegDimensions(data);
    } else if (ext === ".gif") {
      return this.parseGifDimensions(data);
    }

    return null;
  }

  private parsePngDimensions(
    data: Buffer
  ): { width: number; height: number } | null {
    // PNG signature is 8 bytes, then IHDR chunk
    if (
      data.length < 24 ||
      !data.toString("hex", 0, 8).startsWith("89504e47")
    ) {
      return null;
    }
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    return { width, height };
  }

  private parseJpegDimensions(
    data: Buffer
  ): { width: number; height: number } | null {
    // JPEG parser - look for SOF marker
    let offset = 2; // Skip SOI marker
    while (offset < data.length - 8) {
      if (data[offset] !== 0xff) {
        offset++;
        continue;
      }

      const marker = data[offset + 1];

      // SOF markers: 0xC0 to 0xC3, 0xC5 to 0xC7, 0xC9 to 0xCB, 0xCD to 0xCF
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        const height = data.readUInt16BE(offset + 5);
        const width = data.readUInt16BE(offset + 7);
        return { width, height };
      }

      const length = data.readUInt16BE(offset + 2);
      offset += 2 + length;
    }

    return null;
  }

  private parseGifDimensions(
    data: Buffer
  ): { width: number; height: number } | null {
    // GIF signature check
    if (data.length < 10 || !data.toString("ascii", 0, 3).startsWith("GIF")) {
      return null;
    }
    const width = data.readUInt16LE(6);
    const height = data.readUInt16LE(8);
    return { width, height };
  }

  private async generateThumbnail(
    filePath: string,
    filename: string
  ): Promise<string | null> {
    try {
      // For now, just create a reference to a thumbnail
      // In a real implementation, you'd use sharp or imagemagick
      // to actually generate a thumbnail image
      const thumbnailFilename = `thumb-${filename}`;
      const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFilename);

      // Copy the original as thumbnail for now
      // A real implementation would resize/compress the image
      const data = await fs.readFile(filePath);
      await fs.writeFile(thumbnailPath, data);

      return thumbnailPath;
    } catch (_error) {
      // If thumbnail generation fails, just continue without it
      return null;
    }
  }
}
