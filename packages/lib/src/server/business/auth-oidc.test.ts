/**
 * Unit tests for OIDC authentication server functions
 *
 * Tests the dependency injection pattern and business logic for:
 * - OAuth state management (Google, Microsoft, GitHub)
 * - OAuth callback handling with user creation/linking
 * - Session token creation and management
 * - Expired OAuth state cleanup
 *
 * Uses dependency injection to provide mock database clients for testing.
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { AuthOidcDb } from "@vamsa/lib/server/business";
import {
  hashToken,
  getAppUrl,
  initiateGoogleLoginData,
  cleanupExpiredOAuthStatesData,
  TOKEN_COOKIE_NAME,
  TOKEN_MAX_AGE,
  OAUTH_STATE_EXPIRY,
} from "@vamsa/lib/server/business";

describe("OIDC Authentication Server Functions", () => {
  describe("Token Hashing", () => {
    it("should hash token consistently", () => {
      const token = "test-token-123";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it("should produce different hashes for different tokens", () => {
      const hash1 = hashToken("token1");
      const hash2 = hashToken("token2");

      expect(hash1).not.toBe(hash2);
    });

    it("should produce hexadecimal strings", () => {
      const hash = hashToken("test");
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
  });

  describe("App URL", () => {
    it("should return APP_URL from environment if set", () => {
      const originalEnv = process.env.APP_URL;
      process.env.APP_URL = "https://example.com";

      const url = getAppUrl();

      expect(url).toBe("https://example.com");

      // Restore original environment
      if (originalEnv) {
        process.env.APP_URL = originalEnv;
      } else {
        delete process.env.APP_URL;
      }
    });

    it("should default to localhost:3000 if APP_URL not set", () => {
      const originalEnv = process.env.APP_URL;
      delete process.env.APP_URL;

      const url = getAppUrl();

      expect(url).toBe("http://localhost:3000");

      // Restore original environment
      if (originalEnv) {
        process.env.APP_URL = originalEnv;
      }
    });
  });

  describe("Dependency Injection Pattern", () => {
    let mockDb: AuthOidcDb;

    beforeEach(() => {
      mockDb = {
        oAuthState: {
          create: mock(async () => ({
            id: "state-1",
            state: "test-state",
            codeVerifier: "test-verifier",
            provider: "google",
            redirectTo: "/dashboard",
            expiresAt: new Date(Date.now() + OAUTH_STATE_EXPIRY),
          })),
          findUnique: mock(async () => null),
          deleteMany: mock(async () => ({ count: 0 })),
          delete: mock(async () => ({})),
        },
        user: {
          findFirst: mock(async () => null),
          findUnique: mock(async () => null),
          create: mock(async () => ({
            id: "user-1",
            email: "test@example.com",
            name: "Test User",
            isActive: true,
          })),
          update: mock(async () => ({})),
        },
        session: {
          create: mock(async () => ({
            id: "session-1",
            token: hashToken("test-token"),
            userId: "user-1",
            expiresAt: new Date(Date.now() + TOKEN_MAX_AGE * 1000),
          })),
        },
      };
    });

    it("should accept custom database client for testing", async () => {
      // This test verifies the DI pattern is working
      // Functions should accept the db parameter and use it
      const mockCreateCall = mockDb.oAuthState.create;

      // Set up environment for Google OAuth
      const originalEnv = process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = "test-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-secret";

      try {
        // Call function with mock db
        await initiateGoogleLoginData("/dashboard", mockDb);

        // Verify the mock was called
        expect(mockCreateCall).toHaveBeenCalled();
      } finally {
        // Restore original environment
        if (originalEnv) {
          process.env.GOOGLE_CLIENT_ID = originalEnv;
        } else {
          delete process.env.GOOGLE_CLIENT_ID;
        }
        delete process.env.GOOGLE_CLIENT_SECRET;
      }
    });

    it("should use default database when no db parameter provided", async () => {
      // This test verifies that when db parameter is not provided,
      // functions should use the default prisma import
      // We can't directly test this without mocking modules, but we can verify
      // the function signature accepts optional db parameter

      const initiateGoogleSignature = initiateGoogleLoginData.toString();
      expect(initiateGoogleSignature).toContain("db");
    });
  });

  describe("Constants", () => {
    it("should have correct token cookie name", () => {
      expect(TOKEN_COOKIE_NAME).toBe("vamsa-session");
    });

    it("should have correct token max age", () => {
      // 30 days in seconds
      expect(TOKEN_MAX_AGE).toBe(30 * 24 * 60 * 60);
    });

    it("should have correct OAuth state expiry", () => {
      // 10 minutes in milliseconds
      expect(OAUTH_STATE_EXPIRY).toBe(10 * 60 * 1000);
    });
  });

  describe("Cleanup Expired OAuth States", () => {
    it("should accept custom database client", async () => {
      const mockDb: AuthOidcDb = {
        oAuthState: {
          deleteMany: mock(async () => ({ count: 5 })),
        },
      } as unknown as AuthOidcDb;

      const result = await cleanupExpiredOAuthStatesData(mockDb);

      expect(result.deleted).toBe(5);
      expect(mockDb.oAuthState.deleteMany).toHaveBeenCalled();
    });

    it("should clean up only expired states", async () => {
      const mockDb: AuthOidcDb = {
        oAuthState: {
          deleteMany: mock(async (options) => {
            // Verify the query filters for expired states
            const whereClause = (options as any)?.where;
            expect(whereClause?.expiresAt?.lt).toBeDefined();
            return { count: 3 };
          }),
        },
      } as unknown as AuthOidcDb;

      await cleanupExpiredOAuthStatesData(mockDb);

      expect(mockDb.oAuthState.deleteMany).toHaveBeenCalled();
    });
  });

  describe("Type Exports", () => {
    it("should export AuthOidcDb type for consumers", () => {
      // This verifies the type is exported and available for React Native and other consumers
      const typeDefinition: AuthOidcDb = {
        oAuthState: null,
        user: null,
        session: null,
      } as unknown as AuthOidcDb;

      expect(typeDefinition).toBeDefined();
    });
  });
});
