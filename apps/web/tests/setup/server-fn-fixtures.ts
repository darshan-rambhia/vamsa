/**
 * Test user fixtures for server function testing
 *
 * Provides pre-configured mock users for different roles and scenarios.
 * Use with `withServerContext().asUser()` or role shortcuts.
 */

/**
 * User role enum matching the application's role system
 */
export type MockUserRole = "VIEWER" | "MEMBER" | "ADMIN";

/**
 * Mock user structure matching what `betterAuthGetSessionWithUserFromCookie` returns
 * and what `requireAuth` expects
 */
export interface MockAuthUser {
  id: string;
  email: string;
  name: string;
  role: MockUserRole;
  personId: string | null;
  mustChangePassword: boolean;
  oidcProvider: string | null;
  profileClaimStatus: "PENDING" | "CLAIMED" | "SKIPPED";
}

/**
 * Pre-configured test users for common scenarios
 */
export const testUsers = {
  /**
   * Basic viewer user - can view but not modify
   */
  viewer: {
    id: "test-viewer-001",
    email: "viewer@test.com",
    name: "Test Viewer",
    role: "VIEWER" as const,
    personId: null,
    mustChangePassword: false,
    oidcProvider: null,
    profileClaimStatus: "PENDING" as const,
  },

  /**
   * Member user - can modify their own data
   */
  member: {
    id: "test-member-001",
    email: "member@test.com",
    name: "Test Member",
    role: "MEMBER" as const,
    personId: "person-001",
    mustChangePassword: false,
    oidcProvider: null,
    profileClaimStatus: "CLAIMED" as const,
  },

  /**
   * Admin user - full access
   */
  admin: {
    id: "test-admin-001",
    email: "admin@test.com",
    name: "Test Admin",
    role: "ADMIN" as const,
    personId: "person-002",
    mustChangePassword: false,
    oidcProvider: null,
    profileClaimStatus: "CLAIMED" as const,
  },

  /**
   * OIDC user with pending profile claim
   */
  oidcPending: {
    id: "test-oidc-001",
    email: "oidc@test.com",
    name: "OIDC User",
    role: "VIEWER" as const,
    personId: null,
    mustChangePassword: false,
    oidcProvider: "google",
    profileClaimStatus: "PENDING" as const,
  },

  /**
   * OIDC user who has claimed a profile
   */
  oidcClaimed: {
    id: "test-oidc-002",
    email: "oidc-claimed@test.com",
    name: "OIDC Claimed User",
    role: "MEMBER" as const,
    personId: "person-003",
    mustChangePassword: false,
    oidcProvider: "google",
    profileClaimStatus: "CLAIMED" as const,
  },

  /**
   * User who must change password (first login)
   */
  mustChangePassword: {
    id: "test-change-pwd-001",
    email: "change-pwd@test.com",
    name: "Must Change Password User",
    role: "VIEWER" as const,
    personId: null,
    mustChangePassword: true,
    oidcProvider: null,
    profileClaimStatus: "PENDING" as const,
  },
} as const satisfies Record<string, MockAuthUser>;

/**
 * Create a custom mock user with overrides
 */
export function createMockUser(
  base: MockAuthUser,
  overrides: Partial<MockAuthUser>
): MockAuthUser {
  return { ...base, ...overrides };
}
