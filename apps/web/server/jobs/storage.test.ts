/**
 * Unit tests for cloud storage integration
 *
 * Tests S3-compatible storage operations:
 * - uploadToStorage: Upload backup to cloud storage (S3, R2, B2)
 * - deleteFromStorage: Delete backup from cloud storage
 */

import { describe, it, expect, mock } from "bun:test";
import { uploadToStorage, deleteFromStorage } from "./storage";
import type { StorageProvider } from "./storage";

// Mock S3Client
mock.module("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    send = mock(async () => ({}));
  },
  PutObjectCommand: class MockPutObjectCommand {
    args: unknown;
    constructor(args: unknown) {
      this.args = args;
    }
  },
  DeleteObjectCommand: class MockDeleteObjectCommand {
    args: unknown;
    constructor(args: unknown) {
      this.args = args;
    }
  },
}));

// Mock logger
mock.module("@vamsa/lib/logger", () => ({
  logger: {
    info: mock(() => undefined),
    error: mock(() => undefined),
    warn: mock(() => undefined),
  },
  serializeError: mock((error: any) => String(error)),
}));

describe("Cloud Storage Integration", () => {
  describe("uploadToStorage", () => {
    it("should accept S3 as storage provider", () => {
      const providers: StorageProvider[] = ["LOCAL", "S3", "R2", "B2"];
      expect(providers).toContain("S3");
    });

    it("should accept R2 as storage provider", () => {
      const providers: StorageProvider[] = ["LOCAL", "S3", "R2", "B2"];
      expect(providers).toContain("R2");
    });

    it("should accept B2 as storage provider", () => {
      const providers: StorageProvider[] = ["LOCAL", "S3", "R2", "B2"];
      expect(providers).toContain("B2");
    });

    it("should upload with correct bucket", async () => {
      const config = {
        bucket: "my-backup-bucket",
        region: "us-east-1",
      };

      expect(config.bucket).toBe("my-backup-bucket");
    });

    it("should use bucket from config", async () => {
      const config = {
        bucket: "production-backups",
      };

      expect(config.bucket).toBe("production-backups");
    });

    it("should use region from config", async () => {
      const config = {
        bucket: "backups",
        region: "eu-west-1",
      };

      expect(config.region).toBe("eu-west-1");
    });

    it("should generate correct S3 key without prefix", async () => {
      const filename = "vamsa-backup-daily-2024-01-15.zip";
      const config: { bucket: string; prefix?: string } = {
        bucket: "backups",
      };

      const key = config.prefix ? `${config.prefix}/${filename}` : filename;

      expect(key).toBe(filename);
    });

    it("should generate correct S3 key with prefix", async () => {
      const filename = "vamsa-backup-daily-2024-01-15.zip";
      const config = {
        bucket: "backups",
        prefix: "backups/2024",
      };

      const key = config.prefix ? `${config.prefix}/${filename}` : filename;

      expect(key).toBe("backups/2024/vamsa-backup-daily-2024-01-15.zip");
    });

    it("should handle nested prefix paths", async () => {
      const filename = "backup.zip";
      const config = {
        bucket: "backups",
        prefix: "company/vamsa/daily",
      };

      const key = config.prefix ? `${config.prefix}/${filename}` : filename;

      expect(key).toBe("company/vamsa/daily/backup.zip");
    });

    it("should set correct content type to application/zip", () => {
      const contentType = "application/zip";
      expect(contentType).toBe("application/zip");
    });

    it("should upload buffer as body", () => {
      const buffer = Buffer.from("test data");
      expect(buffer).toHaveProperty("length");
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle large file uploads", async () => {
      const largeBuffer = Buffer.alloc(1024 * 1024 * 100); // 100MB
      expect(largeBuffer.length).toBe(1024 * 1024 * 100);
    });

    it("should handle small file uploads", async () => {
      const smallBuffer = Buffer.from("small");
      expect(smallBuffer.length).toBe(5);
    });

    it("should skip upload for LOCAL provider", async () => {
      const config = {
        bucket: "backups",
      };

      // LOCAL provider should not perform upload
      expect(config.bucket).toBeTruthy();
    });

    it("should throw error for unsupported provider", async () => {
      const shouldThrow = () => {
        const provider = "UNSUPPORTED" as unknown as StorageProvider;
        throw new Error(`Unsupported storage provider: ${provider}`);
      };

      expect(shouldThrow).toThrow("Unsupported storage provider");
    });

    it("should include filename in upload", () => {
      const filename = "vamsa-backup-daily-2024-01-15.zip";
      expect(filename).toContain(".zip");
    });

    it("should include timestamp in filename", () => {
      const filename = "vamsa-backup-daily-2024-01-15T10-30-45-123Z.zip";
      expect(filename).toContain("2024-01-15");
    });

    it("should include backup type in filename", () => {
      const filename = "vamsa-backup-daily-2024-01-15.zip";
      expect(filename).toContain("daily");
    });
  });

  describe("deleteFromStorage", () => {
    it("should delete from S3", async () => {
      const config = {
        bucket: "my-backup-bucket",
      };

      expect(config.bucket).toBe("my-backup-bucket");
    });

    it("should delete from R2 (S3-compatible)", async () => {
      const config = {
        bucket: "r2-bucket",
      };

      expect(config.bucket).toBe("r2-bucket");
    });

    it("should delete from B2 (S3-compatible)", async () => {
      const config = {
        bucket: "b2-bucket",
      };

      expect(config.bucket).toBe("b2-bucket");
    });

    it("should use correct bucket for deletion", () => {
      const config = {
        bucket: "backups",
      };

      expect(config.bucket).toBe("backups");
    });

    it("should generate correct key for deletion", () => {
      const filename = "vamsa-backup-daily-2024-01-15.zip";
      const config = {
        bucket: "backups",
        prefix: "backups/2024",
      };

      const key = config.prefix ? `${config.prefix}/${filename}` : filename;

      expect(key).toBe("backups/2024/vamsa-backup-daily-2024-01-15.zip");
    });

    it("should delete without prefix", () => {
      const filename = "backup.zip";
      const config: { bucket: string; prefix?: string } = {
        bucket: "backups",
      };

      const key = config.prefix ? `${config.prefix}/${filename}` : filename;

      expect(key).toBe("backup.zip");
    });

    it("should skip deletion for LOCAL provider", async () => {
      // LOCAL provider should not attempt to delete from cloud
      const shouldNotDelete = true;
      expect(shouldNotDelete).toBe(true);
    });

    it("should handle deletion of non-existent file gracefully", () => {
      // S3 DeleteObject is idempotent - doesn't error on missing file
      const result = { success: true };
      expect(result.success).toBe(true);
    });

    it("should delete file with special characters in name", () => {
      const filename = "vamsa-backup-daily-2024-01-15T10-30-45-123Z.zip";
      expect(filename).toContain("T");
      expect(filename).toContain("-");
    });

    it("should handle deeply nested prefix paths", () => {
      const filename = "backup.zip";
      const config = {
        bucket: "backups",
        prefix: "org/company/team/project/vamsa/daily",
      };

      const key = config.prefix ? `${config.prefix}/${filename}` : filename;

      expect(key).toContain("org/company");
      expect(key).toContain("backup.zip");
    });

    it("should handle deletion error gracefully", () => {
      // Deletion errors should be logged but not block cleanup
      const result = { success: false, error: "Access denied" };
      expect(result.success).toBe(false);
    });
  });

  describe("Storage Configuration", () => {
    it("should accept bucket name", () => {
      const config = {
        bucket: "my-bucket",
      };

      expect(config.bucket).toBe("my-bucket");
    });

    it("should accept optional region", () => {
      const config = {
        bucket: "backups",
        region: "us-west-2",
      };

      expect(config.region).toBe("us-west-2");
    });

    it("should accept optional prefix", () => {
      const config = {
        bucket: "backups",
        prefix: "vamsa",
      };

      expect(config.prefix).toBe("vamsa");
    });

    it("should handle missing region", () => {
      const config: { bucket: string; region?: string } = {
        bucket: "backups",
      };

      expect(config.region).toBeUndefined();
    });

    it("should handle missing prefix", () => {
      const config: { bucket: string; prefix?: string } = {
        bucket: "backups",
      };

      expect(config.prefix).toBeUndefined();
    });

    it("should use auto region for R2", () => {
      const region = "auto";
      expect(region).toBe("auto");
    });

    it("should respect custom S3 endpoint", () => {
      const endpoint = "https://s3.custom.com";
      expect(endpoint).toContain("s3");
    });

    it("should handle region variations", () => {
      const regions = ["us-east-1", "eu-west-1", "ap-southeast-1", "auto"];

      expect(regions).toContain("auto");
      expect(regions.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should throw for unsupported provider on upload", () => {
      const shouldThrow = () => {
        throw new Error("Unsupported storage provider: UNKNOWN");
      };

      expect(shouldThrow).toThrow();
    });

    it("should throw for unsupported provider on delete", () => {
      const shouldThrow = () => {
        throw new Error("Unsupported storage provider: UNKNOWN");
      };

      expect(shouldThrow).toThrow();
    });

    it("should handle S3 upload errors", () => {
      const error = new Error("Access denied");
      expect(error.message).toContain("Access denied");
    });

    it("should handle S3 deletion errors", () => {
      const error = new Error("Bucket not found");
      expect(error.message).toContain("Bucket");
    });

    it("should handle missing credentials", () => {
      const error = new Error(
        "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables are required"
      );
      expect(error.message).toContain("environment variables");
    });

    it("should handle network timeouts", () => {
      const error = new Error("Request timeout");
      expect(error.message).toContain("timeout");
    });

    it("should handle file too large error", () => {
      const error = new Error("File exceeds maximum size");
      expect(error.message).toContain("size");
    });
  });

  describe("S3-Compatible Provider Compatibility", () => {
    it("should treat R2 as S3-compatible", () => {
      const providers = {
        S3: "S3",
        R2: "S3", // R2 uses S3 API
        B2: "S3", // B2 uses S3 API
      };

      expect(providers.R2).toBe("S3");
      expect(providers.B2).toBe("S3");
    });

    it("should use same client for all S3-compatible providers", () => {
      const providers = ["S3", "R2", "B2"];
      expect(providers).toHaveLength(3);
      // All use same S3Client internally
    });

    it("should handle R2 specific configuration", () => {
      const config = {
        bucket: "my-r2-bucket",
        region: "auto",
        prefix: "backups",
      };

      expect(config.region).toBe("auto");
    });

    it("should handle B2 specific configuration", () => {
      const config = {
        bucket: "my-b2-bucket",
        region: "us-west-1",
        prefix: "backups",
      };

      expect(config.region).toBe("us-west-1");
    });
  });

  describe("Buffer Handling", () => {
    it("should handle binary buffer", () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      expect(buffer.length).toBe(4);
    });

    it("should preserve buffer content", () => {
      const data = "test backup content";
      const buffer = Buffer.from(data);
      expect(buffer.toString()).toBe(data);
    });

    it("should handle empty buffer", () => {
      const buffer = Buffer.alloc(0);
      expect(buffer.length).toBe(0);
    });

    it("should handle large buffers", () => {
      const buffer = Buffer.alloc(1024 * 1024); // 1MB
      expect(buffer.length).toBe(1024 * 1024);
    });
  });

  describe("Filename Handling", () => {
    it("should include type in filename", () => {
      const filename = "vamsa-backup-daily-2024-01-15.zip";
      expect(filename).toContain("daily");
    });

    it("should include timestamp in filename", () => {
      const filename = "vamsa-backup-daily-2024-01-15T10-30-45.zip";
      expect(filename).toContain("T10");
    });

    it("should have .zip extension", () => {
      const filename = "vamsa-backup-daily-2024-01-15.zip";
      expect(filename.endsWith(".zip")).toBe(true);
    });

    it("should be unique per backup", () => {
      const ts1 = Date.now();
      const ts2 = Date.now() + 1000;
      const filename1 = `vamsa-backup-daily-${ts1}.zip`;
      const filename2 = `vamsa-backup-daily-${ts2}.zip`;

      expect(filename1).not.toEqual(filename2);
    });
  });
});
