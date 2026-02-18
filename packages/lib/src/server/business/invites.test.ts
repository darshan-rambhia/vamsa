/**
 * Unit tests for invites business logic
 *
 * Tests cover:
 * - getInvitesData: Query invites with pagination and filtering
 * - createInviteData: Create new invite with validation
 * - getInviteByTokenData: Fetch and validate invite by token
 * - acceptInviteData: Process invite acceptance and user creation
 * - revokeInviteData: Revoke a pending invite
 * - deleteInviteData: Delete a revoked invite
 * - resendInviteData: Resend invite with new token
 *
 * Uses module mocking for database dependency injection.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllMocks } from "../../testing/shared-mocks";

import {
  acceptInviteData,
  createInviteData,
  deleteInviteData,
  getInviteByTokenData,
  getInvitesData,
  resendInviteData,
  revokeInviteData,
} from "./invites";

// Create mock drizzle database — typed as any since mocks change shape per test
const mockDrizzleDb: any = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      limit: vi.fn(() => Promise.resolve([])),
      leftJoin: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn(() => Promise.resolve([])),
              })),
            })),
          })),
        })),
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({})),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve({})),
  })),
};

describe("Invites Business Logic", () => {
  beforeEach(() => {
    clearAllMocks();
    (mockDrizzleDb.select as ReturnType<typeof vi.fn>).mockClear();
    (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockClear();
    (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockClear();
    (mockDrizzleDb.delete as ReturnType<typeof vi.fn>).mockClear();
  });

  describe("getInvitesData", () => {
    it("should return paginated invites with empty results", async () => {
      const mockCount = { count: "0" };
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([mockCount])),
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    offset: vi.fn(() => Promise.resolve([])),
                  })),
                })),
              })),
            })),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      const result = await getInvitesData(
        1,
        10,
        "desc",
        undefined,
        mockDrizzleDb
      );

      expect(result.items).toHaveLength(0);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(0);
    });

    it("should filter invites by status", async () => {
      const mockCount = { count: "1" };
      const mockInvites = [
        {
          Invite: {
            id: "invite-1",
            email: "test@example.com",
            role: "MEMBER",
            status: "PENDING",
            token: "token-123",
            personId: null,
            expiresAt: new Date("2030-01-01"),
            acceptedAt: null,
            createdAt: new Date("2024-01-01"),
          },
          Person: null,
          User: {
            id: "user-1",
            name: "Admin",
            email: "admin@example.com",
          },
        },
      ];

      const selectMock = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([mockCount])),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      offset: vi.fn(() => Promise.resolve(mockInvites)),
                    })),
                  })),
                })),
              })),
            })),
          })),
        });

      mockDrizzleDb.select = selectMock;

      const result = await getInvitesData(
        1,
        10,
        "desc",
        "PENDING",
        mockDrizzleDb
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe("PENDING");
    });

    it("should handle ascending sort order", async () => {
      const mockCount = { count: "0" };
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([mockCount])),
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    offset: vi.fn(() => Promise.resolve([])),
                  })),
                })),
              })),
            })),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      const result = await getInvitesData(
        1,
        10,
        "asc",
        undefined,
        mockDrizzleDb
      );

      expect(result.items).toHaveLength(0);
    });
  });

  describe("createInviteData", () => {
    it("should throw error if active invite exists", async () => {
      const existingInvite = [
        {
          id: "invite-1",
          email: "test@example.com",
          status: "PENDING",
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(existingInvite)),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      await expect(
        createInviteData(
          "TEST@EXAMPLE.COM",
          "MEMBER",
          null,
          "user-1",
          mockDrizzleDb
        )
      ).rejects.toThrow("An active invite already exists for this email");
    });

    it("should throw error if user already exists", async () => {
      const existingUser = [
        {
          id: "user-1",
          email: "test@example.com",
        },
      ];

      const selectMock = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(existingUser)),
            })),
          })),
        });

      mockDrizzleDb.select = selectMock;

      await expect(
        createInviteData(
          "test@example.com",
          "MEMBER",
          null,
          "user-1",
          mockDrizzleDb
        )
      ).rejects.toThrow("A user already exists with this email");
    });

    it("should throw error if person not found", async () => {
      const selectMock = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        });

      mockDrizzleDb.select = selectMock;

      await expect(
        createInviteData(
          "test@example.com",
          "MEMBER",
          "person-1",
          "user-1",
          mockDrizzleDb
        )
      ).rejects.toThrow("Person not found");
    });

    it("should throw error if person already linked to user", async () => {
      const person = [{ id: "person-1" }];
      const userWithPerson = [{ id: "user-1", personId: "person-1" }];

      const selectMock = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(person)),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(userWithPerson)),
            })),
          })),
        });

      mockDrizzleDb.select = selectMock;

      await expect(
        createInviteData(
          "test@example.com",
          "MEMBER",
          "person-1",
          "user-1",
          mockDrizzleDb
        )
      ).rejects.toThrow("This person is already linked to a user");
    });

    it("should create invite successfully without personId", async () => {
      const newInvite = {
        id: "invite-1",
        email: "test@example.com",
        role: "MEMBER",
        token: "token-123",
        personId: null,
        expiresAt: new Date("2030-01-01"),
      };

      const selectMock = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        });

      mockDrizzleDb.select = selectMock;

      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([newInvite])),
        })),
      }));

      mockDrizzleDb.insert = insertMock;

      const result = await createInviteData(
        "TEST@EXAMPLE.COM",
        "MEMBER",
        null,
        "user-1",
        mockDrizzleDb
      );

      expect(result.email).toBe("test@example.com");
      expect(result.role).toBe("MEMBER");
      expect(result.token).toBe("token-123");
    });

    it("should normalize email to lowercase", async () => {
      const selectMock = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        });

      const newInvite = {
        id: "invite-1",
        email: "user@example.com",
        role: "MEMBER",
        token: "token",
        personId: null,
        expiresAt: new Date(),
      };

      const insertMock = vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([newInvite])),
        })),
      }));

      mockDrizzleDb.select = selectMock;
      mockDrizzleDb.insert = insertMock;

      const result = await createInviteData(
        "USER@EXAMPLE.COM",
        "MEMBER",
        null,
        "user-1",
        mockDrizzleDb
      );

      expect(result.email).toBe("user@example.com");
    });
  });

  describe("getInviteByTokenData", () => {
    it("should return invalid for non-existent invite", async () => {
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      const result = await getInviteByTokenData("invalid-token", mockDrizzleDb);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invite not found");
      expect(result.invite).toBeNull();
    });

    it("should return invalid for accepted invite", async () => {
      const acceptedInvite = [
        {
          Invite: {
            id: "invite-1",
            status: "ACCEPTED",
          },
          Person: null,
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(acceptedInvite)),
            })),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      const result = await getInviteByTokenData("token-123", mockDrizzleDb);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invite already accepted");
    });

    it("should return invalid for revoked invite", async () => {
      const revokedInvite = [
        {
          Invite: {
            id: "invite-1",
            status: "REVOKED",
          },
          Person: null,
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(revokedInvite)),
            })),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      const result = await getInviteByTokenData("token-123", mockDrizzleDb);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invite has been revoked");
    });

    it("should return invalid for expired invite", async () => {
      const expiredDate = new Date("2020-01-01");
      const expiredInvite = [
        {
          Invite: {
            id: "invite-1",
            status: "PENDING",
            expiresAt: expiredDate,
          },
          Person: null,
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(expiredInvite)),
            })),
          })),
        })),
      }));

      const updateMock = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      }));

      mockDrizzleDb.select = selectMock;
      mockDrizzleDb.update = updateMock;

      const result = await getInviteByTokenData("token-123", mockDrizzleDb);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invite has expired");
    });

    it("should return valid invite data", async () => {
      const futureDate = new Date("2030-01-01");
      const validInvite = [
        {
          Invite: {
            id: "invite-1",
            email: "test@example.com",
            role: "MEMBER",
            status: "PENDING",
            personId: null,
            expiresAt: futureDate,
          },
          Person: null,
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(validInvite)),
            })),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      const result = await getInviteByTokenData("token-123", mockDrizzleDb);

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.invite).toBeDefined();
      expect(result.invite?.email).toBe("test@example.com");
    });
  });

  describe("acceptInviteData", () => {
    it("should throw error for non-existent invite", async () => {
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      await expect(
        acceptInviteData(
          "invalid-token",
          "Test User",
          "password123",
          mockDrizzleDb
        )
      ).rejects.toThrow("Invite not found");
    });

    it("should throw error for non-pending invite", async () => {
      const acceptedInvite = [
        {
          id: "invite-1",
          status: "ACCEPTED",
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(acceptedInvite)),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      await expect(
        acceptInviteData("token-123", "Test User", "password123", mockDrizzleDb)
      ).rejects.toThrow("Invite is accepted, cannot accept");
    });

    it("should throw error for expired invite", async () => {
      const expiredInvite = [
        {
          id: "invite-1",
          status: "PENDING",
          expiresAt: new Date("2020-01-01"),
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(expiredInvite)),
          })),
        })),
      }));

      const updateMock = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      }));

      mockDrizzleDb.select = selectMock;
      mockDrizzleDb.update = updateMock;

      await expect(
        acceptInviteData("token-123", "Test User", "password123", mockDrizzleDb)
      ).rejects.toThrow("Invite has expired");
    });
  });

  describe("revokeInviteData", () => {
    it("should throw error for non-existent invite", async () => {
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      await expect(
        revokeInviteData("invite-1", "user-1", mockDrizzleDb)
      ).rejects.toThrow("Invite not found");
    });

    it("should throw error for non-pending invite", async () => {
      const revokedInvite = [
        {
          id: "invite-1",
          status: "REVOKED",
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(revokedInvite)),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      await expect(
        revokeInviteData("invite-1", "user-1", mockDrizzleDb)
      ).rejects.toThrow("Can only revoke pending invites");
    });

    it("should revoke pending invite successfully", async () => {
      const pendingInvite = [
        {
          id: "invite-1",
          status: "PENDING",
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(pendingInvite)),
          })),
        })),
      }));

      const updateMock = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      }));

      mockDrizzleDb.select = selectMock;
      mockDrizzleDb.update = updateMock;

      const result = await revokeInviteData(
        "invite-1",
        "user-1",
        mockDrizzleDb
      );

      expect(result.success).toBe(true);
    });
  });

  describe("deleteInviteData", () => {
    it("should throw error for non-existent invite", async () => {
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      await expect(
        deleteInviteData("invite-1", "user-1", mockDrizzleDb)
      ).rejects.toThrow("Invite not found");
    });

    it("should throw error for non-revoked invite", async () => {
      const pendingInvite = [
        {
          id: "invite-1",
          status: "PENDING",
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(pendingInvite)),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      await expect(
        deleteInviteData("invite-1", "user-1", mockDrizzleDb)
      ).rejects.toThrow("Only revoked invites can be deleted");
    });

    it("should delete revoked invite successfully", async () => {
      const revokedInvite = [
        {
          id: "invite-1",
          status: "REVOKED",
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(revokedInvite)),
          })),
        })),
      }));

      const deleteMock = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve({})),
      }));

      mockDrizzleDb.select = selectMock;
      mockDrizzleDb.delete = deleteMock;

      const result = await deleteInviteData(
        "invite-1",
        "user-1",
        mockDrizzleDb
      );

      expect(result.success).toBe(true);
    });
  });

  describe("resendInviteData", () => {
    it("should throw error for non-existent invite", async () => {
      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      await expect(resendInviteData("invite-1", mockDrizzleDb)).rejects.toThrow(
        "Invite not found"
      );
    });

    it("should throw error for accepted invite", async () => {
      const acceptedInvite = [
        {
          id: "invite-1",
          status: "ACCEPTED",
        },
      ];

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(acceptedInvite)),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;

      await expect(resendInviteData("invite-1", mockDrizzleDb)).rejects.toThrow(
        "Cannot resend an accepted invite"
      );
    });

    it("should resend expired invite successfully", async () => {
      const expiredInvite = [
        {
          id: "invite-1",
          email: "test@example.com",
          role: "MEMBER",
          status: "EXPIRED",
          personId: null,
        },
      ];

      const updatedInvite = {
        id: "invite-1",
        email: "test@example.com",
        role: "MEMBER",
        token: "new-token-456",
        personId: null,
        expiresAt: new Date("2030-01-01"),
      };

      const selectMock = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(expiredInvite)),
          })),
        })),
      }));

      const updateMock = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([updatedInvite])),
          })),
        })),
      }));

      mockDrizzleDb.select = selectMock;
      mockDrizzleDb.update = updateMock;

      const result = await resendInviteData("invite-1", mockDrizzleDb);

      expect(result.success).toBe(true);
      expect(result.token).toBe("new-token-456");
      expect(result.expiresAt).toBeDefined();
    });
  });
});
