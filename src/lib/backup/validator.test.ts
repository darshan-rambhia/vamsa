import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BackupValidator } from "./validator";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: {
    person: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    relationship: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Mock unzipper with a simpler approach
vi.mock("unzipper", () => ({
  default: {
    Open: {
      buffer: vi.fn(),
    },
  },
}));

const { db } = await import("@/lib/db");

describe("BackupValidator", () => {
  let mockZipBuffer: Buffer;
  let validator: BackupValidator;

  const validMetadata = {
    version: "1.0.0",
    exportedAt: "2024-01-01T12:00:00.000Z",
    exportedBy: {
      id: "admin-123",
      email: "admin@example.com",
      name: "Admin User",
    },
    statistics: {
      totalPeople: 2,
      totalRelationships: 1,
      totalUsers: 1,
      totalSuggestions: 0,
      totalPhotos: 1,
      auditLogDays: 90,
      totalAuditLogs: 5,
    },
    dataFiles: [
      "data/people.json",
      "data/relationships.json",
      "data/users.json",
      "data/suggestions.json",
      "data/settings.json",
    ],
    photoDirectories: ["photos/person-1/"],
  };

  const validPeopleData = [
    {
      id: "person-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      createdAt: "2024-01-01T12:00:00.000Z",
      updatedAt: "2024-01-01T12:00:00.000Z",
    },
    {
      id: "person-2",
      firstName: "Jane",
      lastName: "Smith",
      email: null,
      createdAt: "2024-01-02T12:00:00.000Z",
      updatedAt: "2024-01-02T12:00:00.000Z",
    },
  ];

  const validUsersData = [
    {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin User",
      personId: "person-1",
      role: "ADMIN",
      createdAt: "2024-01-01T12:00:00.000Z",
      updatedAt: "2024-01-01T12:00:00.000Z",
    },
  ];

  const validRelationshipsData = [
    {
      id: "rel-1",
      personId: "person-1",
      relatedPersonId: "person-2",
      type: "SPOUSE",
      createdAt: "2024-01-01T12:00:00.000Z",
      updatedAt: "2024-01-01T12:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockZipBuffer = Buffer.from("mock zip content");
    validator = new BackupValidator(mockZipBuffer);

    // Mock successful database queries by default
    vi.mocked(db.person.findUnique).mockResolvedValue(null);
    vi.mocked(db.person.findFirst).mockResolvedValue(null);
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.relationship.findUnique).mockResolvedValue(null);
    vi.mocked(db.relationship.findFirst).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test the validation logic by directly setting extracted files
  const setupValidatorWithFiles = (files: Record<string, any>) => {
    // Access the private extractedFiles property through type assertion
    (validator as any).extractedFiles = new Map(Object.entries(files));
    (validator as any).metadata = files["metadata.json"];
  };

  it("should validate metadata schema correctly", async () => {
    setupValidatorWithFiles({
      "metadata.json": validMetadata,
      "data/people.json": validPeopleData,
      "data/users.json": validUsersData,
      "data/relationships.json": validRelationshipsData,
      "data/suggestions.json": [],
      "data/settings.json": null,
    });

    // Test the private validateMetadata method
    const metadataValidation = await (validator as any).validateMetadata();
    expect(metadataValidation.isValid).toBe(true);
    expect(metadataValidation.errors).toHaveLength(0);
  });

  it("should fail validation with missing metadata", async () => {
    setupValidatorWithFiles({
      "data/people.json": validPeopleData,
    });

    const metadataValidation = await (validator as any).validateMetadata();
    expect(metadataValidation.isValid).toBe(false);
    expect(metadataValidation.errors).toContain("Missing metadata.json file");
  });

  it("should fail validation with invalid metadata version", async () => {
    const invalidMetadata = { ...validMetadata, version: "2.0.0" };
    setupValidatorWithFiles({
      "metadata.json": invalidMetadata,
    });

    const metadataValidation = await (validator as any).validateMetadata();
    expect(metadataValidation.isValid).toBe(false);
    expect(metadataValidation.errors).toContain(
      "Unsupported backup version: 2.0.0. Supported versions: 1.0.0"
    );
  });

  it("should fail validation with missing required data files", async () => {
    setupValidatorWithFiles({
      "metadata.json": validMetadata,
      // Missing required data files
    });

    const metadataValidation = await (validator as any).validateMetadata();
    expect(metadataValidation.isValid).toBe(false);
    expect(metadataValidation.errors).toContain(
      "Missing required data file: data/people.json"
    );
  });

  it("should validate people data structure", async () => {
    setupValidatorWithFiles({
      "metadata.json": validMetadata,
      "data/people.json": validPeopleData,
      "data/users.json": validUsersData,
      "data/relationships.json": validRelationshipsData,
      "data/suggestions.json": [],
      "data/settings.json": null,
    });

    const dataValidation = await (validator as any).validateDataFiles();
    expect(dataValidation.isValid).toBe(true);
    expect(dataValidation.errors).toHaveLength(0);
  });

  it("should fail validation with invalid people data", async () => {
    const invalidPeopleData = [
      {
        id: "person-1",
        // Missing required firstName and lastName
        email: "john@example.com",
      },
    ];

    setupValidatorWithFiles({
      "metadata.json": validMetadata,
      "data/people.json": invalidPeopleData,
      "data/users.json": validUsersData,
      "data/relationships.json": validRelationshipsData,
      "data/suggestions.json": [],
      "data/settings.json": null,
    });

    const dataValidation = await (validator as any).validateDataFiles();
    expect(dataValidation.isValid).toBe(false);
    expect(dataValidation.errors[0]).toContain(
      "Invalid person data at index 0"
    );
  });

  it("should fail validation with non-array people data", async () => {
    setupValidatorWithFiles({
      "metadata.json": validMetadata,
      "data/people.json": "not an array",
      "data/users.json": validUsersData,
      "data/relationships.json": validRelationshipsData,
      "data/suggestions.json": [],
      "data/settings.json": null,
    });

    const dataValidation = await (validator as any).validateDataFiles();
    expect(dataValidation.isValid).toBe(false);
    expect(dataValidation.errors).toContain("People data must be an array");
  });

  it("should fail validation with invalid users data", async () => {
    const invalidUsersData = [
      {
        id: "user-1",
        // Missing required email and role
        name: "Admin User",
      },
    ];

    setupValidatorWithFiles({
      "metadata.json": validMetadata,
      "data/people.json": validPeopleData,
      "data/users.json": invalidUsersData,
      "data/relationships.json": validRelationshipsData,
      "data/suggestions.json": [],
      "data/settings.json": null,
    });

    const dataValidation = await (validator as any).validateDataFiles();
    expect(dataValidation.isValid).toBe(false);
    expect(dataValidation.errors[0]).toContain("Invalid user data at index 0");
  });

  it("should fail validation with invalid relationships data", async () => {
    const invalidRelationshipsData = [
      {
        id: "rel-1",
        // Missing required personId, relatedPersonId, and type
        createdAt: "2024-01-01T12:00:00.000Z",
      },
    ];

    setupValidatorWithFiles({
      "metadata.json": validMetadata,
      "data/people.json": validPeopleData,
      "data/users.json": validUsersData,
      "data/relationships.json": invalidRelationshipsData,
      "data/suggestions.json": [],
      "data/settings.json": null,
    });

    const dataValidation = await (validator as any).validateDataFiles();
    expect(dataValidation.isValid).toBe(false);
    expect(dataValidation.errors[0]).toContain(
      "Invalid relationship data at index 0"
    );
  });

  it("should detect person ID conflicts", async () => {
    // Mock existing person in database for person-1 only, null for person-2
    vi.mocked(db.person.findUnique)
      .mockResolvedValueOnce({
        id: "person-1",
        firstName: "Existing John",
        lastName: "Doe",
        email: "existing@example.com",
      } as any)
      .mockResolvedValueOnce(null);

    // Mock no existing people by email or name
    vi.mocked(db.person.findFirst).mockResolvedValue(null);

    setupValidatorWithFiles({
      "metadata.json": validMetadata,
      "data/people.json": validPeopleData,
      "data/users.json": validUsersData,
      "data/relationships.json": validRelationshipsData,
      "data/suggestions.json": [],
      "data/settings.json": null,
    });

    const conflictDetection = await (validator as any).detectConflicts();
    expect(conflictDetection.conflicts).toHaveLength(1);
    expect(conflictDetection.conflicts[0]).toMatchObject({
      type: "person",
      action: "update",
      existingId: "person-1",
      severity: "medium",
      description: "Person with ID person-1 already exists",
    });
  });

  it("should detect email conflicts", async () => {
    // Mock no existing people by ID
    vi.mocked(db.person.findUnique).mockResolvedValue(null);

    // Mock existing person with same email for john@example.com only
    vi.mocked(db.person.findFirst)
      .mockResolvedValueOnce({
        id: "existing-person",
        firstName: "Existing",
        lastName: "User",
        email: "john@example.com",
      } as any)
      .mockResolvedValue(null); // For name conflicts and other email checks

    setupValidatorWithFiles({
      "metadata.json": validMetadata,
      "data/people.json": validPeopleData,
      "data/users.json": validUsersData,
      "data/relationships.json": validRelationshipsData,
      "data/suggestions.json": [],
      "data/settings.json": null,
    });

    const conflictDetection = await (validator as any).detectConflicts();
    expect(conflictDetection.conflicts).toHaveLength(1);
    expect(conflictDetection.conflicts[0]).toMatchObject({
      type: "person",
      action: "create",
      existingId: "existing-person",
      severity: "high",
      description: "Person with email john@example.com already exists",
    });
  });

  it("should detect user conflicts", async () => {
    // Mock existing user
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      name: "Existing Admin",
      role: "ADMIN",
    } as any);

    setupValidatorWithFiles({
      "metadata.json": validMetadata,
      "data/people.json": validPeopleData,
      "data/users.json": validUsersData,
      "data/relationships.json": validRelationshipsData,
      "data/suggestions.json": [],
      "data/settings.json": null,
    });

    const conflictDetection = await (validator as any).detectConflicts();
    expect(conflictDetection.conflicts).toHaveLength(1);
    expect(conflictDetection.conflicts[0]).toMatchObject({
      type: "user",
      action: "update",
      existingId: "user-1",
      severity: "high",
      description: "User with ID user-1 already exists",
    });
  });

  it("should detect relationship conflicts", async () => {
    // Mock existing relationship
    vi.mocked(db.relationship.findUnique).mockResolvedValue({
      id: "rel-1",
      personId: "person-1",
      relatedPersonId: "person-2",
      type: "SPOUSE",
    } as any);

    setupValidatorWithFiles({
      "metadata.json": validMetadata,
      "data/people.json": validPeopleData,
      "data/users.json": validUsersData,
      "data/relationships.json": validRelationshipsData,
      "data/suggestions.json": [],
      "data/settings.json": null,
    });

    const conflictDetection = await (validator as any).detectConflicts();
    expect(conflictDetection.conflicts).toHaveLength(1);
    expect(conflictDetection.conflicts[0]).toMatchObject({
      type: "relationship",
      action: "update",
      existingId: "rel-1",
      severity: "medium",
      description: "Relationship with ID rel-1 already exists",
    });
  });

  it("should warn about photo count mismatch", async () => {
    const metadataWithPhotos = {
      ...validMetadata,
      statistics: { ...validMetadata.statistics, totalPhotos: 2 },
    };

    setupValidatorWithFiles({
      "metadata.json": metadataWithPhotos,
      "data/people.json": validPeopleData,
      "data/users.json": validUsersData,
      "data/relationships.json": validRelationshipsData,
      "data/suggestions.json": [],
      "data/settings.json": null,
      "photos/person-1/photo.jpg": "binary photo data",
      // Only 1 photo file but metadata says 2
    });

    const dataValidation = await (validator as any).validateDataFiles();
    expect(dataValidation.warnings).toContain(
      "Expected 2 photos but found 1 photo files"
    );
  });

  it("should handle changed fields detection", async () => {
    const existing = {
      id: "person-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    };

    const incoming = {
      id: "person-1",
      firstName: "Johnny", // Changed
      lastName: "Doe",
      email: "newemail@example.com", // Changed
    };

    const changedFields = (validator as any).getChangedFields(
      existing,
      incoming
    );
    expect(changedFields).toEqual(["firstName", "email"]);
  });

  it("should create proper validation result", async () => {
    const conflicts = [
      {
        type: "person",
        action: "update",
        existingId: "person-1",
        existingData: {},
        newData: {},
        conflictFields: ["firstName"],
        severity: "medium",
        description: "Test conflict",
      },
    ];

    const result = (validator as any).createValidationResult(
      true,
      conflicts,
      [],
      ["Test warning"]
    );

    expect(result).toMatchObject({
      isValid: true,
      conflicts,
      statistics: {
        totalConflicts: 1,
        conflictsByType: { person: 1 },
        conflictsBySeverity: { medium: 1 },
      },
      errors: [],
      warnings: ["Test warning"],
    });
  });

  it("should provide access to extracted files", () => {
    const testFiles = new Map([["test.json", { data: "test" }]]);
    (validator as any).extractedFiles = testFiles;

    const extractedFiles = validator.getExtractedFiles();
    expect(extractedFiles).toBe(testFiles);
  });

  it("should provide access to metadata", () => {
    (validator as any).metadata = validMetadata;

    const metadata = validator.getMetadata();
    expect(metadata).toBe(validMetadata);
  });
});
