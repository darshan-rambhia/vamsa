/**
 * Cloud storage integration for backups
 *
 * Supports S3-compatible providers using Bun's native S3 client:
 * - Amazon S3
 * - Cloudflare R2
 * - Backblaze B2
 */

import { loggers } from "@vamsa/lib/logger";

const log = loggers.jobs;

export type StorageProvider = "LOCAL" | "S3" | "R2" | "B2";

export interface StorageConfig {
  bucket: string;
  region?: string;
  prefix?: string;
}

// Lazy-initialized S3 client
let s3Client: ReturnType<typeof createS3Client> | null = null;

/**
 * Create a Bun S3 client with environment configuration
 */
function createS3Client() {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "auto";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables are required"
    );
  }

  return new Bun.S3Client({
    accessKeyId,
    secretAccessKey,
    region,
    endpoint,
  });
}

/**
 * Get or initialize the S3 client
 */
function getS3Client() {
  if (!s3Client) {
    s3Client = createS3Client();
  }
  return s3Client;
}

/**
 * Upload a file to cloud storage
 */
export async function uploadToStorage(
  provider: StorageProvider,
  filename: string,
  buffer: Buffer,
  config: StorageConfig
): Promise<void> {
  const key = config.prefix ? `${config.prefix}/${filename}` : filename;

  switch (provider) {
    case "S3":
    case "R2": // R2 is S3-compatible
    case "B2": // B2 is also S3-compatible
      try {
        const client = getS3Client();
        await client.write(`${config.bucket}/${key}`, buffer, {
          type: "application/zip",
        });
        log.info(
          { provider, bucket: config.bucket, key, size: buffer.length },
          "Uploaded backup to cloud storage"
        );
      } catch (error) {
        log
          .withErr(error)
          .ctx({ provider, key })
          .msg("Failed to upload backup to cloud storage");
        throw error;
      }
      break;

    case "LOCAL":
      // Local storage handled elsewhere
      break;

    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
}

/**
 * Delete a file from cloud storage
 */
export async function deleteFromStorage(
  provider: StorageProvider,
  filename: string,
  config: StorageConfig
): Promise<void> {
  const key = config.prefix ? `${config.prefix}/${filename}` : filename;

  switch (provider) {
    case "S3":
    case "R2":
    case "B2":
      try {
        const client = getS3Client();
        await client.unlink(`${config.bucket}/${key}`);
        log.info(
          { provider, bucket: config.bucket, key },
          "Deleted backup from cloud storage"
        );
      } catch (error) {
        log
          .withErr(error)
          .ctx({ provider, key })
          .msg("Failed to delete backup from cloud storage");
        throw error;
      }
      break;

    case "LOCAL":
      // Local deletion handled elsewhere
      break;
  }
}
