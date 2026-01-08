import { mkdir, writeFile, unlink } from "fs/promises";
import { join, dirname } from "path";
import type { StorageAdapter } from "./types";

export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = process.env.STORAGE_LOCAL_PATH || "./data/uploads";
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }

  async upload(
    file: Buffer,
    filename: string,
    _contentType: string
  ): Promise<string> {
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `${timestamp}-${safeName}`;
    const fullPath = join(this.basePath, path);

    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file);

    return path;
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath, path);
    try {
      await unlink(fullPath);
    } catch {
      return;
    }
  }

  getUrl(path: string): string {
    return `${this.baseUrl}/api/uploads/${path}`;
  }
}
