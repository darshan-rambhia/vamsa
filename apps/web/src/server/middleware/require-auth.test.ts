/**
 * Unit tests for require-auth middleware
 *
 * Tests authentication requirements and role-based access control.
 * Uses the stubbed server context for isolated testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  asAdmin,
  asMember,
  asUnauthenticated,
  asViewer,
} from "@test/server-fn-context";
import { initializeServerI18n } from "@vamsa/lib/server";

// Static import after vi.mock (auto-hoisted)
import { requireAuth } from "./require-auth";

// Create a mock database that returns the authenticated user (hoisted for vi.mock)
const { mockDrizzleDb } = vi.hoisted(() => ({
  mockDrizzleDb: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            // Return mock user - in real scenarios this would come from the session context
            return [
              {
                id: "test-user-id",
                email: "test@example.com",
                name: "Test User",
                role: "VIEWER",
                personId: null,
                mustChangePassword: false,
                oidcProvider: null,
                profileClaimStatus: "PENDING",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];
          },
        }),
      }),
    }),
  },
}));

vi.mock("@vamsa/lib/server/db", () => ({
  drizzleDb: mockDrizzleDb,
  drizzleSchema: {
    users: {
      id: "id",
      email: "email",
      name: "name",
      role: "role",
    },
  },
}));

beforeEach(async () => {
  await initializeServerI18n();
});

describe("requireAuth middleware", () => {
  describe("authenticated requests", () => {
    it("returns authenticated user for viewer", async () => {
      const { result } = await asViewer(async () => {
        return await requireAuth("VIEWER");
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.email).toBeDefined();
      expect(result.role).toBeDefined();
    });

    it("returns authenticated user for member", async () => {
      const { result } = await asMember(async () => {
        return await requireAuth("VIEWER");
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.role).toBeDefined();
    });

    it("returns authenticated user for admin", async () => {
      const { result } = await asAdmin(async () => {
        return await requireAuth("VIEWER");
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  describe("unauthenticated requests", () => {
    it("throws error for unauthenticated request", async () => {
      await expect(
        asUnauthenticated(async () => {
          return await requireAuth("VIEWER");
        })
      ).rejects.toThrow(/notAuthenticated|log in/i);
    });

    it("throws correct error message for unauthenticated", async () => {
      try {
        await asUnauthenticated(async () => {
          return await requireAuth("VIEWER");
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        // Should contain authentication-related error message (i18n key or translated)
        expect(message).toMatch(/notAuthenticated|log in/i);
      }
    });
  });

  describe("role-based access control", () => {
    it("allows viewer to access VIEWER role content", async () => {
      const { result } = await asViewer(async () => {
        return await requireAuth("VIEWER");
      });

      expect(result).toBeDefined();
    });

    it("allows member to access VIEWER role content", async () => {
      const { result } = await asMember(async () => {
        return await requireAuth("VIEWER");
      });

      expect(result).toBeDefined();
    });

    it("allows member to access MEMBER role content", async () => {
      const { result } = await asMember(async () => {
        return await requireAuth("MEMBER");
      });

      expect(result).toBeDefined();
    });

    it("denies viewer access to MEMBER role content", async () => {
      await expect(
        asViewer(async () => {
          return await requireAuth("MEMBER");
        })
      ).rejects.toThrow(/Requires MEMBER role or higher/);
    });

    it("denies viewer access to ADMIN role content", async () => {
      await expect(
        asViewer(async () => {
          return await requireAuth("ADMIN");
        })
      ).rejects.toThrow(/Requires ADMIN role or higher/);
    });

    it("denies member access to ADMIN role content", async () => {
      await expect(
        asMember(async () => {
          return await requireAuth("ADMIN");
        })
      ).rejects.toThrow(/Requires ADMIN role or higher/);
    });

    it("allows admin to access all role levels", async () => {
      // Admin can access VIEWER
      let result = await asAdmin(async () => {
        return await requireAuth("VIEWER");
      });
      expect(result.result).toBeDefined();

      // Admin can access MEMBER
      result = await asAdmin(async () => {
        return await requireAuth("MEMBER");
      });
      expect(result.result).toBeDefined();

      // Admin can access ADMIN
      result = await asAdmin(async () => {
        return await requireAuth("ADMIN");
      });
      expect(result.result).toBeDefined();
    });
  });

  describe("default role parameter", () => {
    it("defaults to VIEWER role when not specified", async () => {
      const { result } = await asViewer(async () => {
        return await requireAuth();
      });

      expect(result).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("throws different error messages for missing auth vs insufficient role", async () => {
      // Missing auth
      let error1: Error | null = null;
      try {
        await asUnauthenticated(async () => {
          return await requireAuth("VIEWER");
        });
      } catch (e) {
        error1 = e as Error;
      }

      // Insufficient role
      let error2: Error | null = null;
      try {
        await asViewer(async () => {
          return await requireAuth("ADMIN");
        });
      } catch (e) {
        error2 = e as Error;
      }

      expect(error1).toBeInstanceOf(Error);
      expect(error2).toBeInstanceOf(Error);
      expect(error1!.message).not.toBe(error2!.message);
      expect(error1!.message).toMatch(/notAuthenticated|log in/i);
      expect(error2!.message).toMatch(/Requires ADMIN role/);
    });
  });
});
