export interface StorageAdapter {
  upload(
    file: Buffer,
    filename: string,
    contentType: string
  ): Promise<string>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

export interface UploadResult {
  url: string;
  path: string;
}
