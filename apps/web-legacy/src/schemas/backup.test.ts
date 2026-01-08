import { describe, it, expect } from "bun:test";
import { backupExportSchema, backupMetadataSchema } from "./backup";

describe("backupExportSchema", () => {
  it("should validate valid backup export input", () => {
    const validInput = {
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    };

    const result = backupExportSchema.parse(validInput);
    expect(result).toEqual(validInput);
  });

  it("should use default values for optional fields", () => {
    const minimalInput = {};

    const result = backupExportSchema.parse(minimalInput);
    expect(result).toEqual({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });
  });

  it("should validate auditLogDays range", () => {
    expect(() => {
      backupExportSchema.parse({ auditLogDays: 0 });
    }).toThrow();

    expect(() => {
      backupExportSchema.parse({ auditLogDays: 366 });
    }).toThrow();

    expect(() => {
      backupExportSchema.parse({ auditLogDays: 1 });
    }).not.toThrow();

    expect(() => {
      backupExportSchema.parse({ auditLogDays: 365 });
    }).not.toThrow();
  });

  it("should validate boolean fields", () => {
    expect(() => {
      backupExportSchema.parse({ includePhotos: "true" });
    }).toThrow();

    expect(() => {
      backupExportSchema.parse({ includeAuditLogs: 1 });
    }).toThrow();
  });
});

describe("backupMetadataSchema", () => {
  it("should validate valid backup metadata", () => {
    const validMetadata = {
      version: "1.0.0",
      exportedAt: "2026-01-01T20:00:00.000Z",
      exportedBy: {
        id: "user123",
        email: "admin@example.com",
        name: "Admin User",
      },
      statistics: {
        totalPeople: 100,
        totalRelationships: 150,
        totalUsers: 5,
        totalSuggestions: 10,
        totalPhotos: 25,
        auditLogDays: 90,
        totalAuditLogs: 500,
      },
      dataFiles: [
        "data/people.json",
        "data/relationships.json",
        "data/users.json",
        "data/suggestions.json",
        "data/settings.json",
        "data/audit-logs.json",
      ],
      photoDirectories: ["photos/person1/", "photos/person2/"],
    };

    const result = backupMetadataSchema.parse(validMetadata);
    expect(result).toEqual(validMetadata);
  });

  it("should allow null name in exportedBy", () => {
    const metadataWithNullName = {
      version: "1.0.0",
      exportedAt: "2026-01-01T20:00:00.000Z",
      exportedBy: {
        id: "user123",
        email: "admin@example.com",
        name: null,
      },
      statistics: {
        totalPeople: 0,
        totalRelationships: 0,
        totalUsers: 1,
        totalSuggestions: 0,
        totalPhotos: 0,
        auditLogDays: 90,
        totalAuditLogs: 0,
      },
      dataFiles: ["data/people.json"],
      photoDirectories: [],
    };

    expect(() => {
      backupMetadataSchema.parse(metadataWithNullName);
    }).not.toThrow();
  });

  it("should require all statistics fields", () => {
    const incompleteMetadata = {
      version: "1.0.0",
      exportedAt: "2026-01-01T20:00:00.000Z",
      exportedBy: {
        id: "user123",
        email: "admin@example.com",
        name: "Admin User",
      },
      statistics: {
        totalPeople: 100,
        // Missing other required fields
      },
      dataFiles: [],
      photoDirectories: [],
    };

    expect(() => {
      backupMetadataSchema.parse(incompleteMetadata);
    }).toThrow();
  });

  it("should validate array fields", () => {
    const metadataWithInvalidArrays = {
      version: "1.0.0",
      exportedAt: "2026-01-01T20:00:00.000Z",
      exportedBy: {
        id: "user123",
        email: "admin@example.com",
        name: "Admin User",
      },
      statistics: {
        totalPeople: 0,
        totalRelationships: 0,
        totalUsers: 1,
        totalSuggestions: 0,
        totalPhotos: 0,
        auditLogDays: 90,
        totalAuditLogs: 0,
      },
      dataFiles: "not-an-array",
      photoDirectories: [],
    };

    expect(() => {
      backupMetadataSchema.parse(metadataWithInvalidArrays);
    }).toThrow();
  });
});
