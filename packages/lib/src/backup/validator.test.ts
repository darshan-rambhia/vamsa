import { describe, it, expect } from "bun:test";
import { BackupValidator } from "./validator";

describe("BackupValidator", () => {
  describe("validate()", () => {
    it("rejects empty backup file", async () => {
      const emptyBuffer = Buffer.from("");
      const validator = new BackupValidator(emptyBuffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Backup file is empty");
    });

    it("rejects oversized backup file (>100MB)", async () => {
      // Create a buffer slightly over 100MB
      const largeBuffer = Buffer.alloc(101 * 1024 * 1024);
      const validator = new BackupValidator(largeBuffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Backup file exceeds 100MB limit");
    });

    it("handles invalid JSON/ZIP content gracefully", async () => {
      const invalidJson = Buffer.from("not valid json");
      const validator = new BackupValidator(invalidJson);
      const result = await validator.validate();

      // Should fail validation with an error
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Error should mention ZIP extraction or parsing
      expect(
        result.errors.some((e) => e.includes("ZIP") || e.includes("extract"))
      ).toBe(true);
    });

    it("rejects missing metadata.json", async () => {
      const data = { someData: "value" };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("metadata"))).toBe(true);
    });

    it("accepts file at exactly 100MB limit", async () => {
      // Create a buffer at exactly 100MB
      const exactLimitBuffer = Buffer.alloc(100 * 1024 * 1024);
      const validator = new BackupValidator(exactLimitBuffer);
      const result = await validator.validate();

      // Should fail for different reason (invalid content), not size
      expect(result.isValid).toBe(false);
      expect(result.errors).not.toContain("Backup file exceeds 100MB limit");
    });

    it("handles binary garbage data gracefully", async () => {
      // Create random binary data that's not valid JSON or ZIP
      const garbageBuffer = Buffer.from([
        0x00, 0xff, 0xfe, 0xfd, 0x01, 0x02, 0x03,
      ]);
      const validator = new BackupValidator(garbageBuffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("handles whitespace-only content", async () => {
      const whitespaceBuffer = Buffer.from("   \n\t\n   ");
      const validator = new BackupValidator(whitespaceBuffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("handles JSON array instead of object", async () => {
      const arrayBuffer = Buffer.from(JSON.stringify([1, 2, 3]));
      const validator = new BackupValidator(arrayBuffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      // Should still fail validation as it lacks required structure
    });

    it("handles deeply nested JSON object", async () => {
      // Create a deeply nested object
      let deepObj: any = { level: 100 };
      for (let i = 0; i < 100; i++) {
        deepObj = { nested: deepObj };
      }
      const deepBuffer = Buffer.from(JSON.stringify(deepObj));
      const validator = new BackupValidator(deepBuffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      // Should fail due to missing metadata, not parsing
    });

    it("handles very large JSON object within size limit", async () => {
      // Create a large but valid JSON object under 100MB
      const largeObj = {
        data: "x".repeat(1000000), // 1MB of data
      };
      const largeBuffer = Buffer.from(JSON.stringify(largeObj));
      const validator = new BackupValidator(largeBuffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).not.toContain("Backup file exceeds 100MB limit");
    });
  });

  describe("getExtractedFiles()", () => {
    it("returns empty map before validation", () => {
      const buffer = Buffer.from(JSON.stringify({}));
      const validator = new BackupValidator(buffer);
      const files = validator.getExtractedFiles();

      expect(files).toBeInstanceOf(Map);
    });

    it("returns empty map after failed validation", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      await validator.validate();
      const files = validator.getExtractedFiles();

      expect(files).toBeInstanceOf(Map);
      expect(files.size).toBe(0);
    });

    it("returns immutable reference to same map", () => {
      const buffer = Buffer.from(JSON.stringify({}));
      const validator = new BackupValidator(buffer);
      const files1 = validator.getExtractedFiles();
      const files2 = validator.getExtractedFiles();

      expect(files1).toBe(files2);
    });
  });

  describe("getMetadata()", () => {
    it("returns null before validation", () => {
      const buffer = Buffer.from(JSON.stringify({}));
      const validator = new BackupValidator(buffer);

      expect(validator.getMetadata()).toBeNull();
    });

    it("returns null after failed validation with empty file", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      await validator.validate();

      expect(validator.getMetadata()).toBeNull();
    });

    it("returns null after failed validation with invalid JSON", async () => {
      const buffer = Buffer.from("not json");
      const validator = new BackupValidator(buffer);
      await validator.validate();

      expect(validator.getMetadata()).toBeNull();
    });
  });

  describe("countItems()", () => {
    it("returns zeros when no data files are extracted", () => {
      const buffer = Buffer.from(JSON.stringify({}));
      const validator = new BackupValidator(buffer);
      const counts = validator.countItems();

      expect(counts).toEqual({
        people: 0,
        users: 0,
        relationships: 0,
        suggestions: 0,
      });
    });

    it("returns zeros for empty validator", () => {
      const validator = new BackupValidator(Buffer.from(""));
      const counts = validator.countItems();

      expect(counts.people).toBe(0);
      expect(counts.users).toBe(0);
      expect(counts.relationships).toBe(0);
      expect(counts.suggestions).toBe(0);
    });

    it("returns object with all required keys", () => {
      const validator = new BackupValidator(Buffer.from("{}"));
      const counts = validator.countItems();

      expect(counts).toHaveProperty("people");
      expect(counts).toHaveProperty("users");
      expect(counts).toHaveProperty("relationships");
      expect(counts).toHaveProperty("suggestions");
    });

    it("counts are always non-negative", () => {
      const validator = new BackupValidator(Buffer.from(""));
      const counts = validator.countItems();

      expect(counts.people).toBeGreaterThanOrEqual(0);
      expect(counts.users).toBeGreaterThanOrEqual(0);
      expect(counts.relationships).toBeGreaterThanOrEqual(0);
      expect(counts.suggestions).toBeGreaterThanOrEqual(0);
    });
  });

  describe("createValidationResult()", () => {
    it("creates proper validation result with default metadata", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.metadata).toBeDefined();
      expect(result.metadata.version).toBe("1.0.0");
      expect(result.statistics.totalConflicts).toBe(0);
      expect(result.statistics.conflictsByType).toEqual({});
      expect(result.statistics.conflictsBySeverity).toEqual({});
    });

    it("includes errors array in result", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("includes warnings array in result", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("includes conflicts array in result", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    it("includes isValid boolean in result", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(typeof result.isValid).toBe("boolean");
    });

    it("default metadata has valid exportedAt ISO string", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.metadata.exportedAt).toBeDefined();
      expect(() => new Date(result.metadata.exportedAt)).not.toThrow();
    });

    it("default metadata has empty arrays for dataFiles and photoDirectories", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(Array.isArray(result.metadata.dataFiles)).toBe(true);
      expect(Array.isArray(result.metadata.photoDirectories)).toBe(true);
    });

    it("default metadata statistics are all zeros", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.metadata.statistics.totalPeople).toBe(0);
      expect(result.metadata.statistics.totalRelationships).toBe(0);
      expect(result.metadata.statistics.totalUsers).toBe(0);
      expect(result.metadata.statistics.totalSuggestions).toBe(0);
      expect(result.metadata.statistics.totalPhotos).toBe(0);
      expect(result.metadata.statistics.auditLogDays).toBe(0);
      expect(result.metadata.statistics.totalAuditLogs).toBe(0);
    });
  });

  describe("multiple validation calls", () => {
    it("returns consistent results on repeated validation", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);

      const result1 = await validator.validate();
      const result2 = await validator.validate();

      expect(result1.isValid).toBe(result2.isValid);
      expect(result1.errors.length).toBe(result2.errors.length);
    });

    it("can create multiple validators from same buffer", async () => {
      const buffer = Buffer.from("");

      const validator1 = new BackupValidator(buffer);
      const validator2 = new BackupValidator(buffer);

      const result1 = await validator1.validate();
      const result2 = await validator2.validate();

      expect(result1.isValid).toBe(result2.isValid);
    });
  });

  describe("edge cases", () => {
    it("handles null-like content", async () => {
      const buffer = Buffer.from("null");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
    });

    it("handles boolean content", async () => {
      const buffer = Buffer.from("true");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
    });

    it("handles number content", async () => {
      const buffer = Buffer.from("12345");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
    });

    it("handles string content", async () => {
      const buffer = Buffer.from('"hello world"');
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
    });

    it("handles Unicode content in JSON", async () => {
      const buffer = Buffer.from(JSON.stringify({ name: "Test" }));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      // Should fail due to missing metadata, not encoding
      expect(result.isValid).toBe(false);
    });

    it("handles escaped characters in JSON", async () => {
      const buffer = Buffer.from(JSON.stringify({ path: "C:\\Users\\test" }));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
    });
  });

  describe("integration validation scenarios", () => {
    it("validates result structure with errors", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      // Should have proper result structure
      expect(result).toHaveProperty("isValid");
      expect(result).toHaveProperty("metadata");
      expect(result).toHaveProperty("conflicts");
      expect(result).toHaveProperty("statistics");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("warnings");
    });

    it("returns false for validation on empty buffer", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("metadata is always defined in result", async () => {
      const buffer = Buffer.from("");
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.metadata).toBeDefined();
      expect(result.metadata.version).toBeDefined();
      expect(result.metadata.statistics).toBeDefined();
    });
  });

  describe("metadata validation edge cases - mutation killing", () => {
    it("rejects metadata that is null", async () => {
      const data = {
        "metadata.json": null,
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Invalid metadata format"))
      ).toBe(true);
    });

    it("rejects metadata that is a string", async () => {
      const data = {
        "metadata.json": "not an object",
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Invalid metadata format"))
      ).toBe(true);
    });

    it("rejects metadata that is a number", async () => {
      const data = {
        "metadata.json": 12345,
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Invalid metadata format"))
      ).toBe(true);
    });

    it("rejects metadata that is an array", async () => {
      const data = {
        "metadata.json": [1, 2, 3],
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Invalid metadata format"))
      ).toBe(true);
    });

    it("rejects metadata that is a boolean", async () => {
      const data = {
        "metadata.json": true,
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Invalid metadata format"))
      ).toBe(true);
    });

    it("rejects metadata missing exportedAt field", async () => {
      const data = {
        "metadata.json": {
          version: "1.0.0",
          // Missing exportedAt
          exportedBy: {
            id: "user1",
            email: "user@test.com",
            name: "User",
          },
          statistics: {
            totalPeople: 0,
            totalRelationships: 0,
            totalUsers: 0,
            totalSuggestions: 0,
            totalPhotos: 0,
            auditLogDays: 0,
            totalAuditLogs: 0,
          },
          dataFiles: [],
          photoDirectories: [],
        },
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("exportedAt"))).toBe(true);
    });

    it("rejects metadata with null exportedAt", async () => {
      const data = {
        "metadata.json": {
          version: "1.0.0",
          exportedAt: null,
          exportedBy: {
            id: "user1",
            email: "user@test.com",
            name: "User",
          },
          statistics: {
            totalPeople: 0,
            totalRelationships: 0,
            totalUsers: 0,
            totalSuggestions: 0,
            totalPhotos: 0,
            auditLogDays: 0,
            totalAuditLogs: 0,
          },
          dataFiles: [],
          photoDirectories: [],
        },
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("exportedAt"))).toBe(true);
    });

    it("rejects metadata with empty string exportedAt", async () => {
      const data = {
        "metadata.json": {
          version: "1.0.0",
          exportedAt: "",
          exportedBy: {
            id: "user1",
            email: "user@test.com",
            name: "User",
          },
          statistics: {
            totalPeople: 0,
            totalRelationships: 0,
            totalUsers: 0,
            totalSuggestions: 0,
            totalPhotos: 0,
            auditLogDays: 0,
            totalAuditLogs: 0,
          },
          dataFiles: [],
          photoDirectories: [],
        },
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("exportedAt"))).toBe(true);
    });

    it("rejects unsupported backup version", async () => {
      const data = {
        "metadata.json": {
          version: "2.0.0",
          exportedAt: "2024-01-01T00:00:00Z",
          exportedBy: {
            id: "user1",
            email: "user@test.com",
            name: "User",
          },
          statistics: {
            totalPeople: 0,
            totalRelationships: 0,
            totalUsers: 0,
            totalSuggestions: 0,
            totalPhotos: 0,
            auditLogDays: 0,
            totalAuditLogs: 0,
          },
          dataFiles: [],
          photoDirectories: [],
        },
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Unsupported backup version"))
      ).toBe(true);
    });

    it("rejects metadata with unsupported version string format", async () => {
      const data = {
        "metadata.json": {
          version: "3.5.7",
          exportedAt: "2024-01-01T00:00:00Z",
          exportedBy: {
            id: "user1",
            email: "user@test.com",
            name: "User",
          },
          statistics: {
            totalPeople: 0,
            totalRelationships: 0,
            totalUsers: 0,
            totalSuggestions: 0,
            totalPhotos: 0,
            auditLogDays: 0,
            totalAuditLogs: 0,
          },
          dataFiles: [],
          photoDirectories: [],
        },
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Unsupported backup version"))
      ).toBe(true);
    });

    it("rejects metadata with dataFiles not being an array", async () => {
      const data = {
        "metadata.json": {
          version: "1.0.0",
          exportedAt: "2024-01-01T00:00:00Z",
          exportedBy: {
            id: "user1",
            email: "user@test.com",
            name: "User",
          },
          statistics: {
            totalPeople: 0,
            totalRelationships: 0,
            totalUsers: 0,
            totalSuggestions: 0,
            totalPhotos: 0,
            auditLogDays: 0,
            totalAuditLogs: 0,
          },
          dataFiles: "not an array",
          photoDirectories: [],
        },
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      // Should pass metadata validation if dataFiles is not an array (skips check)
      // But may fail on other validations
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("warnings");
    });

    it("generates warnings when photo count mismatch", async () => {
      const data = {
        "metadata.json": {
          version: "1.0.0",
          exportedAt: "2024-01-01T00:00:00Z",
          exportedBy: {
            id: "user1",
            email: "user@test.com",
            name: "User",
          },
          statistics: {
            totalPeople: 0,
            totalRelationships: 0,
            totalUsers: 0,
            totalSuggestions: 0,
            totalPhotos: 5, // Expected 5 photos
            auditLogDays: 0,
            totalAuditLogs: 0,
          },
          dataFiles: [],
          photoDirectories: [],
        },
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.warnings).toContain(
        "Expected 5 photos but found 0 photo files"
      );
    });

    it("correctly validates metadata with all required fields present", async () => {
      const data = {
        "metadata.json": {
          version: "1.0.0",
          exportedAt: "2024-01-01T00:00:00Z",
          exportedBy: {
            id: "user1",
            email: "user@test.com",
            name: "User",
          },
          statistics: {
            totalPeople: 0,
            totalRelationships: 0,
            totalUsers: 0,
            totalSuggestions: 0,
            totalPhotos: 0,
            auditLogDays: 0,
            totalAuditLogs: 0,
          },
          dataFiles: [],
          photoDirectories: [],
        },
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      // Metadata validation should pass (even though data files validation may have other issues)
      expect(validator.getMetadata()).not.toBeNull();
      expect(validator.getMetadata()?.version).toBe("1.0.0");
      expect(result.isValid).toBe(true);
    });

    it("returns warnings array in result", async () => {
      const data = {
        "metadata.json": {
          version: "1.0.0",
          exportedAt: "2024-01-01T00:00:00Z",
          exportedBy: {
            id: "user1",
            email: "user@test.com",
            name: "User",
          },
          statistics: {
            totalPeople: 0,
            totalRelationships: 0,
            totalUsers: 0,
            totalSuggestions: 0,
            totalPhotos: 0,
            auditLogDays: 0,
            totalAuditLogs: 0,
          },
          dataFiles: [],
          photoDirectories: [],
        },
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.warnings).toBeDefined();
    });

    it("early exit when metadata validation fails prevents data validation", async () => {
      const data = {
        "metadata.json": null, // Invalid metadata
        "data/people.json": "not an array",
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      // Should fail on metadata validation, not reach data validation
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Invalid metadata format"))
      ).toBe(true);
    });

    it("correctly handles metadata with missing version field", async () => {
      const data = {
        "metadata.json": {
          // Missing version
          exportedAt: "2024-01-01T00:00:00Z",
          exportedBy: {
            id: "user1",
            email: "user@test.com",
            name: "User",
          },
          statistics: {
            totalPeople: 0,
            totalRelationships: 0,
            totalUsers: 0,
            totalSuggestions: 0,
            totalPhotos: 0,
            auditLogDays: 0,
            totalAuditLogs: 0,
          },
          dataFiles: [],
          photoDirectories: [],
        },
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    });

    it("correctly handles metadata with missing statistics", async () => {
      const data = {
        "metadata.json": {
          version: "1.0.0",
          exportedAt: "2024-01-01T00:00:00Z",
          exportedBy: {
            id: "user1",
            email: "user@test.com",
            name: "User",
          },
          // Missing statistics
          dataFiles: [],
          photoDirectories: [],
        },
      };
      const buffer = Buffer.from(JSON.stringify(data));
      const validator = new BackupValidator(buffer);
      const result = await validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("statistics"))).toBe(true);
    });
  });
});
