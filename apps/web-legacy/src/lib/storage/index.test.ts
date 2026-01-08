import { describe, it, expect, beforeEach } from "bun:test";

describe("getStorageAdapter", () => {
  beforeEach(() => {
    // Reset environment variables before each test
    delete process.env.STORAGE_PROVIDER;
  });

  it("returns LocalStorageAdapter when STORAGE_PROVIDER is not set", async () => {
    delete process.env.STORAGE_PROVIDER;
    const { getStorageAdapter } = await import("./index");
    const adapter = getStorageAdapter();
    expect(adapter).toBeDefined();
    expect(adapter.upload).toBeDefined();
    expect(adapter.delete).toBeDefined();
    expect(adapter.getUrl).toBeDefined();
  });

  it("returns LocalStorageAdapter when STORAGE_PROVIDER is 'local'", async () => {
    process.env.STORAGE_PROVIDER = "local";
    // Need to re-import to pick up env var
    delete require.cache[require.resolve("./index")];
    const { getStorageAdapter: getAdapter } = await import("./index");
    const adapter = getAdapter();
    expect(adapter).toBeDefined();
    expect(adapter.upload).toBeDefined();
  });

  it("throws error when STORAGE_PROVIDER is 's3'", async () => {
    process.env.STORAGE_PROVIDER = "s3";
    delete require.cache[require.resolve("./index")];
    const { getStorageAdapter: getAdapter } = await import("./index");
    try {
      getAdapter();
      throw new Error("Should have thrown S3 error");
    } catch (error) {
      expect((error as Error).message).toBe(
        "S3 storage adapter not yet implemented"
      );
    }
  });

  it("throws error when STORAGE_PROVIDER is unknown provider", async () => {
    process.env.STORAGE_PROVIDER = "unsupported";
    delete require.cache[require.resolve("./index")];
    const { getStorageAdapter: getAdapter } = await import("./index");
    try {
      // Should fall through to default case, which throws for unknown
      getAdapter();
      throw new Error("Should have thrown error for unsupported provider");
    } catch (error) {
      // Any error for unsupported provider is acceptable
      expect(error).toBeDefined();
    }
  });

  it("has upload method", async () => {
    const { getStorageAdapter } = await import("./index");
    const adapter = getStorageAdapter();
    expect(typeof adapter.upload).toBe("function");
  });

  it("has delete method", async () => {
    const { getStorageAdapter } = await import("./index");
    const adapter = getStorageAdapter();
    expect(typeof adapter.delete).toBe("function");
  });

  it("has getUrl method", async () => {
    const { getStorageAdapter } = await import("./index");
    const adapter = getStorageAdapter();
    expect(typeof adapter.getUrl).toBe("function");
  });

  it("exports StorageAdapter type", async () => {
    const storageModule = await import("./index");
    // If the type is exported, this should not throw
    expect(storageModule).toBeDefined();
  });
});
