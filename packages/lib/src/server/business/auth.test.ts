/**
 * Unit tests for Auth Business Logic
 *
 * Tests cover:
 * - getUnclaimedProfilesData: Fetching unclaimed living profiles
 * - claimProfileData: Creating user accounts linked to Person profiles
 *
 * Uses dependency injection to mock database and external services.
 * Mocks are provided by preload file (tests/setup/test-logger-mock.ts).
 * DO NOT call mock.module() here - it can corrupt shared mocks.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllMocks, mockLogger } from "../../testing/shared-mocks";

// Dynamic import ensures module loads AFTER preload mocks are applied
const { claimProfileData, getUnclaimedProfilesData } = await import("./auth");

// Mock the register function - cast to any to avoid strict type checking
const mockRegister = vi.fn(async () => ({
  user: { id: "new-user-id" },
})) as any;

// Mock the notification function
const mockNotify = vi.fn(async () => undefined) as any;

// Mock the translate function
const mockTranslate = vi.fn(async (key: string) => key) as any;

describe("auth business logic", () => {
  beforeEach(() => {
    clearAllMocks();
    mockRegister.mockClear();
    mockNotify.mockClear();
    mockTranslate.mockClear();
  });

  describe("getUnclaimedProfilesData", () => {
    it("should return empty array when no living persons exist", async () => {
      // Create mock that returns empty for both queries
      // First call: get users with personIds - returns empty
      // Second call (else branch): get living persons - returns empty
      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                // First call: get users with personIds - return empty
                return Promise.resolve([]);
              }
              // Else branch: where is followed by orderBy
              return {
                orderBy: vi.fn(() => Promise.resolve([])),
              };
            }),
          })),
        })),
      } as any;

      const result = await getUnclaimedProfilesData(mockDb);

      expect(result).toEqual([]);
    });

    it("should return all profiles when none are claimed", async () => {
      const livingProfiles = [
        { id: "person-1", firstName: "John", lastName: "Doe" },
        { id: "person-2", firstName: "Jane", lastName: "Doe" },
      ];

      // Mock: first call returns no users with personIds
      // Second call (else branch) returns all living persons
      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                // First call: get users with personIds - return empty
                return Promise.resolve([]);
              }
              // Else branch: where().orderBy()
              return {
                orderBy: vi.fn(() => Promise.resolve(livingProfiles)),
              };
            }),
          })),
        })),
      } as any;

      const result = await getUnclaimedProfilesData(mockDb);

      expect(result).toEqual(livingProfiles);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { count: 0 },
        "Claimed profiles found"
      );
    });

    it("should filter out claimed profiles", async () => {
      const allLivingProfiles = [
        { id: "person-1", firstName: "John", lastName: "Doe" },
        { id: "person-2", firstName: "Jane", lastName: "Doe" },
        { id: "person-3", firstName: "Bob", lastName: "Smith" },
      ];

      const claimedPersonIds = [{ personId: "person-2" }];

      // Mock database to return specific results based on call
      // First call: users with personIds (claimed)
      // Second call (if branch): living persons, followed by .then() filter
      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                // First call: return claimed personIds
                return Promise.resolve(claimedPersonIds);
              }
              // If branch: where().orderBy() returns a promise
              return {
                orderBy: vi.fn(() => Promise.resolve(allLivingProfiles)),
              };
            }),
          })),
        })),
      } as any;

      const result = await getUnclaimedProfilesData(mockDb);

      // Should filter out person-2 which is claimed
      expect(result).toEqual([
        { id: "person-1", firstName: "John", lastName: "Doe" },
        { id: "person-3", firstName: "Bob", lastName: "Smith" },
      ]);
    });

    it("should filter null personIds from claimed list", async () => {
      const livingProfiles = [
        { id: "person-1", firstName: "John", lastName: "Doe" },
      ];

      // Some users have null personId (not linked to a person)
      const usersWithPeople = [
        { personId: null },
        { personId: "person-2" },
        { personId: null },
      ];

      // First call: return users with personIds (including nulls)
      // Second call (if branch): living persons with .then() filter
      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => {
              selectCallCount++;
              if (selectCallCount === 1) {
                return Promise.resolve(usersWithPeople);
              }
              // If branch: where().orderBy() returns a promise
              return {
                orderBy: vi.fn(() => Promise.resolve(livingProfiles)),
              };
            }),
          })),
        })),
      } as any;

      const result = await getUnclaimedProfilesData(mockDb);

      // person-1 should be returned since it's not in the claimed list
      // (person-2 is the only claimed one, nulls are filtered)
      expect(result).toEqual(livingProfiles);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { count: 1 }, // Only person-2 is in the filtered list
        "Claimed profiles found"
      );
    });
  });

  describe("claimProfileData", () => {
    it("should reject non-existent person", async () => {
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])), // No person found
            })),
          })),
        })),
      } as any;

      await expect(
        claimProfileData(
          "test@example.com",
          "nonexistent",
          "password123",
          mockDb,
          mockRegister,
          mockNotify,
          mockTranslate
        )
      ).rejects.toThrow("errors:person.notFound");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { personId: "nonexistent" },
        "Profile not found or cannot be claimed"
      );
    });

    it("should reject deceased person (isLiving=false)", async () => {
      const deceasedPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: false,
      };

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([deceasedPerson])),
            })),
          })),
        })),
      } as any;

      await expect(
        claimProfileData(
          "test@example.com",
          "person-1",
          "password123",
          mockDb,
          mockRegister,
          mockNotify,
          mockTranslate
        )
      ).rejects.toThrow("errors:person.notFound");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { personId: "person-1" },
        "Profile not found or cannot be claimed"
      );
    });

    it("should reject already claimed profile", async () => {
      const livingPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
      };

      const existingUser = { id: "user-1", personId: "person-1" };

      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => {
                selectCallCount++;
                if (selectCallCount === 1) {
                  return Promise.resolve([livingPerson]);
                }
                return Promise.resolve([existingUser]);
              }),
            })),
          })),
        })),
      } as any;

      await expect(
        claimProfileData(
          "test@example.com",
          "person-1",
          "password123",
          mockDb,
          mockRegister,
          mockNotify,
          mockTranslate
        )
      ).rejects.toThrow("This profile is already claimed");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { personId: "person-1" },
        "Profile is already claimed"
      );
    });

    it("should reject existing email", async () => {
      const livingPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
      };

      const existingEmailUser = { id: "user-2", email: "test@example.com" };

      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => {
                selectCallCount++;
                if (selectCallCount === 1) {
                  return Promise.resolve([livingPerson]); // Person exists
                }
                if (selectCallCount === 2) {
                  return Promise.resolve([]); // Not claimed
                }
                return Promise.resolve([existingEmailUser]); // Email exists
              }),
            })),
          })),
        })),
      } as any;

      await expect(
        claimProfileData(
          "test@example.com",
          "person-1",
          "password123",
          mockDb,
          mockRegister,
          mockNotify,
          mockTranslate
        )
      ).rejects.toThrow("errors:user.alreadyExists");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { email: "test@example.com" },
        "Email already in use"
      );
    });

    it("should normalize email to lowercase", async () => {
      const livingPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
      };

      let selectCallCount = 0;

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => {
              selectCallCount++;
              if (selectCallCount === 3) {
                // Email check - capture the normalized email
                // The condition contains the email being checked
              }
              return {
                limit: vi.fn(() => {
                  if (selectCallCount === 1)
                    return Promise.resolve([livingPerson]);
                  if (selectCallCount === 2) return Promise.resolve([]); // Not claimed
                  return Promise.resolve([]); // Email doesn't exist
                }),
              };
            }),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve()),
          })),
        })),
      } as any;

      mockRegister.mockResolvedValueOnce({ user: { id: "new-user" } });

      await claimProfileData(
        "TEST@EXAMPLE.COM",
        "person-1",
        "password123",
        mockDb,
        mockRegister,
        mockNotify,
        mockTranslate
      );

      // Verify register was called with lowercase email
      expect(mockRegister).toHaveBeenCalledWith(
        "test@example.com",
        "John Doe",
        "password123"
      );
    });

    it("should construct full name from person", async () => {
      const livingPerson = {
        id: "person-1",
        firstName: "Johann",
        lastName: "Sebastian",
        isLiving: true,
      };

      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => {
                selectCallCount++;
                if (selectCallCount === 1)
                  return Promise.resolve([livingPerson]);
                return Promise.resolve([]); // Not claimed, email doesn't exist
              }),
            })),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve()),
          })),
        })),
      } as any;

      mockRegister.mockResolvedValueOnce({ user: { id: "new-user" } });

      await claimProfileData(
        "test@example.com",
        "person-1",
        "password123",
        mockDb,
        mockRegister,
        mockNotify,
        mockTranslate
      );

      expect(mockRegister).toHaveBeenCalledWith(
        "test@example.com",
        "Johann Sebastian",
        "password123"
      );
    });

    it("should handle registration failure (null user)", async () => {
      const livingPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
      };

      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => {
                selectCallCount++;
                if (selectCallCount === 1)
                  return Promise.resolve([livingPerson]);
                return Promise.resolve([]);
              }),
            })),
          })),
        })),
      } as any;

      mockRegister.mockResolvedValueOnce(null);

      await expect(
        claimProfileData(
          "test@example.com",
          "person-1",
          "password123",
          mockDb,
          mockRegister,
          mockNotify,
          mockTranslate
        )
      ).rejects.toThrow("Failed to create user");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { email: "test@example.com" },
        "Failed to create user via Better Auth"
      );
    });

    it("should update user with correct fields after claim", async () => {
      const livingPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
      };

      let selectCallCount = 0;
      let capturedSetData: unknown = null;

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => {
                selectCallCount++;
                if (selectCallCount === 1)
                  return Promise.resolve([livingPerson]);
                return Promise.resolve([]);
              }),
            })),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn((data: unknown) => {
            capturedSetData = data;
            return {
              where: vi.fn(() => Promise.resolve()),
            };
          }),
        })),
      } as any;

      mockRegister.mockResolvedValueOnce({ user: { id: "new-user-123" } });

      await claimProfileData(
        "test@example.com",
        "person-1",
        "password123",
        mockDb,
        mockRegister,
        mockNotify,
        mockTranslate
      );

      expect(capturedSetData).toEqual({
        personId: "person-1",
        role: "MEMBER",
        profileClaimStatus: "CLAIMED",
        profileClaimedAt: expect.any(Date),
      });
    });

    it("should handle notification failure gracefully", async () => {
      const livingPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
      };

      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => {
                selectCallCount++;
                if (selectCallCount === 1)
                  return Promise.resolve([livingPerson]);
                return Promise.resolve([]);
              }),
            })),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve()),
          })),
        })),
      } as any;

      mockRegister.mockResolvedValueOnce({ user: { id: "new-user-123" } });

      // Make notification fail
      const failingNotify = vi.fn(async () => {
        throw new Error("Notification service unavailable");
      });

      // Should not throw, should complete successfully
      const result = await claimProfileData(
        "test@example.com",
        "person-1",
        "password123",
        mockDb,
        mockRegister,
        failingNotify,
        mockTranslate
      );

      expect(result).toEqual({ success: true, userId: "new-user-123" });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { userId: "new-user-123", error: expect.any(Error) },
        "Failed to send notification"
      );
    });

    it("should return success with userId", async () => {
      const livingPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
        isLiving: true,
      };

      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => {
                selectCallCount++;
                if (selectCallCount === 1)
                  return Promise.resolve([livingPerson]);
                return Promise.resolve([]);
              }),
            })),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve()),
          })),
        })),
      } as any;

      mockRegister.mockResolvedValueOnce({ user: { id: "claimed-user-id" } });

      const result = await claimProfileData(
        "test@example.com",
        "person-1",
        "password123",
        mockDb,
        mockRegister,
        mockNotify,
        mockTranslate
      );

      expect(result).toEqual({
        success: true,
        userId: "claimed-user-id",
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: "claimed-user-id", personId: "person-1" },
        "Profile claimed successfully"
      );
    });
  });
});
