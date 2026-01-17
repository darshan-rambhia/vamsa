/**
 * Unit tests for person server business logic
 *
 * Tests cover:
 * - Building where clauses for search and filtering
 * - Listing persons with pagination, sorting, and filtering
 * - Getting individual person details with relationships
 * - Creating persons with audit trail
 * - Updating persons with permission checks and audit trail
 * - Deleting persons with audit trail
 * - Searching persons by name with optional exclusion
 * - Error handling and validation
 * - Edge cases (null values, empty results, date formatting)
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type {
  PersonCreateInput,
  PersonUpdateInput,
  PersonListOptions,
} from "@vamsa/schemas";
import type { PersonDb } from "@vamsa/lib/server/business";

// Use shared mock from test setup (logger is already mocked globally in preload)

// Mock logger for this test file
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../../tests/setup/shared-mocks";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));


// Import the functions to test
import {
  buildPersonWhereClause,
  listPersonsData,
  getPersonData,
  createPersonData,
  updatePersonData,
  deletePersonData,
  searchPersonsData,
  logAuditAction,
} from "@vamsa/lib/server/business";

// Create mock database client - no mock.module() needed!
function createMockDb(): PersonDb {
  return {
    person: {
      findMany: mock(() => Promise.resolve([])),
      findUnique: mock(() => Promise.resolve(null)),
      count: mock(() => Promise.resolve(0)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    user: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    auditLog: {
      create: mock(() => Promise.resolve({})),
    },
  } as unknown as PersonDb;
}

describe("Person Server Functions", () => {
  let mockDb: PersonDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.error.mockClear();
  });

  describe("buildPersonWhereClause", () => {
    it("should return empty where clause when no filters provided", () => {
      const where = buildPersonWhereClause();
      expect(where).toEqual({});
    });

    it("should build search clause for firstName and lastName", () => {
      const where = buildPersonWhereClause("John");
      expect(where.OR).toBeDefined();
      expect(where.OR).toHaveLength(2);
      expect(where.OR?.[0]).toEqual({
        firstName: { contains: "John", mode: "insensitive" },
      });
      expect(where.OR?.[1]).toEqual({
        lastName: { contains: "John", mode: "insensitive" },
      });
    });

    it("should build isLiving filter clause", () => {
      const where = buildPersonWhereClause(undefined, true);
      expect(where.isLiving).toBe(true);
    });

    it("should build isLiving false filter clause", () => {
      const where = buildPersonWhereClause(undefined, false);
      expect(where.isLiving).toBe(false);
    });

    it("should combine search and isLiving filters", () => {
      const where = buildPersonWhereClause("Smith", false);
      expect(where.OR).toBeDefined();
      expect(where.isLiving).toBe(false);
    });
  });

  describe("listPersonsData", () => {
    it("should list persons with pagination", async () => {
      const options: PersonListOptions = {
        page: 1,
        limit: 10,
        sortBy: "lastName",
        sortOrder: "asc",
      };

      const mockPersons = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          maidenName: null,
          dateOfBirth: new Date("1990-01-15"),
          dateOfPassing: null,
          birthPlace: "New York",
          nativePlace: "USA",
          gender: "M",
          photoUrl: null,
          bio: null,
          email: "john@example.com",
          phone: "555-1234",
          profession: "Engineer",
          employer: "Tech Corp",
          isLiving: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockPersons);

      const result = await listPersonsData(options, mockDb);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].firstName).toBe("John");
      expect(result.items[0].lastName).toBe("Doe");
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it("should apply search filter", async () => {
      const options: PersonListOptions = {
        page: 1,
        limit: 10,
        sortBy: "lastName",
        sortOrder: "asc",
        search: "Smith",
      };

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(5);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      await listPersonsData(options, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>).mock.calls[0];
      expect(findManyCall?.[0]?.where?.OR).toBeDefined();
    });

    it("should apply isLiving filter", async () => {
      const options: PersonListOptions = {
        page: 1,
        limit: 10,
        sortBy: "lastName",
        sortOrder: "asc",
        isLiving: true,
      };

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(3);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      await listPersonsData(options, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>).mock.calls[0];
      expect(findManyCall?.[0]?.where?.isLiving).toBe(true);
    });

    it("should sort by lastName", async () => {
      const options: PersonListOptions = {
        page: 1,
        limit: 10,
        sortBy: "lastName",
        sortOrder: "asc",
      };

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(0);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      await listPersonsData(options, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>).mock.calls[0];
      expect(findManyCall?.[0]?.orderBy).toEqual([
        { lastName: "asc" },
        { firstName: "asc" },
      ]);
    });

    it("should sort by firstName", async () => {
      const options: PersonListOptions = {
        page: 1,
        limit: 10,
        sortBy: "firstName",
        sortOrder: "desc",
      };

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(0);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      await listPersonsData(options, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>).mock.calls[0];
      expect(findManyCall?.[0]?.orderBy).toEqual([
        { firstName: "desc" },
        { lastName: "desc" },
      ]);
    });

    it("should sort by dateOfBirth", async () => {
      const options: PersonListOptions = {
        page: 1,
        limit: 10,
        sortBy: "dateOfBirth",
        sortOrder: "asc",
      };

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(0);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      await listPersonsData(options, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>).mock.calls[0];
      expect(findManyCall?.[0]?.orderBy).toEqual([{ dateOfBirth: "asc" }]);
    });

    it("should sort by createdAt", async () => {
      const options: PersonListOptions = {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(0);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      await listPersonsData(options, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>).mock.calls[0];
      expect(findManyCall?.[0]?.orderBy).toEqual([{ createdAt: "desc" }]);
    });

    it("should apply pagination skip/take", async () => {
      const options: PersonListOptions = {
        page: 3,
        limit: 25,
        sortBy: "lastName",
        sortOrder: "asc",
      };

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(100);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      await listPersonsData(options, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>).mock.calls[0];
      expect(findManyCall?.[0]?.skip).toBe(50); // (3 - 1) * 25
      expect(findManyCall?.[0]?.take).toBe(25);
    });

    it("should format dates correctly", async () => {
      const options: PersonListOptions = {
        page: 1,
        limit: 10,
        sortBy: "lastName",
        sortOrder: "asc",
      };

      const mockPersons = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          maidenName: null,
          dateOfBirth: new Date("1990-01-15"),
          dateOfPassing: new Date("2020-03-10"),
          birthPlace: "New York",
          nativePlace: "USA",
          gender: "M",
          photoUrl: null,
          bio: null,
          email: null,
          phone: null,
          profession: null,
          employer: null,
          isLiving: false,
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date("2024-01-15T14:30:00Z"),
        },
      ];

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockPersons);

      const result = await listPersonsData(options, mockDb);

      expect(result.items[0].dateOfBirth).toBe("1990-01-15");
      expect(result.items[0].dateOfPassing).toBe("2020-03-10");
      expect(result.items[0].createdAt).toContain("2024-01-01");
      expect(result.items[0].updatedAt).toContain("2024-01-15");
    });

    it("should handle null dates", async () => {
      const options: PersonListOptions = {
        page: 1,
        limit: 10,
        sortBy: "lastName",
        sortOrder: "asc",
      };

      const mockPersons = [
        {
          id: "person-1",
          firstName: "Jane",
          lastName: "Doe",
          maidenName: null,
          dateOfBirth: null,
          dateOfPassing: null,
          birthPlace: null,
          nativePlace: null,
          gender: null,
          photoUrl: null,
          bio: null,
          email: null,
          phone: null,
          profession: null,
          employer: null,
          isLiving: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockPersons);

      const result = await listPersonsData(options, mockDb);

      expect(result.items[0].dateOfBirth).toBeNull();
      expect(result.items[0].dateOfPassing).toBeNull();
    });

    it("should return empty list when no persons found", async () => {
      const options: PersonListOptions = {
        page: 1,
        limit: 10,
        sortBy: "lastName",
        sortOrder: "asc",
      };

      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(0);
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      const result = await listPersonsData(options, mockDb);

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe("getPersonData", () => {
    it("should get a person by id with relationships", async () => {
      const personId = "person-1";
      const mockPerson = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
        maidenName: null,
        dateOfBirth: new Date("1990-01-15"),
        dateOfPassing: null,
        birthPlace: "New York",
        nativePlace: "USA",
        gender: "M",
        photoUrl: "http://example.com/photo.jpg",
        bio: "A person",
        email: "john@example.com",
        phone: "555-1234",
        currentAddress: { city: "New York", state: "NY" },
        workAddress: { city: "San Francisco", state: "CA" },
        profession: "Engineer",
        employer: "Tech Corp",
        socialLinks: { twitter: "@johndoe" },
        isLiving: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        relationshipsFrom: [
          {
            id: "rel-1",
            type: "SPOUSE",
            marriageDate: new Date("2010-06-15"),
            divorceDate: null,
            isActive: true,
            relatedPerson: {
              id: "person-2",
              firstName: "Jane",
              lastName: "Doe",
            },
          },
        ],
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);

      const result = await getPersonData(personId, mockDb);

      expect(result.id).toBe(personId);
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBe("Doe");
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].type).toBe("SPOUSE");
    });

    it("should format dates in person data", async () => {
      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        maidenName: null,
        dateOfBirth: new Date("1990-01-15"),
        dateOfPassing: new Date("2020-03-10"),
        birthPlace: null,
        nativePlace: null,
        gender: null,
        photoUrl: null,
        bio: null,
        email: null,
        phone: null,
        currentAddress: null,
        workAddress: null,
        profession: null,
        employer: null,
        socialLinks: null,
        isLiving: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        relationshipsFrom: [],
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);

      const result = await getPersonData("person-1", mockDb);

      expect(result.dateOfBirth).toBe("1990-01-15");
      expect(result.dateOfPassing).toBe("2020-03-10");
    });

    it("should format relationship dates", async () => {
      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        maidenName: null,
        dateOfBirth: null,
        dateOfPassing: null,
        birthPlace: null,
        nativePlace: null,
        gender: null,
        photoUrl: null,
        bio: null,
        email: null,
        phone: null,
        currentAddress: null,
        workAddress: null,
        profession: null,
        employer: null,
        socialLinks: null,
        isLiving: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        relationshipsFrom: [
          {
            id: "rel-1",
            type: "SPOUSE",
            marriageDate: new Date("2010-06-15"),
            divorceDate: new Date("2020-01-10"),
            isActive: false,
            relatedPerson: {
              id: "person-2",
              firstName: "Jane",
              lastName: "Doe",
            },
          },
        ],
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);

      const result = await getPersonData("person-1", mockDb);

      expect(result.relationships[0].marriageDate).toBe("2010-06-15");
      expect(result.relationships[0].divorceDate).toBe("2020-01-10");
    });

    it("should handle null relationship dates", async () => {
      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        maidenName: null,
        dateOfBirth: null,
        dateOfPassing: null,
        birthPlace: null,
        nativePlace: null,
        gender: null,
        photoUrl: null,
        bio: null,
        email: null,
        phone: null,
        currentAddress: null,
        workAddress: null,
        profession: null,
        employer: null,
        socialLinks: null,
        isLiving: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        relationshipsFrom: [
          {
            id: "rel-1",
            type: "SIBLING",
            marriageDate: null,
            divorceDate: null,
            isActive: true,
            relatedPerson: {
              id: "person-2",
              firstName: "Jane",
              lastName: "Doe",
            },
          },
        ],
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);

      const result = await getPersonData("person-1", mockDb);

      expect(result.relationships[0].marriageDate).toBeNull();
      expect(result.relationships[0].divorceDate).toBeNull();
    });

    it("should include address and social links", async () => {
      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        maidenName: "Smith",
        dateOfBirth: null,
        dateOfPassing: null,
        birthPlace: null,
        nativePlace: null,
        gender: null,
        photoUrl: null,
        bio: null,
        email: null,
        phone: null,
        currentAddress: { city: "New York", state: "NY", country: "USA" },
        workAddress: { city: "San Francisco", state: "CA", country: "USA" },
        profession: null,
        employer: null,
        socialLinks: { twitter: "@johndoe", linkedin: "johndoe" },
        isLiving: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        relationshipsFrom: [],
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);

      const result = await getPersonData("person-1", mockDb);

      expect(result.currentAddress).toBeDefined();
      expect(result.workAddress).toBeDefined();
      expect(result.socialLinks).toBeDefined();
      expect(result.maidenName).toBe("Smith");
    });

    it("should throw error when person not found", async () => {
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      try {
        await getPersonData("person-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });
  });

  describe("createPersonData", () => {
    it("should create a person with all fields", async () => {
      const input: PersonCreateInput = {
        firstName: "John",
        lastName: "Doe",
        maidenName: "Smith",
        dateOfBirth: "1990-01-15",
        dateOfPassing: null,
        birthPlace: "New York",
        nativePlace: "USA",
        gender: "M",
        bio: "A person",
        email: "john@example.com",
        phone: "555-1234",
        profession: "Engineer",
        employer: "Tech Corp",
        isLiving: true,
      };

      const mockCreated = {
        id: "person-1",
        firstName: input.firstName,
        lastName: input.lastName,
        maidenName: input.maidenName,
      };

      (mockDb.person.create as ReturnType<typeof mock>).mockResolvedValueOnce(mockCreated);
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await createPersonData(input, "user-1", mockDb);

      expect(result.id).toBe("person-1");
      expect(mockDb.person.create).toHaveBeenCalled();
      expect(mockDb.auditLog.create).toHaveBeenCalled();
    });

    it("should create audit log for create action", async () => {
      const input: PersonCreateInput = {
        firstName: "Jane",
        lastName: "Doe",
      };

      (mockDb.person.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await createPersonData(input, "user-1", mockDb);

      const auditCall = (mockDb.auditLog.create as ReturnType<typeof mock>).mock.calls[0];
      expect(auditCall?.[0]?.data?.action).toBe("CREATE");
      expect(auditCall?.[0]?.data?.entityType).toBe("Person");
    });

    it("should handle null optional fields", async () => {
      const input: PersonCreateInput = {
        firstName: "John",
        lastName: "Doe",
      };

      (mockDb.person.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await createPersonData(input, "user-1", mockDb);

      const createCall = (mockDb.person.create as ReturnType<typeof mock>).mock.calls[0];
      expect(createCall?.[0]?.data?.firstName).toBe("John");
      expect(createCall?.[0]?.data?.maidenName).toBeNull();
      expect(createCall?.[0]?.data?.isLiving).toBe(true);
    });

    it("should convert date strings to Date objects", async () => {
      const input: PersonCreateInput = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-01-15",
        dateOfPassing: "2020-03-10",
      };

      (mockDb.person.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await createPersonData(input, "user-1", mockDb);

      const createCall = (mockDb.person.create as ReturnType<typeof mock>).mock.calls[0];
      expect(createCall?.[0]?.data?.dateOfBirth).toBeInstanceOf(Date);
      expect(createCall?.[0]?.data?.dateOfPassing).toBeInstanceOf(Date);
    });

    it("should set createdById from userId", async () => {
      const input: PersonCreateInput = {
        firstName: "John",
        lastName: "Doe",
      };

      (mockDb.person.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await createPersonData(input, "user-123", mockDb);

      const createCall = (mockDb.person.create as ReturnType<typeof mock>).mock.calls[0];
      expect(createCall?.[0]?.data?.createdById).toBe("user-123");
    });
  });

  describe("updatePersonData", () => {
    it("should update person basic fields", async () => {
      const input: PersonUpdateInput = {
        firstName: "Jane",
        bio: "Updated bio",
      };

      const mockExisting = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        user: null,
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.person.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await updatePersonData("person-1", input, "user-1", undefined, mockDb);

      expect(result.id).toBe("person-1");
      expect(mockDb.person.update).toHaveBeenCalled();
    });

    it("should convert date strings to Date objects on update", async () => {
      const input: PersonUpdateInput = {
        dateOfBirth: "1990-01-15",
      };

      const mockExisting = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        user: null,
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.person.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await updatePersonData("person-1", input, "user-1", undefined, mockDb);

      const updateCall = (mockDb.person.update as ReturnType<typeof mock>).mock.calls[0];
      expect(updateCall?.[0]?.data?.dateOfBirth).toBeInstanceOf(Date);
    });

    it("should allow own profile update", async () => {
      const input: PersonUpdateInput = {
        bio: "Updated bio",
      };

      const mockExisting = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        user: { id: "user-1", personId: "person-1", role: "USER" },
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting.user);
      (mockDb.person.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await updatePersonData("person-1", input, "user-1", "user-1", mockDb);

      expect(result.id).toBe("person-1");
    });

    it("should allow admin to update any profile", async () => {
      const input: PersonUpdateInput = {
        bio: "Admin updated bio",
      };

      const mockExisting = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        user: { id: "user-1", personId: "person-1", role: "USER" },
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "user-2",
        role: "ADMIN",
      });
      (mockDb.person.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await updatePersonData("person-1", input, "user-2", "user-1", mockDb);

      expect(result.id).toBe("person-1");
    });

    it("should deny non-admin user from updating other profile", async () => {
      const input: PersonUpdateInput = {
        bio: "Unauthorized update",
      };

      const mockExisting = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        user: { id: "user-1", personId: "person-1", role: "USER" },
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "user-2",
        role: "USER",
      });

      try {
        await updatePersonData("person-1", input, "user-2", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should throw error when person not found", async () => {
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      try {
        await updatePersonData("person-nonexistent", {}, "user-1", undefined, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should create audit log for update action", async () => {
      const input: PersonUpdateInput = {
        bio: "Updated",
      };

      const mockExisting = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        user: null,
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.person.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await updatePersonData("person-1", input, "user-1", undefined, mockDb);

      const auditCall = (mockDb.auditLog.create as ReturnType<typeof mock>).mock.calls[0];
      expect(auditCall?.[0]?.data?.action).toBe("UPDATE");
    });
  });

  describe("deletePersonData", () => {
    it("should delete a person", async () => {
      const personId = "person-1";
      const mockPerson = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);
      (mockDb.person.delete as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      const result = await deletePersonData(personId, "user-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.person.delete).toHaveBeenCalledWith({
        where: { id: personId },
      });
    });

    it("should create audit log for delete action", async () => {
      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);
      (mockDb.person.delete as ReturnType<typeof mock>).mockResolvedValueOnce(mockPerson);
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await deletePersonData("person-1", "user-1", mockDb);

      const auditCall = (mockDb.auditLog.create as ReturnType<typeof mock>).mock.calls[0];
      expect(auditCall?.[0]?.data?.action).toBe("DELETE");
    });

    it("should throw error when person not found", async () => {
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      try {
        await deletePersonData("person-nonexistent", "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });
  });

  describe("searchPersonsData", () => {
    it("should search persons by firstName", async () => {
      const query = "John";
      const mockPersons = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          photoUrl: null,
          isLiving: true,
        },
      ];

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockPersons);

      const result = await searchPersonsData(query, undefined, mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("John");
    });

    it("should search persons by lastName", async () => {
      const query = "Smith";
      const mockPersons = [
        {
          id: "person-1",
          firstName: "Jane",
          lastName: "Smith",
          photoUrl: null,
          isLiving: true,
        },
      ];

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockPersons);

      const result = await searchPersonsData(query, undefined, mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].lastName).toBe("Smith");
    });

    it("should exclude specified person from results", async () => {
      const query = "John";
      const excludeId = "person-1";
      const mockPersons = [];

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockPersons);

      await searchPersonsData(query, excludeId, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>).mock.calls[0];
      const whereClause = findManyCall?.[0]?.where;
      expect(whereClause?.AND?.[1]?.id?.not).toBe(excludeId);
    });

    it("should limit results to 10", async () => {
      const query = "John";

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      await searchPersonsData(query, undefined, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>).mock.calls[0];
      expect(findManyCall?.[0]?.take).toBe(10);
    });

    it("should sort by lastName then firstName", async () => {
      const query = "John";

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      await searchPersonsData(query, undefined, mockDb);

      const findManyCall = (mockDb.person.findMany as ReturnType<typeof mock>).mock.calls[0];
      expect(findManyCall?.[0]?.orderBy).toEqual([
        { lastName: "asc" },
        { firstName: "asc" },
      ]);
    });

    it("should return empty array when no matches", async () => {
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      const result = await searchPersonsData("NonexistentName", undefined, mockDb);

      expect(result).toHaveLength(0);
    });

    it("should include photoUrl in results", async () => {
      const mockPersons = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          photoUrl: "http://example.com/photo.jpg",
          isLiving: true,
        },
      ];

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockPersons);

      const result = await searchPersonsData("John", undefined, mockDb);

      expect(result[0].photoUrl).toBe("http://example.com/photo.jpg");
    });
  });

  describe("logAuditAction", () => {
    it("should log CREATE action", async () => {
      const userId = "user-1";
      const data = { firstName: "John", lastName: "Doe" };

      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await logAuditAction(userId, "CREATE", "person-1", null, data, mockDb);

      const createCall = (mockDb.auditLog.create as ReturnType<typeof mock>).mock.calls[0];
      expect(createCall?.[0]?.data?.action).toBe("CREATE");
      expect(createCall?.[0]?.data?.entityType).toBe("Person");
    });

    it("should log UPDATE action", async () => {
      const userId = "user-1";
      const previousData = { firstName: "John" };
      const newData = { firstName: "Jane" };

      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await logAuditAction(userId, "UPDATE", "person-1", previousData, newData, mockDb);

      const createCall = (mockDb.auditLog.create as ReturnType<typeof mock>).mock.calls[0];
      expect(createCall?.[0]?.data?.action).toBe("UPDATE");
    });

    it("should log DELETE action", async () => {
      const userId = "user-1";
      const previousData = { firstName: "John", lastName: "Doe" };

      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await logAuditAction(userId, "DELETE", "person-1", previousData, null, mockDb);

      const createCall = (mockDb.auditLog.create as ReturnType<typeof mock>).mock.calls[0];
      expect(createCall?.[0]?.data?.action).toBe("DELETE");
    });

    it("should handle audit log creation failure gracefully", async () => {
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockRejectedValueOnce(
        new Error("DB error")
      );

      // Should not throw
      await logAuditAction("user-1", "CREATE", "person-1", null, {}, mockDb);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("Error handling across all functions", () => {
    it("should propagate errors from database operations", async () => {
      (mockDb.person.findMany as ReturnType<typeof mock>).mockRejectedValueOnce(
        new Error("DB error")
      );

      try {
        await listPersonsData(
          {
            page: 1,
            limit: 10,
            sortBy: "lastName",
            sortOrder: "asc",
            search: "test",
          },
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("DB error");
      }
    });

    it("should handle database count failures", async () => {
      (mockDb.person.count as ReturnType<typeof mock>).mockRejectedValueOnce(
        new Error("Count failed")
      );

      try {
        await listPersonsData(
          {
            page: 1,
            limit: 10,
            sortBy: "lastName",
            sortOrder: "asc",
          },
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should handle findUnique failures for getPersonData", async () => {
      const originalError = new Error("Original error");
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockRejectedValueOnce(
        originalError
      );

      try {
        await getPersonData("person-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });

    it("should handle creation failures", async () => {
      const input: PersonCreateInput = {
        firstName: "John",
        lastName: "Doe",
      };

      (mockDb.person.create as ReturnType<typeof mock>).mockRejectedValueOnce(
        new Error("Create failed")
      );

      try {
        await createPersonData(input, "user-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });
  });

  describe("Date handling and formatting", () => {
    it("should handle ISO date strings", async () => {
      const input: PersonCreateInput = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-01-15",
      };

      (mockDb.person.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await createPersonData(input, "user-1", mockDb);

      const createCall = (mockDb.person.create as ReturnType<typeof mock>).mock.calls[0];
      const dateOfBirth = createCall?.[0]?.data?.dateOfBirth;
      expect(dateOfBirth).toBeInstanceOf(Date);
      expect(dateOfBirth?.getFullYear?.()).toBe(1990);
    });

    it("should handle null dates gracefully", async () => {
      const input: PersonCreateInput = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: null,
      };

      (mockDb.person.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await createPersonData(input, "user-1", mockDb);

      const createCall = (mockDb.person.create as ReturnType<typeof mock>).mock.calls[0];
      expect(createCall?.[0]?.data?.dateOfBirth).toBeNull();
    });
  });

  describe("JSON field handling", () => {
    it("should handle currentAddress JSON field", async () => {
      const input: PersonUpdateInput = {
        currentAddress: { city: "New York", state: "NY" },
      };

      const mockExisting = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        user: null,
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.person.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await updatePersonData("person-1", input, "user-1", undefined, mockDb);

      const updateCall = (mockDb.person.update as ReturnType<typeof mock>).mock.calls[0];
      expect(updateCall?.[0]?.data?.currentAddress).toBeDefined();
    });

    it("should handle socialLinks JSON field", async () => {
      const input: PersonUpdateInput = {
        socialLinks: { twitter: "@johndoe" },
      };

      const mockExisting = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        user: null,
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.person.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await updatePersonData("person-1", input, "user-1", undefined, mockDb);

      const updateCall = (mockDb.person.update as ReturnType<typeof mock>).mock.calls[0];
      expect(updateCall?.[0]?.data?.socialLinks).toBeDefined();
    });

    it("should clear JSON fields when set to null", async () => {
      const input: PersonUpdateInput = {
        currentAddress: null,
      };

      const mockExisting = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        user: null,
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.person.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });
      (mockDb.auditLog.create as ReturnType<typeof mock>).mockResolvedValueOnce({});

      await updatePersonData("person-1", input, "user-1", undefined, mockDb);

      const updateCall = (mockDb.person.update as ReturnType<typeof mock>).mock.calls[0];
      expect(updateCall?.[0]?.data?.currentAddress).toBeUndefined();
    });
  });
});
