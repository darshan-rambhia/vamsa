import type { PrismaClient } from "@prisma/client";
import type {
  ValidationResult,
  ConflictResolutionStrategy,
  Conflict,
  BackupMetadata,
} from "@/schemas/backup";

// Session type for authenticated user
export interface AuthSession {
  id: string;
  email: string;
  name?: string | null;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  personId?: string | null;
  mustChangePassword: boolean;
}

// Storage adapter interface
export interface StorageAdapter {
  upload(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  getUrl(path: string): string;
  delete(path: string): Promise<void>;
}

// Extracted file content - JSON or binary data from ZIP files
export type ExtractedFileContent = Buffer | Record<string, unknown>;

// Backup data structure - represents the contents of a backup file
export interface BackupData {
  metadata: BackupMetadata;
  data: {
    people: Record<string, unknown>[];
    relationships: Record<string, unknown>[];
    users: Record<string, unknown>[];
    suggestions: Record<string, unknown>[];
    settings?: Record<string, unknown> | null;
    auditLogs?: Record<string, unknown>[];
  };
  photos: Array<{ id: string; photoUrl: string | null }>;
}

// Backup validator interface
export interface IBackupValidator {
  validate(): Promise<ValidationResult>;
  getExtractedFiles(): Map<string, ExtractedFileContent>;
}

// Conflict resolver interface
export interface IConflictResolver {
  importData(
    extractedFiles: Map<string, ExtractedFileContent>,
    conflicts: Conflict[]
  ): Promise<{
    statistics: ImportStatistics;
    errors: string[];
    warnings: string[];
  }>;
}

// Import statistics
export interface ImportStatistics {
  peopleImported: number;
  relationshipsImported: number;
  usersImported: number;
  suggestionsImported: number;
  photosImported: number;
  auditLogsImported: number;
  conflictsResolved: number;
  skippedItems: number;
}

// Dependencies for restore functions
export interface RestoreDependencies {
  requireAdmin: () => Promise<AuthSession>;
  db: PrismaClient;
  getStorageAdapter: () => StorageAdapter;
  createValidator: (buffer: Buffer) => IBackupValidator;
  createConflictResolver: (
    strategy: ConflictResolutionStrategy,
    importedBy: { id: string; email: string; name: string | null }
  ) => IConflictResolver;
  gatherBackupData?: (options: {
    includePhotos: boolean;
    includeAuditLogs: boolean;
    auditLogDays: number;
  }) => Promise<BackupData>;
}

// Dependencies for backup functions
export interface BackupDependencies {
  requireAdmin: () => Promise<AuthSession>;
  db: PrismaClient;
}

// Dependencies for conflict resolver
export interface ConflictResolverDependencies {
  db: PrismaClient;
}

// Dependencies for validator
export interface ValidatorDependencies {
  db: PrismaClient;
}
