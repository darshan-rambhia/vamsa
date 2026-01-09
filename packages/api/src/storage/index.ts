export interface StorageMetadata {
  width?: number;
  height?: number;
  mimeType: string;
  fileSize: number;
}

export interface FileInfo {
  path: string;
  thumbnailPath?: string;
  metadata: StorageMetadata;
}

export interface StorageProvider {
  save(filename: string, data: Buffer): Promise<FileInfo>;
  delete(filePath: string): Promise<void>;
  getThumbnail(filePath: string): Promise<string | null>;
}

export async function getStorageProvider(): Promise<StorageProvider> {
  // Dynamically import the local storage provider
  const { LocalStorage } = await import("./local");
  return new LocalStorage();
}
