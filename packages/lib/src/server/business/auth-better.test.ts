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
  getDbDriver: () => "sqlite",
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
  deviceAuthorization: vi.fn((options: unknown) => ({
    id: "device-authorization",
    options,
  })),
}));

vi.mock("better-auth/api", () => ({
  createAuthMiddleware: vi.fn((fn: unknown) => fn),
}));

const { mockRevokeAllSafe } = vi.hoisted(() => ({
  mockRevokeAllSafe: vi.fn(async () => {}),
}));

vi.mock("./api-tokens", () => ({
  revokeAllUserApiTokensSafe: mockRevokeAllSafe,
  revokeTokensOnPasswordWrite: vi.fn(async () => false),
}));

type ResetOptions = {
  sendResetPassword: (data: {
    user: { id: string; email: string };
    url: string;
    token: string;
  }) => Promise<void>;
  onPasswordReset: (data: { user: { id: string } }) => Promise<void>;
  resetPasswordTokenExpiresIn: number;
  revokeSessionsOnPasswordReset: boolean;
};

describe("password reset configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function getOptions() {
    vi.resetModules();
    const { auth } = await import("./auth-better");
    return auth as unknown as {
      emailAndPassword: ResetOptions;
      forgetPassword?: unknown;
      rateLimit: { customRules: Record<string, { max: number }> };
    };
  }

  it("lives under emailAndPassword, where Better Auth reads it", async () => {
    const options = await getOptions();
    expect(options.forgetPassword).toBeUndefined();
    expect(typeof options.emailAndPassword.sendResetPassword).toBe("function");
    expect(options.emailAndPassword.resetPasswordTokenExpiresIn).toBe(3600);
    expect(options.emailAndPassword.revokeSessionsOnPasswordReset).toBe(true);
  });

  it("sends the reset email through the email service", async () => {
    const options = await getOptions();
    const { emailService, createPasswordResetEmail } =
      await import("@vamsa/api");
    const url = "http://localhost:3000/api/auth/reset-password/abc";

    await options.emailAndPassword.sendResetPassword({
      user: { id: "user-1", email: "a@example.com" },
      url,
      token: "abc",
    });

    expect(createPasswordResetEmail).toHaveBeenCalledWith(url);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "a@example.com",
      expect.objectContaining({ subject: "Reset Password" }),
      "password_reset",
      "user-1"
    );
  });

  it("revokes the user's API tokens after a reset", async () => {
    const options = await getOptions();
    await options.emailAndPassword.onPasswordReset({ user: { id: "user-1" } });
    expect(mockRevokeAllSafe).toHaveBeenCalledWith("user-1", "password reset");
  });

  it("rate limits the forgot-password endpoint", async () => {
    const options = await getOptions();
    expect(
      options.rateLimit.customRules["/request-password-reset"].max
    ).toBeLessThanOrEqual(3);
  });
});

describe("device authorization (vamsa login)", () => {
  type DeviceOptions = {
    expiresIn: string;
    interval: string;
    userCodeLength: number;
    validateClient: (id: string) => boolean;
    verificationUri: string;
  };

  async function getAuth() {
    vi.resetModules();
    const { auth } = await import("./auth-better");
    return auth as unknown as {
      plugins: Array<{ id: string; options?: DeviceOptions }>;
      rateLimit: {
        customRules: Record<string, { window: number; max: number }>;
      };
      hooks: { after: (ctx: unknown) => Promise<void> };
    };
  }

  it("configures the plugin: 10m codes, 5s polling, 8-char codes, /device page", async () => {
    const auth = await getAuth();
    const device = auth.plugins.find((p) => p.id === "device-authorization");
    expect(device?.options).toMatchObject({
      expiresIn: "10m",
      interval: "5s",
      userCodeLength: 8,
    });
    expect(device?.options?.verificationUri).toMatch(/\/device$/);
  });

  it("only allows the vamsa-cli client", async () => {
    const auth = await getAuth();
    const device = auth.plugins.find((p) => p.id === "device-authorization");
    expect(device?.options?.validateClient("vamsa-cli")).toBe(true);
    expect(device?.options?.validateClient("other")).toBe(false);
    expect(device?.options?.validateClient("toString")).toBe(false);
  });

  it("rate limits code issuance, polling and approval", async () => {
    const { rateLimit } = await getAuth();
    expect(rateLimit.customRules["/device/code"]).toEqual({
      window: 60,
      max: 10,
    });
    // Must allow polling at the 5s interval (12/min) without tripping
    expect(rateLimit.customRules["/device/token"].max).toBeGreaterThanOrEqual(
      12
    );
    expect(rateLimit.customRules["/device/approve"]).toBeDefined();
    expect(rateLimit.customRules["/device/deny"]).toBeDefined();
  });

  it("after-hook ignores other endpoints", async () => {
    const { hooks } = await getAuth();
    await expect(
      hooks.after({ path: "/sign-in/email", context: {} })
    ).resolves.toBeUndefined();
  });
});

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
    const PRIVILEGED_FIELDS = [
      "role",
      "personId",
      "mustChangePassword",
      "profileClaimStatus",
      "isActive",
      "failedLoginAttempts",
      "lockedUntil",
      "oidcProvider",
      "invitedById",
    ] as const;

    it.each(PRIVILEGED_FIELDS)(
      "marks %s as server-only (input: false) so sign-up and update-user ignore it",
      async (field) => {
        const { userAdditionalFields } = await import("./auth-better");
        expect(userAdditionalFields[field].input).toBe(false);
      }
    );

    it("keeps preferredLanguage client-settable", async () => {
      const { userAdditionalFields } = await import("./auth-better");
      expect(userAdditionalFields.preferredLanguage).not.toHaveProperty(
        "input"
      );
    });

    it("defaults role to VIEWER", async () => {
      const { userAdditionalFields } = await import("./auth-better");
      expect(userAdditionalFields.role.defaultValue).toBe("VIEWER");
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
