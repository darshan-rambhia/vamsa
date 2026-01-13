import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  ConflictResolver,
  type DatabaseInterface,
  type ImportedBy,
  type Conflict,
} from "./conflict-resolver";

// Mock database interface
function createMockDb(): DatabaseInterface {
  return {
    person: {
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({ id: "p1" })),
      update: mock(() => Promise.resolve({ id: "p1" })),
    },
    user: {
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({ id: "u1" })),
      update: mock(() => Promise.resolve({ id: "u1" })),
    },
    relationship: {
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({ id: "r1" })),
      update: mock(() => Promise.resolve({ id: "r1" })),
    },
    suggestion: {
      create: mock(() => Promise.resolve({ id: "s1" })),
    },
    familySettings: {
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({ id: "fs1" })),
      update: mock(() => Promise.resolve({ id: "fs1" })),
    },
    auditLog: {
      create: mock(() => Promise.resolve({ id: "al1" })),
    },
  };
}

const mockImportedBy: ImportedBy = {
  id: "user-1",
  email: "admin@test.com",
  name: "Test Admin",
};

describe("ConflictResolver", () => {
  let mockDb: DatabaseInterface;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("constructor", () => {
    it("creates resolver with skip strategy", () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      expect(resolver).toBeDefined();
    });

    it("creates resolver with replace strategy", () => {
      const resolver = new ConflictResolver("replace", mockImportedBy, mockDb);
      expect(resolver).toBeDefined();
    });

    it("creates resolver with merge strategy", () => {
      const resolver = new ConflictResolver("merge", mockImportedBy, mockDb);
      expect(resolver).toBeDefined();
    });

    it("accepts importedBy with null name", () => {
      const importedByNullName: ImportedBy = {
        id: "user-1",
        email: "admin@test.com",
        name: null,
      };
      const resolver = new ConflictResolver("skip", importedByNullName, mockDb);
      expect(resolver).toBeDefined();
    });
  });

  describe("importData()", () => {
    it("returns initial statistics for empty data", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.peopleImported).toBe(0);
      expect(result.statistics.relationshipsImported).toBe(0);
      expect(result.statistics.usersImported).toBe(0);
      expect(result.statistics.suggestionsImported).toBe(0);
      expect(result.statistics.photosImported).toBe(0);
      expect(result.statistics.auditLogsImported).toBe(0);
      expect(result.statistics.conflictsResolved).toBe(0);
      expect(result.statistics.skippedItems).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("imports people from extracted files", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        {
          id: "p1",
          firstName: "John",
          lastName: "Doe",
          gender: "MALE",
          isLiving: true,
        },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.peopleImported).toBe(1);
    });

    it("imports multiple people at once", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "John", lastName: "Doe" },
        { id: "p2", firstName: "Jane", lastName: "Doe" },
        { id: "p3", firstName: "Bob", lastName: "Smith" },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.peopleImported).toBe(3);
    });

    it("imports settings from extracted files", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/settings.json", {
        familyName: "Test Family",
        allowSelfRegistration: false,
        requireApprovalForEdits: true,
      });
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.errors).toHaveLength(0);
    });

    it("imports relationships from extracted files", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/relationships.json", [
        {
          id: "r1",
          personId: "p1",
          relatedPersonId: "p2",
          type: "SPOUSE",
          isActive: true,
        },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.relationshipsImported).toBe(1);
    });

    it("imports multiple relationships at once", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/relationships.json", [
        { id: "r1", personId: "p1", relatedPersonId: "p2", type: "SPOUSE" },
        { id: "r2", personId: "p1", relatedPersonId: "p3", type: "PARENT" },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.relationshipsImported).toBe(2);
    });

    it("imports users from extracted files", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/users.json", [
        {
          id: "u1",
          email: "test@example.com",
          name: "Test User",
          role: "MEMBER",
        },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.usersImported).toBe(1);
    });

    it("skips existing settings when strategy is skip", async () => {
      mockDb.familySettings.findFirst = mock(() =>
        Promise.resolve({ id: "fs1", familyName: "Existing" })
      );

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/settings.json", {
        familyName: "New Family",
      });
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.skippedItems).toBe(1);
      expect(result.warnings.some((w) => w.includes("Skipped"))).toBe(true);
    });

    it("replaces existing settings when strategy is replace", async () => {
      mockDb.familySettings.findFirst = mock(() =>
        Promise.resolve({ id: "fs1", familyName: "Existing" })
      );

      const resolver = new ConflictResolver("replace", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/settings.json", {
        familyName: "New Family",
      });
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.conflictsResolved).toBe(1);
    });

    it("handles import errors gracefully", async () => {
      mockDb.person.create = mock(() =>
        Promise.reject(new Error("Database error"))
      );

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "John", lastName: "Doe" },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("handles null settings data gracefully", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/settings.json", null);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      // Should not error when settings data is null
      expect(result).toBeDefined();
    });

    it("handles non-array people data gracefully", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", "not an array");
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      // Should not import any people when data is invalid
      expect(result.statistics.peopleImported).toBe(0);
    });

    it("handles empty arrays for all entity types", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", []);
      extractedFiles.set("data/users.json", []);
      extractedFiles.set("data/relationships.json", []);
      extractedFiles.set("data/suggestions.json", []);
      extractedFiles.set("data/audit-logs.json", []);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.peopleImported).toBe(0);
      expect(result.statistics.usersImported).toBe(0);
      expect(result.statistics.relationshipsImported).toBe(0);
      expect(result.statistics.suggestionsImported).toBe(0);
      expect(result.statistics.auditLogsImported).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("strategy: skip", () => {
    it("handles skip strategy for settings", async () => {
      mockDb.familySettings.findFirst = mock(() =>
        Promise.resolve({ id: "fs1", familyName: "Existing Family" })
      );

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/settings.json", {
        familyName: "New Family",
      });
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.skippedItems).toBe(1);
      expect(result.warnings.some((w) => w.includes("Skipped"))).toBe(true);
    });

    it("skips people with high severity conflicts", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "John", lastName: "Doe" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "p1",
          newData: { id: "p1", firstName: "John" },
          conflictFields: ["firstName"],
          severity: "high",
          description: "Critical conflict",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.skippedItems).toBe(1);
    });

    it("skips users with conflicts", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/users.json", [
        { id: "u1", email: "test@example.com", name: "Test", role: "MEMBER" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "user",
          action: "update",
          existingId: "u1",
          newData: { id: "u1", email: "test@example.com" },
          conflictFields: ["email"],
          severity: "low",
          description: "Email conflict",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.skippedItems).toBe(1);
    });

    it("skips relationships with conflicts", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/relationships.json", [
        { id: "r1", personId: "p1", relatedPersonId: "p2", type: "SPOUSE" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "relationship",
          action: "update",
          existingId: "r1",
          newData: { id: "r1" },
          conflictFields: ["type"],
          severity: "medium",
          description: "Type conflict",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.skippedItems).toBe(1);
    });
  });

  describe("strategy: replace", () => {
    it("handles replace strategy for settings", async () => {
      mockDb.familySettings.findFirst = mock(() =>
        Promise.resolve({ id: "fs1", familyName: "Existing Family" })
      );

      const resolver = new ConflictResolver("replace", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/settings.json", {
        familyName: "New Family",
      });
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.conflictsResolved).toBe(1);
    });

    it("replaces existing person with conflict", async () => {
      mockDb.person.findUnique = mock(() =>
        Promise.resolve({ id: "p1", firstName: "Old", lastName: "Name" })
      );

      const resolver = new ConflictResolver("replace", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "New", lastName: "Name" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "p1",
          newData: { id: "p1", firstName: "New" },
          conflictFields: ["firstName"],
          severity: "low",
          description: "Name changed",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.conflictsResolved).toBe(1);
      expect(result.statistics.peopleImported).toBe(1);
    });

    it("replaces existing user with conflict", async () => {
      mockDb.user.findUnique = mock(() =>
        Promise.resolve({ id: "u1", email: "old@example.com", role: "MEMBER" })
      );

      const resolver = new ConflictResolver("replace", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/users.json", [
        { id: "u1", email: "new@example.com", name: "Test", role: "ADMIN" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "user",
          action: "update",
          existingId: "u1",
          newData: { id: "u1" },
          conflictFields: ["email", "role"],
          severity: "medium",
          description: "User details changed",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.conflictsResolved).toBe(1);
      expect(result.statistics.usersImported).toBe(1);
    });

    it("replaces existing relationship with conflict", async () => {
      mockDb.relationship.findUnique = mock(() =>
        Promise.resolve({ id: "r1", type: "PARENT" })
      );

      const resolver = new ConflictResolver("replace", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/relationships.json", [
        { id: "r1", personId: "p1", relatedPersonId: "p2", type: "SPOUSE" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "relationship",
          action: "update",
          existingId: "r1",
          newData: { id: "r1", type: "SPOUSE" },
          conflictFields: ["type"],
          severity: "high",
          description: "Type changed",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.conflictsResolved).toBe(1);
      expect(result.statistics.relationshipsImported).toBe(1);
    });

    it("creates new record when existing not found during replace", async () => {
      mockDb.person.findUnique = mock(() => Promise.resolve(null));

      const resolver = new ConflictResolver("replace", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "John", lastName: "Doe" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "p1",
          newData: { id: "p1" },
          conflictFields: ["firstName"],
          severity: "low",
          description: "Person changed",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.peopleImported).toBe(1);
    });
  });

  describe("strategy: merge", () => {
    it("merges existing settings with incoming data", async () => {
      mockDb.familySettings.findFirst = mock(() =>
        Promise.resolve({
          id: "fs1",
          familyName: "Existing Family",
          description: "Old description",
        })
      );

      const resolver = new ConflictResolver("merge", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/settings.json", {
        familyName: "New Family",
        locale: "en-US",
      });
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.conflictsResolved).toBe(1);
    });

    it("merges existing person with incoming data", async () => {
      mockDb.person.findUnique = mock(() =>
        Promise.resolve({
          id: "p1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        })
      );

      const resolver = new ConflictResolver("merge", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "Jonathan", lastName: "Doe" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "p1",
          newData: { id: "p1", firstName: "Jonathan" },
          conflictFields: ["firstName"],
          severity: "low",
          description: "Name differs",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.conflictsResolved).toBe(1);
      expect(result.statistics.peopleImported).toBe(1);
    });

    it("merges existing user with incoming data", async () => {
      mockDb.user.findUnique = mock(() =>
        Promise.resolve({
          id: "u1",
          email: "test@example.com",
          name: "Old Name",
          role: "MEMBER",
        })
      );

      const resolver = new ConflictResolver("merge", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/users.json", [
        {
          id: "u1",
          email: "test@example.com",
          name: "New Name",
          role: "ADMIN",
        },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "user",
          action: "update",
          existingId: "u1",
          newData: { id: "u1" },
          conflictFields: ["name", "role"],
          severity: "medium",
          description: "User details differ",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.conflictsResolved).toBe(1);
      expect(result.statistics.usersImported).toBe(1);
    });

    it("merges existing relationship with incoming data", async () => {
      mockDb.relationship.findUnique = mock(() =>
        Promise.resolve({
          id: "r1",
          personId: "p1",
          relatedPersonId: "p2",
          type: "PARENT",
        })
      );

      const resolver = new ConflictResolver("merge", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/relationships.json", [
        { id: "r1", personId: "p1", relatedPersonId: "p2", type: "SPOUSE" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "relationship",
          action: "update",
          existingId: "r1",
          newData: { id: "r1", type: "SPOUSE" },
          conflictFields: ["type"],
          severity: "medium",
          description: "Type differs",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.conflictsResolved).toBe(1);
      expect(result.statistics.relationshipsImported).toBe(1);
    });

    it("creates new record when existing not found during merge", async () => {
      mockDb.person.findUnique = mock(() => Promise.resolve(null));

      const resolver = new ConflictResolver("merge", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "John", lastName: "Doe" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "p1",
          newData: { id: "p1" },
          conflictFields: ["firstName"],
          severity: "low",
          description: "Person changed",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.peopleImported).toBe(1);
    });

    it("preserves existing values when incoming is empty", async () => {
      mockDb.person.findUnique = mock(() =>
        Promise.resolve({
          id: "p1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        })
      );

      const resolver = new ConflictResolver("merge", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "", lastName: "Doe" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "p1",
          newData: { id: "p1" },
          conflictFields: ["firstName"],
          severity: "low",
          description: "Name changed",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.peopleImported).toBe(1);
    });
  });

  describe("conflict tracking", () => {
    it("creates conflict lookup map correctly", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "p1",
          newData: { id: "p1", firstName: "New" },
          conflictFields: ["firstName"],
          severity: "low",
          description: "Name differs",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result).toBeDefined();
    });

    it("handles multiple conflicts for same entity", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "John", lastName: "Doe" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "p1",
          newData: { id: "p1" },
          conflictFields: ["firstName"],
          severity: "low",
          description: "First name differs",
        },
        {
          type: "person",
          action: "update",
          existingId: "p1",
          newData: { id: "p1" },
          conflictFields: ["lastName"],
          severity: "low",
          description: "Last name differs",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.skippedItems).toBe(1);
    });

    it("tracks high severity conflicts separately", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "John", lastName: "Doe" },
        { id: "p2", firstName: "Jane", lastName: "Doe" },
      ]);
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "p1",
          newData: { id: "p1" },
          conflictFields: ["firstName"],
          severity: "high",
          description: "Critical conflict",
        },
      ];

      const result = await resolver.importData(extractedFiles, conflicts);

      // p1 skipped due to high severity, p2 should import
      expect(result.statistics.skippedItems).toBe(1);
      expect(result.statistics.peopleImported).toBe(1);
    });
  });

  describe("suggestions import", () => {
    it("skips suggestion when submitter not found", async () => {
      mockDb.user.findUnique = mock(() => Promise.resolve(null));

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/suggestions.json", [
        {
          id: "s1",
          type: "ADD_PERSON",
          submittedById: "unknown-user",
          submittedAt: new Date().toISOString(),
          status: "PENDING",
        },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.skippedItems).toBe(1);
      expect(result.warnings.some((w) => w.includes("submitter"))).toBe(true);
    });

    it("skips suggestion when target person not found", async () => {
      mockDb.user.findUnique = mock(() =>
        Promise.resolve({ id: "u1", email: "test@example.com" })
      );
      mockDb.person.findUnique = mock(() => Promise.resolve(null));

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/suggestions.json", [
        {
          id: "s1",
          type: "EDIT_PERSON",
          submittedById: "u1",
          targetPersonId: "unknown-person",
          submittedAt: new Date().toISOString(),
          status: "PENDING",
        },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.skippedItems).toBe(1);
      expect(result.warnings.some((w) => w.includes("target person"))).toBe(
        true
      );
    });

    it("imports suggestion when all references exist", async () => {
      mockDb.user.findUnique = mock(() =>
        Promise.resolve({ id: "u1", email: "test@example.com" })
      );
      mockDb.person.findUnique = mock(() =>
        Promise.resolve({ id: "p1", firstName: "John" })
      );

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/suggestions.json", [
        {
          id: "s1",
          type: "EDIT_PERSON",
          submittedById: "u1",
          targetPersonId: "p1",
          suggestedData: { firstName: "Jonathan" },
          reason: "Name correction",
          submittedAt: new Date().toISOString(),
          status: "PENDING",
        },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.suggestionsImported).toBe(1);
    });
  });

  describe("audit logs import", () => {
    it("skips audit log when user not found", async () => {
      mockDb.user.findUnique = mock(() => Promise.resolve(null));

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/audit-logs.json", [
        {
          id: "al1",
          userId: "unknown-user",
          action: "CREATE",
          entityType: "PERSON",
          createdAt: new Date().toISOString(),
        },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.skippedItems).toBe(1);
      expect(result.warnings.some((w) => w.includes("user not found"))).toBe(
        true
      );
    });

    it("imports audit log when user exists", async () => {
      mockDb.user.findUnique = mock(() =>
        Promise.resolve({ id: "u1", email: "test@example.com" })
      );

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/audit-logs.json", [
        {
          id: "al1",
          userId: "u1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "p1",
          createdAt: new Date().toISOString(),
        },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.auditLogsImported).toBe(1);
    });
  });

  describe("error handling", () => {
    it("captures person creation error in errors array", async () => {
      mockDb.person.create = mock(() =>
        Promise.reject(new Error("Database constraint violation"))
      );

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "John", lastName: "Doe" },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("John Doe"))).toBe(true);
    });

    it("captures settings creation error in errors array", async () => {
      mockDb.familySettings.create = mock(() =>
        Promise.reject(new Error("Settings error"))
      );

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/settings.json", {
        familyName: "Test",
      });
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("settings"))).toBe(true);
    });

    it("captures relationship creation error in errors array", async () => {
      mockDb.relationship.create = mock(() =>
        Promise.reject(new Error("Relationship error"))
      );

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/relationships.json", [
        { id: "r1", personId: "p1", relatedPersonId: "p2", type: "SPOUSE" },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("r1"))).toBe(true);
    });

    it("continues processing after individual item errors", async () => {
      let callCount = 0;
      mockDb.person.create = mock(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("First person error"));
        }
        return Promise.resolve({ id: "p2" });
      });

      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        { id: "p1", firstName: "John", lastName: "Doe" },
        { id: "p2", firstName: "Jane", lastName: "Doe" },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      // First person fails, second succeeds
      expect(result.errors.length).toBe(1);
      expect(result.statistics.peopleImported).toBe(1);
    });
  });

  describe("date handling", () => {
    it("handles ISO date strings in person data", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/people.json", [
        {
          id: "p1",
          firstName: "John",
          lastName: "Doe",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.peopleImported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("handles ISO date strings in user data", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/users.json", [
        {
          id: "u1",
          email: "test@example.com",
          name: "Test",
          role: "MEMBER",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
          lastLoginAt: "2024-01-03T00:00:00.000Z",
        },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.usersImported).toBe(1);
    });

    it("handles null lastLoginAt in user data", async () => {
      const resolver = new ConflictResolver("skip", mockImportedBy, mockDb);
      const extractedFiles = new Map<string, unknown>();
      extractedFiles.set("data/users.json", [
        {
          id: "u1",
          email: "test@example.com",
          name: "Test",
          role: "MEMBER",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
          lastLoginAt: null,
        },
      ]);
      const conflicts: Conflict[] = [];

      const result = await resolver.importData(extractedFiles, conflicts);

      expect(result.statistics.usersImported).toBe(1);
    });
  });
});
