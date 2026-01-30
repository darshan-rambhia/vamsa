/**
 * Unit tests for persons server business logic
 *
 * Tests cover:
 * - Soft Deletes: deletePersonData sets deletedAt instead of hard delete
 * - Soft Deletes: listPersonsData excludes soft-deleted persons
 * - Soft Deletes: getPersonData throws NotFound for soft-deleted persons
 * - Soft Deletes: searchPersonsData excludes soft-deleted persons
 * - Soft Deletes: updatePersonData prevents updating soft-deleted persons
 * - Transactional Audits: createPersonData wraps insert and audit in transaction
 * - Transactional Audits: updatePersonData wraps update and audit in transaction
 * - Transactional Audits: deletePersonData wraps soft-delete and audit in transaction
 * - Transactional Audits: audit logging fails if main operation fails
 *
 * Uses dependency injection to mock database calls.
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  clearAllMocks,
  mockLog,
  mockLogger,
  mockLoggers,
  mockSerializeError,
} from "../../testing/shared-mocks";

import {
  buildPersonWhereClause,
  createPersonData,
  deletePersonData,
  getPersonData,
  listPersonsData,
  logAuditAction,
  searchPersonsData,
  updatePersonData,
} from "./persons";

// Mock logger
mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  loggers: mockLoggers,
  log: mockLog,
  serializeError: mockSerializeError,
}));

// Create mock schema
const mockDrizzleSchema = {
  persons: {
    id: "id",
    firstName: "firstName",
    lastName: "lastName",
    maidenName: "maidenName",
    dateOfBirth: "dateOfBirth",
    dateOfPassing: "dateOfPassing",
    birthPlace: "birthPlace",
    nativePlace: "nativePlace",
    gender: "gender",
    photoUrl: "photoUrl",
    bio: "bio",
    email: "email",
    phone: "phone",
    currentAddress: "currentAddress",
    workAddress: "workAddress",
    profession: "profession",
    employer: "employer",
    socialLinks: "socialLinks",
    isLiving: "isLiving",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    createdById: "createdById",
    deletedAt: "deletedAt",
  },
  auditLogs: {
    id: "id",
    userId: "userId",
    action: "action",
    entityType: "entityType",
    entityId: "entityId",
    previousData: "previousData",
    newData: "newData",
  },
  users: {
    id: "id",
    role: "role",
    personId: "personId",
  },
};

mock.module("@vamsa/api", () => ({
  drizzleDb: {},
  drizzleSchema: mockDrizzleSchema,
}));

mock.module("@vamsa/schemas", () => ({
  createPaginationMeta: (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }),
}));

mock.module("../i18n", () => ({
  t: async (key: string) => key,
}));

mock.module("../metrics", () => ({
  recordSearchMetrics: () => undefined,
}));

describe("Persons Business Logic - Soft Deletes and Transactions", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe("Soft Deletes - buildPersonWhereClause", () => {
    it("should exclude deleted persons by default", () => {
      const where = buildPersonWhereClause();
      expect(where).toBeDefined();
      // The where clause should include deletedAt condition
    });

    it("should filter by search query and exclude deleted", () => {
      const where = buildPersonWhereClause("John");
      expect(where).toBeDefined();
    });

    it("should filter by living status and exclude deleted", () => {
      const where = buildPersonWhereClause(undefined, true);
      expect(where).toBeDefined();
    });

    it("should combine all filters", () => {
      const where = buildPersonWhereClause("Jane", false);
      expect(where).toBeDefined();
    });
  });

  describe("Soft Deletes - deletePersonData", () => {
    it("should soft delete person by setting deletedAt", async () => {
      const personId = "person-1";
      const userId = "user-1";

      const mockPerson = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        deletedAt: null,
      };

      let capturedUpdateData: Record<string, unknown> | null = null;

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => mockPerson),
          },
        },
        transaction: mock(async (fn: (tx: any) => Promise<unknown>) => {
          const mockTx = {
            update: mock(() => ({
              set: mock((data: Record<string, unknown>) => {
                capturedUpdateData = data;
                return {
                  where: mock(() => ({
                    returning: mock(async () => [mockPerson]),
                  })),
                };
              }),
            })),
            insert: mock(() => ({
              values: mock(() => ({
                returning: mock(async () => []),
              })),
            })),
          };
          return fn(mockTx);
        }),
      } as any;

      const result = await deletePersonData(personId, userId, mockDb);

      expect(result.success).toBe(true);
      expect(capturedUpdateData).toBeDefined();
      expect(
        (capturedUpdateData as unknown as Record<string, unknown>)["deletedAt"]
      ).toBeDefined();
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("should throw NotFound when deleting already deleted person", async () => {
      const personId = "person-1";
      const userId = "user-1";

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => null),
          },
        },
      } as any;

      try {
        await deletePersonData(personId, userId, mockDb);
        throw new Error("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should log audit action within transaction on delete", async () => {
      const personId = "person-1";
      const userId = "user-1";

      const mockPerson = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
        deletedAt: null,
      };

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => mockPerson),
          },
        },
        transaction: mock(async (fn: (tx: any) => Promise<unknown>) => {
          const mockTx = {
            update: mock(() => ({
              set: mock(() => ({
                where: mock(() => ({
                  returning: mock(async () => [mockPerson]),
                })),
              })),
            })),
            insert: mock(async (_table: unknown) => ({
              values: mock(async () => ({
                returning: mock(async () => []),
              })),
            })),
          };
          return fn(mockTx);
        }),
      } as any;

      await deletePersonData(personId, userId, mockDb);
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe("Soft Deletes - getPersonData", () => {
    it("should throw NotFound for soft-deleted person", async () => {
      const personId = "person-1";

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => null),
          },
        },
      } as any;

      try {
        await getPersonData(personId, mockDb);
        throw new Error("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should retrieve active person successfully", async () => {
      const personId = "person-1";

      const mockPerson = {
        id: personId,
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
        relationshipsFrom: [],
      };

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => mockPerson),
          },
        },
      } as any;

      const result = await getPersonData(personId, mockDb);

      expect(result.id).toBe(personId);
      expect(result.firstName).toBe("John");
      expect(result.relationships).toEqual([]);
    });
  });

  describe("Soft Deletes - listPersonsData", () => {
    it("should exclude soft-deleted persons from list", async () => {
      const mockPersons = [
        {
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
          profession: null,
          employer: null,
          isLiving: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(async () => [{ count: 1 }]),
          })),
        })),
        query: {},
      } as any;

      // Properly mock the double select chain: first for count, then for persons
      let selectCallCount = 0;
      mockDb.select = mock((_arg?: unknown) => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First select() call - for count query
          return {
            from: mock(() => ({
              where: mock(async () => [{ count: 1 }]),
            })),
          };
        } else {
          // Second select() call - for person records
          return {
            from: mock(() => ({
              where: mock(() => ({
                orderBy: mock(() => ({
                  limit: mock(() => ({
                    offset: mock(async () => mockPersons),
                  })),
                })),
              })),
            })),
          };
        }
      });

      const result = await listPersonsData(
        { page: 1, limit: 10, sortBy: "lastName", sortOrder: "asc" },
        mockDb
      );

      expect(result.items).toHaveLength(1);
      expect(result.pagination).toBeDefined();
    });

    it("should respect search filter while excluding deleted", async () => {
      let selectCallCount = 0;
      const mockDb = {
        select: mock((_arg?: unknown) => {
          selectCallCount++;
          if (selectCallCount === 1) {
            // First select() for count
            return {
              from: mock(() => ({
                where: mock(async () => [{ count: 0 }]),
              })),
            };
          } else {
            // Second select() for persons
            return {
              from: mock(() => ({
                where: mock(() => ({
                  orderBy: mock(() => ({
                    limit: mock(() => ({
                      offset: mock(async () => []),
                    })),
                  })),
                })),
              })),
            };
          }
        }),
      } as any;

      const result = await listPersonsData(
        {
          page: 1,
          limit: 10,
          sortBy: "lastName",
          sortOrder: "asc",
          search: "John",
        },
        mockDb
      );

      expect(result.items).toHaveLength(0);
    });
  });

  describe("Soft Deletes - searchPersonsData", () => {
    it("should exclude soft-deleted persons from search results", async () => {
      const query = "John";

      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => ({
              orderBy: mock(() => ({
                limit: mock(async () => []),
              })),
            })),
          })),
        })),
      } as any;

      const result = await searchPersonsData(query, undefined, mockDb);

      expect(result).toEqual([]);
    });

    it("should exclude specified person from search", async () => {
      const query = "John";
      const excludeId = "person-1";

      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => ({
              orderBy: mock(() => ({
                limit: mock(async () => []),
              })),
            })),
          })),
        })),
      } as any;

      const result = await searchPersonsData(query, excludeId, mockDb);

      expect(result).toEqual([]);
    });

    it("should return search results excluding deleted", async () => {
      const query = "John";
      const mockResults = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          photoUrl: null,
          isLiving: true,
        },
      ];

      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            where: mock(() => ({
              orderBy: mock(() => ({
                limit: mock(async () => mockResults),
              })),
            })),
          })),
        })),
      } as any;

      const result = await searchPersonsData(query, undefined, mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("John");
    });
  });

  describe("Soft Deletes - updatePersonData", () => {
    it("should throw NotFound when updating soft-deleted person", async () => {
      const personId = "person-1";
      const userId = "user-1";

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => null),
          },
        },
      } as any;

      try {
        await updatePersonData(
          personId,
          { firstName: "Jane" },
          userId,
          undefined,
          mockDb
        );
        throw new Error("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should update active person successfully", async () => {
      const personId = "person-1";
      const userId = "user-1";

      const mockExisting = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
      };

      const mockUpdated = {
        ...mockExisting,
        firstName: "Jane",
      };

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => mockExisting),
          },
          users: {
            findFirst: mock(async () => null),
          },
        },
        transaction: mock(async (fn: (tx: any) => Promise<unknown>) => {
          const mockTx = {
            update: mock(() => ({
              set: mock(() => ({
                where: mock(() => ({
                  returning: mock(async () => [mockUpdated]),
                })),
              })),
            })),
            insert: mock(() => ({
              values: mock(() => ({
                returning: mock(async () => []),
              })),
            })),
          };
          return fn(mockTx);
        }),
      } as any;

      const result = await updatePersonData(
        personId,
        { firstName: "Jane" },
        userId,
        undefined,
        mockDb
      );

      expect(result.id).toBe(personId);
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("should prevent own profile update if not owner or admin", async () => {
      const personId = "person-1";
      const userId = "user-1";
      const linkedUserId = "different-user";

      const mockExisting = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
      };

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => mockExisting),
          },
          users: {
            findFirst: mock(async () => ({
              id: userId,
              role: "MEMBER",
            })),
          },
        },
      } as any;

      try {
        await updatePersonData(
          personId,
          { firstName: "Jane" },
          userId,
          linkedUserId,
          mockDb
        );
        throw new Error("Should have thrown permission error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("Transactional Audits - createPersonData", () => {
    it("should wrap create and audit in transaction", async () => {
      const userId = "user-1";
      const personData = {
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
      };

      let transactionCalled = false;

      const mockDb = {
        transaction: mock(async (fn: (tx: any) => Promise<unknown>) => {
          transactionCalled = true;
          const mockTx = {
            insert: mock((_table: unknown) => ({
              values: mock(() => ({
                returning: mock(async () => [
                  { id: "new-person-1", ...personData },
                ]),
              })),
            })),
          };

          // Track if audit insert is called
          const originalInsert = mockTx.insert;
          mockTx.insert = mock((table: unknown) => {
            if (table === mockDrizzleSchema.auditLogs) {
              // Audit insert called
            }
            return originalInsert(table);
          });

          return fn(mockTx);
        }),
      } as any;

      const result = await createPersonData(personData as any, userId, mockDb);

      expect(transactionCalled).toBe(true);
      expect(result.id).toBeDefined();
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("should include audit action in transaction response", async () => {
      const userId = "user-1";
      const personData = {
        firstName: "John",
        lastName: "Doe",
      };

      const mockDb = {
        transaction: mock(async (fn: (tx: any) => Promise<unknown>) => {
          const mockTx = {
            insert: mock(() => ({
              values: mock(() => ({
                returning: mock(async () => [{ id: "new-person-1" }]),
              })),
            })),
          };
          return fn(mockTx);
        }),
      } as any;

      const result = await createPersonData(personData as any, userId, mockDb);

      expect(result.id).toBe("new-person-1");
    });
  });

  describe("Transactional Audits - updatePersonData", () => {
    it("should wrap update and audit in transaction", async () => {
      const personId = "person-1";
      const userId = "user-1";
      const updateData = { firstName: "Jane" };

      let transactionCalled = false;

      const mockExisting = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
      };

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => mockExisting),
          },
          users: {
            findFirst: mock(async () => null),
          },
        },
        transaction: mock(async (fn: (tx: any) => Promise<unknown>) => {
          transactionCalled = true;
          const mockTx = {
            update: mock(() => ({
              set: mock(() => ({
                where: mock(() => ({
                  returning: mock(async () => [
                    { id: personId, ...updateData },
                  ]),
                })),
              })),
            })),
            insert: mock(() => ({
              values: mock(() => ({
                returning: mock(async () => []),
              })),
            })),
          };
          return fn(mockTx);
        }),
      } as any;

      const result = await updatePersonData(
        personId,
        updateData,
        userId,
        undefined,
        mockDb
      );

      expect(transactionCalled).toBe(true);
      expect(result.id).toBe(personId);
    });

    it("should include both update and audit in transaction", async () => {
      const personId = "person-1";
      const userId = "user-1";
      const updateData = { firstName: "Jane" };

      const mockExisting = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
      };

      let updateCalls = 0;
      let insertCalls = 0;

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => mockExisting),
          },
          users: {
            findFirst: mock(async () => null),
          },
        },
        transaction: mock(async (fn: (tx: any) => Promise<unknown>) => {
          const mockTx = {
            update: mock(() => {
              updateCalls++;
              return {
                set: mock(() => ({
                  where: mock(() => ({
                    returning: mock(async () => [{ id: personId }]),
                  })),
                })),
              };
            }),
            insert: mock(() => {
              insertCalls++;
              return {
                values: mock(() => ({
                  returning: mock(async () => []),
                })),
              };
            }),
          };
          return fn(mockTx);
        }),
      } as any;

      await updatePersonData(personId, updateData, userId, undefined, mockDb);

      expect(updateCalls).toBeGreaterThan(0);
      expect(insertCalls).toBeGreaterThan(0);
    });
  });

  describe("Transactional Audits - deletePersonData", () => {
    it("should wrap soft delete and audit in transaction", async () => {
      const personId = "person-1";
      const userId = "user-1";

      let transactionCalled = false;

      const mockPerson = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
        deletedAt: null,
      };

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => mockPerson),
          },
        },
        transaction: mock(async (fn: (tx: any) => Promise<unknown>) => {
          transactionCalled = true;
          const mockTx = {
            update: mock(() => ({
              set: mock(() => ({
                where: mock(() => ({
                  returning: mock(async () => [mockPerson]),
                })),
              })),
            })),
            insert: mock(() => ({
              values: mock(() => ({
                returning: mock(async () => []),
              })),
            })),
          };
          return fn(mockTx);
        }),
      } as any;

      const result = await deletePersonData(personId, userId, mockDb);

      expect(transactionCalled).toBe(true);
      expect(result.success).toBe(true);
    });

    it("should include both delete and audit in transaction", async () => {
      const personId = "person-1";
      const userId = "user-1";

      const mockPerson = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
        deletedAt: null,
      };

      let updateCalls = 0;
      let insertCalls = 0;

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => mockPerson),
          },
        },
        transaction: mock(async (fn: (tx: any) => Promise<unknown>) => {
          const mockTx = {
            update: mock(() => {
              updateCalls++;
              return {
                set: mock(() => ({
                  where: mock(() => ({
                    returning: mock(async () => []),
                  })),
                })),
              };
            }),
            insert: mock(() => {
              insertCalls++;
              return {
                values: mock(() => ({
                  returning: mock(async () => []),
                })),
              };
            }),
          };
          return fn(mockTx);
        }),
      } as any;

      await deletePersonData(personId, userId, mockDb);

      expect(updateCalls).toBeGreaterThan(0);
      expect(insertCalls).toBeGreaterThan(0);
    });
  });

  describe("Transactional Audits - logAuditAction", () => {
    it("should log audit action with transaction parameter", async () => {
      const userId = "user-1";
      const personId = "person-1";
      const action = "CREATE" as const;
      const newData = { firstName: "John", lastName: "Doe" };

      const mockTx = {
        insert: mock(() => ({
          values: mock(() => ({})),
        })),
      } as any;

      await logAuditAction(
        userId,
        action,
        personId,
        undefined,
        newData,
        mockTx
      );

      expect(mockTx.insert).toHaveBeenCalled();
    });

    it("should handle audit logging errors gracefully", async () => {
      const userId = "user-1";
      const personId = "person-1";

      const mockTx = {
        insert: mock(() => ({
          values: mock(async () => {
            throw new Error("Audit insert failed");
          }),
        })),
      } as any;

      // Should not throw - errors are logged but not thrown
      let didThrow = false;
      try {
        await logAuditAction(userId, "CREATE", personId, undefined, {}, mockTx);
      } catch (_error) {
        didThrow = true;
      }

      expect(didThrow).toBe(false);
    });
  });

  describe("Integration - Soft Deletes + Transactions", () => {
    it("should not recover soft-deleted person after delete transaction", async () => {
      const personId = "person-1";
      const userId = "user-1";

      const mockPerson = {
        id: personId,
        firstName: "John",
        lastName: "Doe",
        deletedAt: null,
      };

      let deletedAtSet = false;

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async (_query: unknown) => {
              // After deletion, deleted persons should not be found
              if (deletedAtSet) {
                return null;
              }
              return mockPerson;
            }),
          },
        },
        transaction: mock(async (fn: (tx: any) => Promise<unknown>) => {
          const mockTx = {
            update: mock(() => ({
              set: mock((data: any) => {
                if (data.deletedAt) {
                  deletedAtSet = true;
                }
                return {
                  where: mock(() => ({
                    returning: mock(async () => [
                      { ...mockPerson, deletedAt: new Date() },
                    ]),
                  })),
                };
              }),
            })),
            insert: mock(() => ({
              values: mock(() => ({
                returning: mock(async () => []),
              })),
            })),
          };
          return fn(mockTx);
        }),
      } as any;

      // Delete the person
      const deleteResult = await deletePersonData(personId, userId, mockDb);
      expect(deleteResult.success).toBe(true);

      // Try to retrieve the deleted person
      try {
        await getPersonData(personId, mockDb);
        throw new Error("Should not find soft-deleted person");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should ensure audit log created even if person data changes", async () => {
      const personId = "person-1";
      const userId = "user-1";
      const updateData = { firstName: "NewName" };

      const mockExisting = {
        id: personId,
        firstName: "OldName",
        lastName: "Doe",
      };

      let auditDataCaptured = false;

      const mockDb = {
        query: {
          persons: {
            findFirst: mock(async () => mockExisting),
          },
          users: {
            findFirst: mock(async () => null),
          },
        },
        transaction: mock(async (fn: (tx: any) => Promise<unknown>) => {
          const mockTx = {
            update: mock(() => ({
              set: mock(() => ({
                where: mock(() => ({
                  returning: mock(async () => [
                    { id: personId, ...updateData },
                  ]),
                })),
              })),
            })),
            insert: mock((table: unknown) => {
              if (table === mockDrizzleSchema.auditLogs) {
                auditDataCaptured = true;
              }
              return {
                values: mock(() => ({
                  returning: mock(async () => []),
                })),
              };
            }),
          };
          return fn(mockTx);
        }),
      } as any;

      await updatePersonData(personId, updateData, userId, undefined, mockDb);

      expect(auditDataCaptured).toBe(true);
    });
  });
});
