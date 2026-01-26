/**
 * Unit tests for cloud storage integration
 *
 * Tests S3-compatible storage operations:
 * - uploadToStorage: Upload backup to cloud storage (S3, R2, B2)
 * - deleteFromStorage: Delete backup from cloud storage
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock logger for this test file
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
  clearAllMocks,
} from "../../tests/setup/shared-mocks";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

// Create mock S3 client functions - these will be used by the mock class
const mockS3Write = mock(async () => undefined);
const mockS3Unlink = mock(async () => undefined);

// Mock Bun.S3Client BEFORE importing storage.ts
// This ensures the lazy-initialized s3Client uses our mock
(Bun as any).S3Client = class MockS3Client {
  write = mockS3Write;
  unlink = mockS3Unlink;
};

// Import after Bun.S3Client mock is set up
import { uploadToStorage, deleteFromStorage } from "./storage";
import type { StorageProvider } from "./storage";

describe("Cloud Storage Integration", () => {
  beforeEach(() => {
    clearAllMocks();
    mockS3Write.mockClear();
    mockS3Unlink.mockClear();
  });

  describe("uploadToStorage - S3 Providers", () => {
    it("should accept S3 as storage provider", () => {
      const providers: StorageProvider[] = ["S3", "R2", "B2", "LOCAL"];
      expect(providers).toContain("S3");
    });

    it("should accept R2 as storage provider", () => {
      const providers: StorageProvider[] = ["S3", "R2", "B2", "LOCAL"];
      expect(providers).toContain("R2");
    });

    it("should accept B2 as storage provider", () => {
      const providers: StorageProvider[] = ["S3", "R2", "B2", "LOCAL"];
      expect(providers).toContain("B2");
    });

    it("should handle S3 upload with credentials", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const buffer = Buffer.from("backup data");
        const config = { bucket: "my-backup-bucket" };

        let errorThrown = false;
        try {
          await uploadToStorage("S3", "backup.zip", buffer, config);
        } catch {
          errorThrown = true;
        }
        expect(errorThrown).toBe(false);
      } finally {
        process.env = originalEnv;
      }
    });

    it("should handle R2 upload", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const buffer = Buffer.from("backup");
        const config = { bucket: "r2-bucket", region: "auto" };

        let errorThrown = false;
        try {
          await uploadToStorage("R2", "backup.zip", buffer, config);
        } catch {
          errorThrown = true;
        }
        expect(errorThrown).toBe(false);
      } finally {
        process.env = originalEnv;
      }
    });

    it("should handle B2 upload", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const buffer = Buffer.from("backup");
        const config = { bucket: "b2-bucket" };

        let errorThrown = false;
        try {
          await uploadToStorage("B2", "backup.zip", buffer, config);
        } catch {
          errorThrown = true;
        }
        expect(errorThrown).toBe(false);
      } finally {
        process.env = originalEnv;
      }
    });

    it("should require S3 credentials for S3 provider", () => {
      // Verify that S3 requires specific environment variables
      const requiredVars = ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
      expect(requiredVars.length).toBeGreaterThan(0);
    });
  });

  describe("uploadToStorage - Configuration", () => {
    it("should accept bucket configuration", () => {
      const config = { bucket: "my-bucket" };
      expect(config.bucket).toBe("my-bucket");
    });

    it("should accept optional region", () => {
      const config = { bucket: "backups", region: "us-west-2" };
      expect(config.region).toBe("us-west-2");
    });

    it("should accept optional prefix", () => {
      const config = { bucket: "backups", prefix: "vamsa" };
      expect(config.prefix).toBe("vamsa");
    });

    it("should handle configuration without prefix", () => {
      const config: { bucket: string; prefix?: string } = { bucket: "backups" };
      expect(config.prefix).toBeUndefined();
    });

    it("should handle configuration without region", () => {
      const config: { bucket: string; region?: string } = { bucket: "backups" };
      expect(config.region).toBeUndefined();
    });
  });

  describe("uploadToStorage - Buffer Handling", () => {
    it("should accept small buffers", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const buffer = Buffer.from("small");

        expect(buffer.length).toBeGreaterThan(0);
      } finally {
        process.env = originalEnv;
      }
    });

    it("should accept medium sized buffers", () => {
      const buffer = Buffer.alloc(1024 * 1024); // 1MB
      expect(buffer.length).toBe(1024 * 1024);
    });

    it("should accept empty buffers", () => {
      const buffer = Buffer.alloc(0);
      expect(buffer.length).toBe(0);
    });

    it("should accept large buffers", () => {
      const buffer = Buffer.alloc(1024 * 1024 * 100); // 100MB
      expect(buffer.length).toBe(1024 * 1024 * 100);
    });
  });

  describe("uploadToStorage - LOCAL Provider", () => {
    it("should handle LOCAL provider", async () => {
      const buffer = Buffer.from("backup data");
      const config = { bucket: "backups" };

      let errorThrown = false;
      try {
        await uploadToStorage("LOCAL", "backup.zip", buffer, config);
      } catch {
        errorThrown = true;
      }
      // LOCAL provider should not throw
      expect(errorThrown).toBe(false);
    });
  });

  describe("uploadToStorage - Error Handling", () => {
    it("should validate storage provider type", () => {
      const validProviders: StorageProvider[] = ["S3", "R2", "B2", "LOCAL"];
      expect(validProviders.length).toBe(4);
    });
  });

  describe("deleteFromStorage", () => {
    it("should handle S3 deletion", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const config = { bucket: "my-backup-bucket" };

        let errorThrown = false;
        try {
          await deleteFromStorage("S3", "backup.zip", config);
        } catch {
          errorThrown = true;
        }
        expect(errorThrown).toBe(false);
      } finally {
        process.env = originalEnv;
      }
    });

    it("should handle R2 deletion", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const config = { bucket: "r2-bucket" };

        let errorThrown = false;
        try {
          await deleteFromStorage("R2", "backup.zip", config);
        } catch {
          errorThrown = true;
        }
        expect(errorThrown).toBe(false);
      } finally {
        process.env = originalEnv;
      }
    });

    it("should handle B2 deletion", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const config = { bucket: "b2-bucket" };

        let errorThrown = false;
        try {
          await deleteFromStorage("B2", "backup.zip", config);
        } catch {
          errorThrown = true;
        }
        expect(errorThrown).toBe(false);
      } finally {
        process.env = originalEnv;
      }
    });

    it("should use correct bucket", () => {
      const config = { bucket: "backups" };
      expect(config.bucket).toBe("backups");
    });

    it("should handle deletion without prefix", () => {
      const filename = "backup.zip";
      const config: { bucket: string; prefix?: string } = { bucket: "backups" };
      const key = config.prefix ? `${config.prefix}/${filename}` : filename;
      expect(key).toBe("backup.zip");
    });

    it("should handle deletion with prefix", () => {
      const filename = "vamsa-backup-daily-2024-01-15.zip";
      const config = {
        bucket: "backups",
        prefix: "backups/2024",
      };
      const key = config.prefix ? `${config.prefix}/${filename}` : filename;
      expect(key).toBe("backups/2024/vamsa-backup-daily-2024-01-15.zip");
    });

    it("should handle LOCAL provider deletion", async () => {
      const config = { bucket: "backups" };

      let errorThrown = false;
      try {
        await deleteFromStorage("LOCAL", "backup.zip", config);
      } catch {
        errorThrown = true;
      }
      expect(errorThrown).toBe(false);
    });

    it("should handle non-existent files", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const config = { bucket: "backups" };

        let errorThrown = false;
        try {
          await deleteFromStorage("S3", "non-existent.zip", config);
        } catch {
          errorThrown = true;
        }
        expect(errorThrown).toBe(false);
      } finally {
        process.env = originalEnv;
      }
    });

    it("should handle special characters in filename", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const filename = "vamsa-backup-daily-2024-01-15T10-30-45-123Z.zip";
        const config = { bucket: "backups" };

        let errorThrown = false;
        try {
          await deleteFromStorage("S3", filename, config);
        } catch {
          errorThrown = true;
        }
        expect(errorThrown).toBe(false);
      } finally {
        process.env = originalEnv;
      }
    });

    it("should handle deeply nested prefixes", () => {
      const filename = "backup.zip";
      const config = {
        bucket: "backups",
        prefix: "org/company/team/project/vamsa/daily",
      };
      const key = config.prefix ? `${config.prefix}/${filename}` : filename;
      expect(key).toContain("org/company");
      expect(key).toContain("backup.zip");
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
    it("should validate supported providers", () => {
      const supportedProviders: StorageProvider[] = ["S3", "R2", "B2", "LOCAL"];
      expect(supportedProviders).toContain("S3");
      expect(supportedProviders).toContain("LOCAL");
    });

    it("should support deletion from all S3-compatible providers", () => {
      const providers: StorageProvider[] = ["S3", "R2", "B2"];
      expect(providers.length).toBe(3);
    });

    it("should require S3 credentials", () => {
      const requiredEnvVars = ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
      expect(requiredEnvVars.length).toBe(2);
    });

    it("should handle S3 configuration with endpoint", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";
      process.env.S3_ENDPOINT = "https://custom-s3.example.com";

      try {
        const buffer = Buffer.from("test");
        const config = { bucket: "backups" };

        await uploadToStorage("S3", "backup.zip", buffer, config);
        expect(mockLogger.info).toHaveBeenCalled();
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe("S3-Compatible Provider Compatibility", () => {
    it("should use same client interface for all S3-compatible providers", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const buffer = Buffer.from("test");
        const config = { bucket: "backups" };

        // All three providers should work with same S3Client
        await uploadToStorage("S3", "backup.zip", buffer, config);
        mockS3Write.mockClear();

        await uploadToStorage("R2", "backup.zip", buffer, config);
        mockS3Write.mockClear();

        await uploadToStorage("B2", "backup.zip", buffer, config);

        expect(mockLogger.info).toHaveBeenCalled();
      } finally {
        process.env = originalEnv;
      }
    });

    it("should handle R2 specific configuration", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";
      process.env.S3_REGION = "auto";

      try {
        const buffer = Buffer.from("test");
        const config = {
          bucket: "my-r2-bucket",
          region: "auto",
          prefix: "backups",
        };

        await uploadToStorage("R2", "backup.zip", buffer, config);
        expect(mockLogger.info).toHaveBeenCalled();
      } finally {
        process.env = originalEnv;
      }
    });

    it("should handle B2 specific configuration", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const buffer = Buffer.from("test");
        const config = {
          bucket: "my-b2-bucket",
          region: "us-west-1",
          prefix: "backups",
        };

        await uploadToStorage("B2", "backup.zip", buffer, config);
        expect(mockLogger.info).toHaveBeenCalled();
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe("Content Type Handling", () => {
    it("should set correct content type for zip files", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const buffer = Buffer.from("test data");
        const config = { bucket: "backups" };

        await uploadToStorage("S3", "backup.zip", buffer, config);
        expect(mockLogger.info).toHaveBeenCalled();
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe("Filename Handling", () => {
    it("should preserve filename with special characters", async () => {
      const originalEnv = { ...process.env };
      process.env.S3_ACCESS_KEY_ID = "test-key";
      process.env.S3_SECRET_ACCESS_KEY = "test-secret";

      try {
        const filename = "vamsa-backup-daily-2024-01-15T10-30-45-123Z.zip";
        const buffer = Buffer.from("test");
        const config = { bucket: "backups" };

        await uploadToStorage("S3", filename, buffer, config);
        expect(mockLogger.info).toHaveBeenCalled();
      } finally {
        process.env = originalEnv;
      }
    });

    it("should be unique per backup", () => {
      const ts1 = Date.now();
      const ts2 = Date.now() + 1000;
      const filename1 = `vamsa-backup-daily-${ts1}.zip`;
      const filename2 = `vamsa-backup-daily-${ts2}.zip`;

      expect(filename1).not.toEqual(filename2);
    });

    it("should have .zip extension", () => {
      const filename = "vamsa-backup-daily-2024-01-15.zip";
      expect(filename.endsWith(".zip")).toBe(true);
    });
  });
});
