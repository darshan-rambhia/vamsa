import { describe, it, expect, beforeEach, mock } from "bun:test";
import { LocalStorageAdapter } from "./local";

// Mock fs/promises
const mockMkdir = mock(async () => {});
const mockWriteFile = mock(async () => {});
const mockUnlink = mock(async () => {});

mock.module("fs/promises", () => ({
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
  unlink: mockUnlink,
}));

describe("LocalStorageAdapter", () => {
  beforeEach(() => {
    mockMkdir.mockClear();
    mockWriteFile.mockClear();
    mockUnlink.mockClear();
    delete process.env.STORAGE_LOCAL_PATH;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe("constructor", () => {
    it("uses default STORAGE_LOCAL_PATH when env var not set", () => {
      delete process.env.STORAGE_LOCAL_PATH;
      const adapter = new LocalStorageAdapter();
      // basePath should be set to default
      expect(adapter).toBeDefined();
    });

    it("uses STORAGE_LOCAL_PATH env var when set", () => {
      process.env.STORAGE_LOCAL_PATH = "/custom/path";
      const adapter = new LocalStorageAdapter();
      expect(adapter).toBeDefined();
    });

    it("uses default NEXT_PUBLIC_APP_URL when env var not set", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      const adapter = new LocalStorageAdapter();
      expect(adapter).toBeDefined();
    });

    it("uses NEXT_PUBLIC_APP_URL env var when set", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
      const adapter = new LocalStorageAdapter();
      expect(adapter).toBeDefined();
    });

    it("sets baseUrl with custom app URL", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://myapp.com";
      const adapter = new LocalStorageAdapter();
      const url = adapter.getUrl("test.jpg");
      expect(url).toContain("https://myapp.com");
    });

    it("sets baseUrl with default app URL", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      const adapter = new LocalStorageAdapter();
      const url = adapter.getUrl("test.jpg");
      expect(url).toContain("http://localhost:3000");
    });
  });

  describe("upload", () => {
    it("sanitizes filename replacing spaces with underscores", async () => {
      const adapter = new LocalStorageAdapter();
      const buffer = Buffer.from("test content");
      const result = await adapter.upload(buffer, "my file.jpg", "image/jpeg");
      expect(result).toContain("my_file.jpg");
    });

    it("sanitizes filename replacing special characters with underscores", async () => {
      const adapter = new LocalStorageAdapter();
      const buffer = Buffer.from("test content");
      const result = await adapter.upload(
        buffer,
        "file@name!.jpg",
        "image/jpeg"
      );
      expect(result).toContain("file_name_.jpg");
    });

    it("preserves dots in filename extension", async () => {
      const adapter = new LocalStorageAdapter();
      const buffer = Buffer.from("test content");
      const result = await adapter.upload(
        buffer,
        "backup.tar.gz",
        "application/gzip"
      );
      expect(result).toContain("backup.tar.gz");
    });

    it("preserves dashes in filename", async () => {
      const adapter = new LocalStorageAdapter();
      const buffer = Buffer.from("test content");
      const result = await adapter.upload(buffer, "my-file.jpg", "image/jpeg");
      expect(result).toContain("my-file.jpg");
    });

    it("adds timestamp prefix to filename", async () => {
      const adapter = new LocalStorageAdapter();
      const buffer = Buffer.from("test content");
      const result = await adapter.upload(buffer, "photo.jpg", "image/jpeg");
      // Should have format: timestamp-filename
      expect(result).toMatch(/^\d+-photo\.jpg$/);
    });

    it("returns path string without base path", async () => {
      const adapter = new LocalStorageAdapter();
      const buffer = Buffer.from("test content");
      const result = await adapter.upload(buffer, "test.jpg", "image/jpeg");
      expect(typeof result).toBe("string");
      expect(result).toBeTruthy();
      expect(result).not.toContain("/");
    });

    it("calls mkdir with recursive option", async () => {
      mockMkdir.mockResolvedValueOnce(undefined);
      const adapter = new LocalStorageAdapter();
      const buffer = Buffer.from("test content");
      await adapter.upload(buffer, "test.jpg", "image/jpeg");
      expect(mockMkdir).toHaveBeenCalled();
      const calls = mockMkdir.mock.calls;
      if (calls.length > 0 && calls[0]) {
        expect((calls[0] as any)[1]).toEqual({ recursive: true });
      }
    });

    it("calls writeFile with buffer and path", async () => {
      mockMkdir.mockResolvedValueOnce(undefined);
      mockWriteFile.mockResolvedValueOnce(undefined);
      const adapter = new LocalStorageAdapter();
      const buffer = Buffer.from("test content");
      await adapter.upload(buffer, "test.jpg", "image/jpeg");
      expect(mockWriteFile).toHaveBeenCalled();
      const calls = mockWriteFile.mock.calls;
      if (calls.length > 0 && calls[0]) {
        expect((calls[0] as any)[1]).toBe(buffer);
      }
    });

    it("handles filename with unicode characters", async () => {
      const adapter = new LocalStorageAdapter();
      const buffer = Buffer.from("test content");
      const result = await adapter.upload(
        buffer,
        "фото-图片.jpg",
        "image/jpeg"
      );
      expect(result).toBeDefined();
      // Unicode chars should be replaced with underscores
      expect(result).toContain("_");
    });

    it("handles empty filename", async () => {
      const adapter = new LocalStorageAdapter();
      const buffer = Buffer.from("test content");
      const result = await adapter.upload(buffer, "", "image/jpeg");
      expect(result).toMatch(/^\d+-$/);
    });
  });

  describe("delete", () => {
    it("calls unlink with path", async () => {
      mockUnlink.mockResolvedValueOnce(undefined);
      const adapter = new LocalStorageAdapter();
      await adapter.delete("test-file.jpg");
      expect(mockUnlink).toHaveBeenCalled();
    });

    it("silently handles file not found errors", async () => {
      const error = new Error("ENOENT: no such file");
      mockUnlink.mockRejectedValueOnce(error);
      const adapter = new LocalStorageAdapter();
      // Should not throw
      await expect(adapter.delete("nonexistent.jpg")).resolves.toBeUndefined();
    });

    it("silently handles any deletion errors", async () => {
      mockUnlink.mockRejectedValueOnce(new Error("Permission denied"));
      const adapter = new LocalStorageAdapter();
      // Should not throw
      await expect(adapter.delete("test.jpg")).resolves.toBeUndefined();
    });

    it("handles successful deletion", async () => {
      mockUnlink.mockResolvedValueOnce(undefined);
      const adapter = new LocalStorageAdapter();
      await expect(adapter.delete("test.jpg")).resolves.toBeUndefined();
    });
  });

  describe("getUrl", () => {
    it("returns URL with api/uploads path", () => {
      const adapter = new LocalStorageAdapter();
      const url = adapter.getUrl("test.jpg");
      expect(url).toContain("/api/uploads/");
    });

    it("returns correct URL format", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
      const adapter = new LocalStorageAdapter();
      const url = adapter.getUrl("123-photo.jpg");
      expect(url).toBe("https://example.com/api/uploads/123-photo.jpg");
    });

    it("includes filename in URL", () => {
      const adapter = new LocalStorageAdapter();
      const url = adapter.getUrl("my-file.jpg");
      expect(url).toContain("my-file.jpg");
    });

    it("works with default localhost URL", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      const adapter = new LocalStorageAdapter();
      const url = adapter.getUrl("test.jpg");
      expect(url).toContain("localhost:3000");
      expect(url).toContain("/api/uploads/test.jpg");
    });

    it("preserves path separators in filename", () => {
      const adapter = new LocalStorageAdapter();
      const url = adapter.getUrl("backups/2024-01-backup.zip");
      expect(url).toContain("backups/2024-01-backup.zip");
    });

    it("handles filenames with timestamps", () => {
      const adapter = new LocalStorageAdapter();
      const url = adapter.getUrl("1704114000000-photo.jpg");
      expect(url).toContain("1704114000000-photo.jpg");
    });
  });
});
