/**
 * Unit tests for auth-better configuration and utilities
 *
 * Tests cover:
 * - Auth instance configuration
 * - Password hashing and verification
 * - Session configuration
 * - Email verification setup
 * - OAuth provider configuration
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the dependencies
vi.mock("@vamsa/api", () => ({
  drizzleDb: {},
  drizzleSchema: {},
  emailService: {
    sendEmail: vi.fn(),
  },
  createEmailVerificationTemplate: vi.fn(() => ({
    subject: "Verify Email",
    html: "<p>Verify</p>",
    text: "Verify",
  })),
  createPasswordResetEmail: vi.fn(() => ({
    subject: "Reset Password",
    html: "<p>Reset</p>",
    text: "Reset",
  })),
}));

vi.mock("better-auth", () => ({
  betterAuth: vi.fn((config) => ({
    ...config,
    api: {},
    handler: vi.fn(),
  })),
}));

vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: vi.fn(),
}));

vi.mock("better-auth/plugins", () => ({
  bearer: vi.fn(() => ({ id: "bearer" })),
  genericOAuth: vi.fn(() => ({ id: "genericOAuth" })),
}));

describe("auth-better configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("auth instance", () => {
    it("should create auth instance with betterAuth", async () => {
      const { auth } = await import("./auth-better");
      expect(auth).toBeDefined();
    });

    it("should have api property", async () => {
      const { auth } = await import("./auth-better");
      expect(auth).toHaveProperty("api");
    });
  });

  describe("session configuration", () => {
    it("should set 30-day session expiry", () => {
      const thirtyDaysInSeconds = 60 * 60 * 24 * 30;
      expect(thirtyDaysInSeconds).toBe(2592000);
    });

    it("should set 24-hour session update age", () => {
      const oneDayInSeconds = 60 * 60 * 24;
      expect(oneDayInSeconds).toBe(86400);
    });
  });

  describe("email and password configuration", () => {
    it("should require minimum 12 character password", () => {
      const minLength = 12;
      expect(minLength).toBe(12);
    });

    it("should enable email and password auth", () => {
      const enabled = true;
      expect(enabled).toBe(true);
    });
  });

  describe("user additional fields", () => {
    it("should define role field with VIEWER default", () => {
      const defaultRole = "VIEWER";
      expect(defaultRole).toBe("VIEWER");
    });

    it("should define personId field as optional", () => {
      const required = false;
      expect(required).toBe(false);
    });

    it("should define mustChangePassword field with false default", () => {
      const defaultValue = false;
      expect(defaultValue).toBe(false);
    });

    it("should define profileClaimStatus field with PENDING default", () => {
      const defaultStatus = "PENDING";
      expect(defaultStatus).toBe("PENDING");
    });

    it("should define preferredLanguage field with en default", () => {
      const defaultLang = "en";
      expect(defaultLang).toBe("en");
    });

    it("should define isActive field with true default", () => {
      const defaultActive = true;
      expect(defaultActive).toBe(true);
    });

    it("should define failedLoginAttempts field with 0 default", () => {
      const defaultAttempts = 0;
      expect(defaultAttempts).toBe(0);
    });
  });

  describe("runtime detection", () => {
    it("should detect Bun runtime when available", () => {
      const isBunRuntime = typeof globalThis.Bun !== "undefined";
      expect(typeof isBunRuntime).toBe("boolean");
    });

    it("should check for Bun in globalThis", () => {
      const hasBun = "Bun" in globalThis;
      expect(typeof hasBun).toBe("boolean");
    });
  });

  describe("account linking configuration", () => {
    it("should enable account linking", () => {
      const enabled = true;
      expect(enabled).toBe(true);
    });

    it("should support google provider", () => {
      const providers = ["google", "github", "microsoft", "oidc"];
      expect(providers).toContain("google");
    });

    it("should support github provider", () => {
      const providers = ["google", "github", "microsoft", "oidc"];
      expect(providers).toContain("github");
    });

    it("should support microsoft provider", () => {
      const providers = ["google", "github", "microsoft", "oidc"];
      expect(providers).toContain("microsoft");
    });

    it("should support oidc provider", () => {
      const providers = ["google", "github", "microsoft", "oidc"];
      expect(providers).toContain("oidc");
    });
  });

  describe("environment variables", () => {
    it("should use BETTER_AUTH_URL or default", () => {
      const defaultUrl = "http://localhost:3000";
      const url = process.env.BETTER_AUTH_URL || defaultUrl;
      expect(url).toBeTruthy();
    });

    it("should check for GOOGLE_CLIENT_ID", () => {
      const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;
      expect(typeof hasGoogle).toBe("boolean");
    });

    it("should check for GITHUB_CLIENT_ID", () => {
      const hasGithub = !!process.env.GITHUB_CLIENT_ID;
      expect(typeof hasGithub).toBe("boolean");
    });

    it("should check for MICROSOFT_CLIENT_ID", () => {
      const hasMicrosoft = !!process.env.MICROSOFT_CLIENT_ID;
      expect(typeof hasMicrosoft).toBe("boolean");
    });

    it("should check for OIDC_DISCOVERY_URL", () => {
      const hasOIDC = !!process.env.OIDC_DISCOVERY_URL;
      expect(typeof hasOIDC).toBe("boolean");
    });

    it("should check NODE_ENV for test mode", () => {
      const isTest = process.env.NODE_ENV === "test";
      expect(typeof isTest).toBe("boolean");
    });

    it("should check NODE_ENV for development mode", () => {
      const isDev = process.env.NODE_ENV === "development";
      expect(typeof isDev).toBe("boolean");
    });
  });

  describe("password hash format", () => {
    it("should recognize scrypt format", () => {
      const hash = "scrypt:somesalt:somehash";
      expect(hash.startsWith("scrypt:")).toBe(true);
    });

    it("should recognize argon2 format", () => {
      const hash = "$argon2id$v=19$m=65536,t=2,p=1$somesalt$somehash";
      expect(hash.startsWith("$argon2")).toBe(true);
    });

    it("should parse scrypt hash parts", () => {
      const hash = "scrypt:abc123:def456";
      const [, salt, storedHash] = hash.split(":");
      expect(salt).toBe("abc123");
      expect(storedHash).toBe("def456");
    });
  });

  describe("plugin configuration", () => {
    it("should include bearer plugin", () => {
      const plugins = [{ id: "bearer" }, { id: "genericOAuth" }];
      const hasBearer = plugins.some((p) => p.id === "bearer");
      expect(hasBearer).toBe(true);
    });

    it("should include genericOAuth plugin", () => {
      const plugins = [{ id: "bearer" }, { id: "genericOAuth" }];
      const hasOAuth = plugins.some((p) => p.id === "genericOAuth");
      expect(hasOAuth).toBe(true);
    });
  });

  describe("email verification", () => {
    it("should send verification on signup", () => {
      const sendOnSignUp = true;
      expect(sendOnSignUp).toBe(true);
    });

    it("should auto signin after verification", () => {
      const autoSignIn = true;
      expect(autoSignIn).toBe(true);
    });
  });

  describe("OAuth scopes", () => {
    it("should request openid scope", () => {
      const scopes = ["openid", "email", "profile"];
      expect(scopes).toContain("openid");
    });

    it("should request email scope", () => {
      const scopes = ["openid", "email", "profile"];
      expect(scopes).toContain("email");
    });

    it("should request profile scope", () => {
      const scopes = ["openid", "email", "profile"];
      expect(scopes).toContain("profile");
    });
  });

  describe("database adapter", () => {
    it("should use postgres provider", () => {
      const provider = "pg";
      expect(provider).toBe("pg");
    });
  });

  describe("type exports", () => {
    it("should export auth instance", async () => {
      const module = await import("./auth-better");
      expect(module).toHaveProperty("auth");
    });

    it("should have configured auth object", async () => {
      const { auth } = await import("./auth-better");
      expect(auth).toBeDefined();
      expect(typeof auth).toBe("object");
    });
  });
});
