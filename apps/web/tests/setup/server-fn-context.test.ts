/**
 * Tests for server function context utility
 *
 * Verifies the stub-based withStubbedServerContext works correctly
 * for testing TanStack Start server function handlers.
 */

import { describe, it, expect } from "bun:test";
import {
  withStubbedServerContext,
  asAdmin,
  asMember,
  asViewer,
  asUnauthenticated,
  testUsers,
  createMockUser,
  getStubbedCookie,
  setStubbedCookie,
  getStubbedHeaders,
  getStubbedSession,
  deleteStubbedCookie,
} from "./server-fn-context";

describe("withStubbedServerContext", () => {
  describe("basic usage", () => {
    it("executes handler and returns result", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.admin },
        () => "hello"
      );

      expect(result).toBe("hello");
    });

    it("handles async handlers", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.admin },
        async () => {
          await new Promise((r) => setTimeout(r, 10));
          return "async result";
        }
      );

      expect(result).toBe("async result");
    });

    it("propagates errors", async () => {
      await expect(
        withStubbedServerContext({ user: testUsers.admin }, () => {
          throw new Error("Test error");
        })
      ).rejects.toThrow("Test error");
    });
  });

  describe("cookie stubs", () => {
    it("provides stubbed cookies via getStubbedCookie", async () => {
      await withStubbedServerContext(
        { cookies: { "my-cookie": "my-value" } },
        () => {
          expect(getStubbedCookie("my-cookie")).toBe("my-value");
        }
      );
    });

    it("returns undefined for non-existent cookies", async () => {
      await withStubbedServerContext({ cookies: { other: "value" } }, () => {
        expect(getStubbedCookie("missing")).toBeUndefined();
      });
    });

    it("adds session cookie when user is provided", async () => {
      await withStubbedServerContext({ user: testUsers.admin }, () => {
        const cookie = getStubbedCookie("better-auth.session_token");
        expect(cookie).toBe(`stub-session-${testUsers.admin.id}`);
      });
    });
  });

  describe("header stubs", () => {
    it("provides stubbed headers via getStubbedHeaders", async () => {
      await withStubbedServerContext(
        {
          headers: {
            "content-type": "application/json",
            authorization: "Bearer token123",
          },
        },
        () => {
          const headers = getStubbedHeaders();
          expect(headers?.["content-type"]).toBe("application/json");
          expect(headers?.["authorization"]).toBe("Bearer token123");
        }
      );
    });
  });

  describe("user stubs", () => {
    it("provides user via getStubbedSession", async () => {
      await withStubbedServerContext({ user: testUsers.admin }, async () => {
        const user = await getStubbedSession();
        expect(user).toEqual(testUsers.admin);
      });
    });

    it("returns null when no user provided", async () => {
      await withStubbedServerContext({}, async () => {
        const user = await getStubbedSession();
        expect(user).toBeNull();
      });
    });

    it("supports custom user with createMockUser", async () => {
      const customUser = createMockUser(testUsers.viewer, {
        id: "custom-id",
        email: "custom@test.com",
      });

      await withStubbedServerContext({ user: customUser }, async () => {
        const user = await getStubbedSession();
        expect(user?.id).toBe("custom-id");
        expect(user?.email).toBe("custom@test.com");
        expect(user?.role).toBe("VIEWER");
      });
    });
  });

  describe("response collection", () => {
    it("collects cookies set during execution", async () => {
      const { response } = await withStubbedServerContext(
        { user: testUsers.admin },
        () => {
          setStubbedCookie("session", "abc123", { httpOnly: true });
          setStubbedCookie("preference", "dark");
        }
      );

      expect(response.cookies.get("session")).toEqual({
        value: "abc123",
        options: { httpOnly: true },
      });
      expect(response.cookies.get("preference")).toEqual({
        value: "dark",
        options: undefined,
      });
    });

    it("tracks deleted cookies as null", async () => {
      const { response } = await withStubbedServerContext({}, () => {
        deleteStubbedCookie("to-delete");
      });

      expect(response.cookies.get("to-delete")).toBeNull();
    });
  });

  describe("context isolation", () => {
    it("isolates context between calls", async () => {
      // First call
      await withStubbedServerContext(
        { user: testUsers.admin, cookies: { first: "value1" } },
        async () => {
          expect((await getStubbedSession())?.role).toBe("ADMIN");
          expect(getStubbedCookie("first")).toBe("value1");
        }
      );

      // Second call - should not see first's context
      await withStubbedServerContext(
        { user: testUsers.viewer, cookies: { second: "value2" } },
        async () => {
          expect((await getStubbedSession())?.role).toBe("VIEWER");
          expect(getStubbedCookie("first")).toBeUndefined();
          expect(getStubbedCookie("second")).toBe("value2");
        }
      );
    });

    it("supports nested calls with proper isolation", async () => {
      await withStubbedServerContext(
        { user: testUsers.admin, cookies: { outer: "outer-value" } },
        async () => {
          expect((await getStubbedSession())?.role).toBe("ADMIN");
          expect(getStubbedCookie("outer")).toBe("outer-value");

          // Nested call
          await withStubbedServerContext(
            { user: testUsers.viewer, cookies: { inner: "inner-value" } },
            async () => {
              expect((await getStubbedSession())?.role).toBe("VIEWER");
              expect(getStubbedCookie("inner")).toBe("inner-value");
              expect(getStubbedCookie("outer")).toBeUndefined();
            }
          );

          // Outer context restored
          expect((await getStubbedSession())?.role).toBe("ADMIN");
          expect(getStubbedCookie("outer")).toBe("outer-value");
        }
      );
    });

    it("restores context even on error", async () => {
      await withStubbedServerContext({ user: testUsers.admin }, async () => {
        try {
          await withStubbedServerContext({ user: testUsers.viewer }, () => {
            throw new Error("Inner error");
          });
        } catch {
          // Expected
        }

        // Outer context should still work
        expect((await getStubbedSession())?.role).toBe("ADMIN");
      });
    });
  });
});

describe("convenience shortcuts", () => {
  it("asAdmin sets up admin user", async () => {
    const { result } = await asAdmin(async () => {
      const user = await getStubbedSession();
      return user?.role;
    });

    expect(result).toBe("ADMIN");
  });

  it("asMember sets up member user", async () => {
    const { result } = await asMember(async () => {
      const user = await getStubbedSession();
      return user?.role;
    });

    expect(result).toBe("MEMBER");
  });

  it("asViewer sets up viewer user", async () => {
    const { result } = await asViewer(async () => {
      const user = await getStubbedSession();
      return user?.role;
    });

    expect(result).toBe("VIEWER");
  });

  it("asUnauthenticated sets up no user", async () => {
    const { result } = await asUnauthenticated(async () => {
      return await getStubbedSession();
    });

    expect(result).toBeNull();
  });

  it("shortcuts support overrides", async () => {
    const { result } = await asViewer(
      async () => {
        const user = await getStubbedSession();
        return user?.email;
      },
      { email: "custom@test.com" }
    );

    expect(result).toBe("custom@test.com");
  });
});

describe("testUsers fixtures", () => {
  it("has correct viewer properties", () => {
    expect(testUsers.viewer.role).toBe("VIEWER");
    expect(testUsers.viewer.personId).toBeNull();
    expect(testUsers.viewer.oidcProvider).toBeNull();
  });

  it("has correct member properties", () => {
    expect(testUsers.member.role).toBe("MEMBER");
    expect(testUsers.member.personId).toBeTruthy();
    expect(testUsers.member.profileClaimStatus).toBe("CLAIMED");
  });

  it("has correct admin properties", () => {
    expect(testUsers.admin.role).toBe("ADMIN");
    expect(testUsers.admin.personId).toBeTruthy();
  });

  it("has correct oidcPending properties", () => {
    expect(testUsers.oidcPending.oidcProvider).toBe("google");
    expect(testUsers.oidcPending.profileClaimStatus).toBe("PENDING");
    expect(testUsers.oidcPending.personId).toBeNull();
  });

  it("has correct oidcClaimed properties", () => {
    expect(testUsers.oidcClaimed.oidcProvider).toBe("google");
    expect(testUsers.oidcClaimed.profileClaimStatus).toBe("CLAIMED");
    expect(testUsers.oidcClaimed.personId).toBeTruthy();
    expect(testUsers.oidcClaimed.role).toBe("MEMBER");
  });
});

describe("createMockUser helper", () => {
  it("creates user with overrides", () => {
    const user = createMockUser(testUsers.viewer, {
      id: "custom-id",
      email: "custom@test.com",
    });

    expect(user.id).toBe("custom-id");
    expect(user.email).toBe("custom@test.com");
    expect(user.role).toBe("VIEWER");
    expect(user.name).toBe(testUsers.viewer.name);
  });

  it("can change role", () => {
    const user = createMockUser(testUsers.viewer, { role: "ADMIN" });
    expect(user.role).toBe("ADMIN");
  });
});

