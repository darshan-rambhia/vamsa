import type { StorageAdapter } from "./types";
import { LocalStorageAdapter } from "./local";

let storageAdapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (storageAdapter) {
    return storageAdapter;
  }

  const provider = process.env.STORAGE_PROVIDER || "local";

  switch (provider) {
    case "s3":
      throw new Error("S3 storage adapter not yet implemented");
    case "local":
    default:
      storageAdapter = new LocalStorageAdapter();
  }

  return storageAdapter;
}

export { type StorageAdapter } from "./types";
