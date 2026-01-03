import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock dependencies BEFORE importing auth-options
const mockBcryptCompare = mock(async (password: string, hash: string) =>
  password === "validpassword"
);

const mockDbUser = {
  findUnique: mock(async ({ where }: any) => {
    if (where.email === "admin@example.com") {
      return {
        id: "user-1",
        email: "admin@example.com",
        name: "Admin User",
        passwordHash: "$2a$10$hashedpassword",
        isActive: true,
        role: "ADMIN",
        personId: null,
        mustChangePassword: false,
      };
    }
    return null;
  }),
  update: mock(async () => ({ id: "user-1" })),
};

const mockDb = {
  user: mockDbUser,
};

// Mock the OIDC provider factory
const mockOIDCProvider = mock((config: any) => ({
  id: config.id,
  name: config.name,
  type: config.type,
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  wellKnown: config.wellKnown,
  idToken: config.idToken,
  checks: config.checks,
  authorization: config.authorization,
  profile: config.profile,
}));

// Mock modules
mock.module("bcryptjs", () => ({
  default: { compare: mockBcryptCompare },
  compare: mockBcryptCompare,
}));

mock.module("./db", () => ({
  db: mockDb,
}));

mock.module("next-auth/providers/oauth", () => ({
  default: mockOIDCProvider,
}));

// NOW import after mocks are set up
const { authOptions, authorizeUser, buildOIDCProvider } = await import(
  "./auth-options"
);

describe("authOptions", () => {
  beforeEach(() => {
    mockBcryptCompare.mockClear();
    mockDbUser.findUnique.mockClear();
    mockDbUser.update.mockClear();
  });

  describe("configuration", () => {
    it("exports authOptions object", () => {
      expect(authOptions).toBeDefined();
    });

    it("has adapter configured", () => {
      expect(authOptions.adapter).toBeDefined();
    });

    it("has providers array", () => {
      expect(authOptions.providers).toBeDefined();
      expect(Array.isArray(authOptions.providers)).toBe(true);
      expect(authOptions.providers.length).toBeGreaterThan(0);
    });

    it("has credentials provider as first provider", () => {
      const credentialsProvider = authOptions.providers?.[0];
      expect(credentialsProvider).toBeDefined();
      expect(credentialsProvider?.name).toBe("Credentials");
    });

    it("has authorize function on credentials provider", () => {
      const credentialsProvider = authOptions.providers?.[0];
      expect(typeof credentialsProvider?.authorize).toBe("function");
    });

    it("has session configuration with JWT strategy", () => {
      expect(authOptions.session).toBeDefined();
      expect(authOptions.session?.strategy).toBe("jwt");
    });

    it("sets session maxAge to 30 days in seconds", () => {
      const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
      expect(authOptions.session?.maxAge).toBe(thirtyDaysInSeconds);
    });

    it("has pages configuration", () => {
      expect(authOptions.pages).toBeDefined();
      expect(authOptions.pages?.signIn).toBe("/login");
      expect(authOptions.pages?.error).toBe("/login");
    });

    it("has callbacks configured", () => {
      expect(authOptions.callbacks).toBeDefined();
      expect(typeof authOptions.callbacks?.jwt).toBe("function");
      expect(typeof authOptions.callbacks?.session).toBe("function");
    });
  });

  describe("authorizeUser function", () => {
    it("throws error when email is missing", async () => {
      let errorThrown = false;
      let errorMessage = "";
      try {
        await authorizeUser({ password: "password" });
      } catch (error) {
        errorThrown = true;
        errorMessage = (error as Error).message;
      }
      expect(errorThrown).toBe(true);
      expect(errorMessage).toBe("Email and password are required");
    });

    it("throws error when password is missing", async () => {
      let errorThrown = false;
      let errorMessage = "";
      try {
        await authorizeUser({ email: "admin@example.com" });
      } catch (error) {
        errorThrown = true;
        errorMessage = (error as Error).message;
      }
      expect(errorThrown).toBe(true);
      expect(errorMessage).toBe("Email and password are required");
    });

    it("throws error when user not found", async () => {
      let errorThrown = false;
      let errorMessage = "";
      try {
        await authorizeUser({
          email: "nonexistent@example.com",
          password: "password"
        });
      } catch (error) {
        errorThrown = true;
        errorMessage = (error as Error).message;
      }
      expect(errorThrown).toBe(true);
      expect(errorMessage).toBe("Invalid email or password");
    });

    it("lowercases email before database lookup", async () => {
      mockBcryptCompare.mockResolvedValue(true);
      mockDbUser.findUnique.mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        name: "Admin User",
        passwordHash: "$2a$10$hashedpassword",
        isActive: true,
        role: "ADMIN",
        personId: null,
        mustChangePassword: false,
      });

      await authorizeUser({
        email: "ADMIN@EXAMPLE.COM",
        password: "validpassword",
      });

      const callArgs = mockDbUser.findUnique.mock.calls[0];
      expect(callArgs[0].where.email).toBe("admin@example.com");
    });

    it("throws error when user has no password hash", async () => {
      mockDbUser.findUnique.mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        name: "Admin User",
        passwordHash: null,
        isActive: true,
        role: "ADMIN",
        personId: null,
        mustChangePassword: false,
      });

      let errorThrown = false;
      let errorMessage = "";
      try {
        await authorizeUser({
          email: "admin@example.com",
          password: "password",
        });
      } catch (error) {
        errorThrown = true;
        errorMessage = (error as Error).message;
      }
      expect(errorThrown).toBe(true);
      expect(errorMessage).toBe("Invalid email or password");
    });

    it("throws error when account is inactive", async () => {
      mockDbUser.findUnique.mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        name: "Admin User",
        passwordHash: "$2a$10$hashedpassword",
        isActive: false,
        role: "ADMIN",
        personId: null,
        mustChangePassword: false,
      });

      let errorThrown = false;
      let errorMessage = "";
      try {
        await authorizeUser({
          email: "admin@example.com",
          password: "validpassword",
        });
      } catch (error) {
        errorThrown = true;
        errorMessage = (error as Error).message;
      }
      expect(errorThrown).toBe(true);
      expect(errorMessage).toBe("Account is disabled");
    });

    it("throws error when password is invalid", async () => {
      mockBcryptCompare.mockResolvedValue(false);
      mockDbUser.findUnique.mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        name: "Admin User",
        passwordHash: "$2a$10$hashedpassword",
        isActive: true,
        role: "ADMIN",
        personId: null,
        mustChangePassword: false,
      });

      let errorThrown = false;
      let errorMessage = "";
      try {
        await authorizeUser({
          email: "admin@example.com",
          password: "wrongpassword",
        });
      } catch (error) {
        errorThrown = true;
        errorMessage = (error as Error).message;
      }
      expect(errorThrown).toBe(true);
      expect(errorMessage).toBe("Invalid email or password");
    });

    it("updates lastLoginAt on successful authorization", async () => {
      mockBcryptCompare.mockResolvedValue(true);
      mockDbUser.findUnique.mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        name: "Admin User",
        passwordHash: "$2a$10$hashedpassword",
        isActive: true,
        role: "ADMIN",
        personId: null,
        mustChangePassword: false,
      });

      await authorizeUser({
        email: "admin@example.com",
        password: "validpassword",
      });

      expect(mockDbUser.update).toHaveBeenCalled();
      const updateCall = mockDbUser.update.mock.calls[0];
      expect(updateCall[0].where.id).toBe("user-1");
      expect(updateCall[0].data.lastLoginAt).toBeDefined();
    });

    it("returns user object with all required fields on success", async () => {
      mockBcryptCompare.mockResolvedValue(true);
      mockDbUser.findUnique.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        passwordHash: "$2a$10$hashedpassword",
        isActive: true,
        role: "MEMBER",
        personId: "person-456",
        mustChangePassword: true,
      });

      const result = await authorizeUser({
        email: "test@example.com",
        password: "validpassword",
      });

      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        role: "MEMBER",
        personId: "person-456",
        mustChangePassword: true,
      });
    });

    it("compares password using bcrypt", async () => {
      mockBcryptCompare.mockResolvedValue(true);
      mockDbUser.findUnique.mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        name: "Admin User",
        passwordHash: "$2a$10$hashedpassword",
        isActive: true,
        role: "ADMIN",
        personId: null,
        mustChangePassword: false,
      });

      await authorizeUser({
        email: "admin@example.com",
        password: "validpassword",
      });

      expect(mockBcryptCompare).toHaveBeenCalled();
      const bcryptCall = mockBcryptCompare.mock.calls[0];
      expect(bcryptCall[0]).toBe("validpassword");
      expect(bcryptCall[1]).toBe("$2a$10$hashedpassword");
    });
  });

  describe("buildOIDCProvider function", () => {
    it("returns null when OIDC_ENABLED is not set", () => {
      delete process.env.OIDC_ENABLED;
      const provider = buildOIDCProvider();
      expect(provider).toBe(null);
    });

    it("returns null when OIDC_ENABLED is false", () => {
      process.env.OIDC_ENABLED = "false";
      const provider = buildOIDCProvider();
      expect(provider).toBe(null);
    });

    it("returns provider object when OIDC_ENABLED is true", () => {
      process.env.OIDC_ENABLED = "true";
      process.env.OIDC_ISSUER = "https://oidc.example.com";
      process.env.OIDC_CLIENT_ID = "test-client-id";
      process.env.OIDC_CLIENT_SECRET = "test-client-secret";

      const provider = buildOIDCProvider();
      expect(provider).toBeDefined();
      expect(provider?.id).toBe("oidc");
    });

    it("uses OIDC_PROVIDER_NAME from environment", () => {
      process.env.OIDC_ENABLED = "true";
      process.env.OIDC_ISSUER = "https://oidc.example.com";
      process.env.OIDC_CLIENT_ID = "test-client-id";
      process.env.OIDC_CLIENT_SECRET = "test-client-secret";
      process.env.OIDC_PROVIDER_NAME = "MySSO";

      const provider = buildOIDCProvider();
      expect(provider?.name).toBe("MySSO");
    });

    it("uses default name when OIDC_PROVIDER_NAME not set", () => {
      process.env.OIDC_ENABLED = "true";
      process.env.OIDC_ISSUER = "https://oidc.example.com";
      process.env.OIDC_CLIENT_ID = "test-client-id";
      process.env.OIDC_CLIENT_SECRET = "test-client-secret";
      delete process.env.OIDC_PROVIDER_NAME;

      const provider = buildOIDCProvider();
      expect(provider?.name).toBe("SSO");
    });

    it("builds correct wellKnown URL from OIDC_ISSUER", () => {
      process.env.OIDC_ENABLED = "true";
      process.env.OIDC_ISSUER = "https://auth.example.com";
      process.env.OIDC_CLIENT_ID = "test-client-id";
      process.env.OIDC_CLIENT_SECRET = "test-client-secret";

      const provider = buildOIDCProvider();
      expect(provider?.wellKnown).toBe(
        "https://auth.example.com/.well-known/openid-configuration"
      );
    });

    it("sets correct OIDC configuration", () => {
      process.env.OIDC_ENABLED = "true";
      process.env.OIDC_ISSUER = "https://oidc.example.com";
      process.env.OIDC_CLIENT_ID = "test-client-id";
      process.env.OIDC_CLIENT_SECRET = "test-client-secret";

      const provider = buildOIDCProvider();
      expect(provider?.type).toBe("oauth");
      expect(provider?.clientId).toBe("test-client-id");
      expect(provider?.clientSecret).toBe("test-client-secret");
      expect(provider?.idToken).toBe(true);
      expect(provider?.checks).toEqual(["pkce", "state"]);
    });

    it("has profile function that returns correct user object", () => {
      process.env.OIDC_ENABLED = "true";
      process.env.OIDC_ISSUER = "https://oidc.example.com";
      process.env.OIDC_CLIENT_ID = "test-client-id";
      process.env.OIDC_CLIENT_SECRET = "test-client-secret";

      const provider = buildOIDCProvider();
      const profileResult = provider.profile({
        sub: "oidc-user-id",
        email: "user@example.com",
        name: "OIDC User",
      });

      expect(profileResult).toEqual({
        id: "oidc-user-id",
        email: "user@example.com",
        name: "OIDC User",
        role: "VIEWER",
        personId: null,
        mustChangePassword: false,
      });
    });
  });

  describe("jwt callback", () => {
    let jwtCallback: any;

    beforeEach(() => {
      jwtCallback = authOptions.callbacks?.jwt;
    });

    it("jwt callback exists and is callable", () => {
      expect(typeof jwtCallback).toBe("function");
    });

    it("jwt callback adds user properties to token on sign in", async () => {
      const token: any = {};
      const user = {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "ADMIN" as const,
        personId: "person-1",
        mustChangePassword: false,
      };
      const result = await jwtCallback({ token, user });
      expect(result.id).toBe("user-1");
      expect(result.role).toBe("ADMIN");
      expect(result.personId).toBe("person-1");
      expect(result.mustChangePassword).toBe(false);
    });

    it("jwt callback preserves token when no user provided", async () => {
      const token = { id: "user-1", role: "ADMIN" } as any;
      const result = await jwtCallback({ token, user: null });
      expect(result.id).toBe("user-1");
      expect(result.role).toBe("ADMIN");
    });

    it("jwt callback returns token object", async () => {
      const token = { test: "value" } as any;
      const result = await jwtCallback({ token, user: null });
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });

    it("jwt callback updates token role on session update", async () => {
      const token: any = {
        id: "user-1",
        role: "ADMIN",
        personId: null,
        mustChangePassword: false,
      };
      const session = { role: "MEMBER", mustChangePassword: true };
      const result = await jwtCallback({
        token,
        user: null,
        trigger: "update",
        session,
      });
      expect(result.role).toBe("MEMBER");
      expect(result.mustChangePassword).toBe(true);
    });

    it("jwt callback falls back to existing token values on partial session update", async () => {
      const token: any = {
        id: "user-1",
        role: "ADMIN",
        personId: "person-1",
        mustChangePassword: false,
      };
      const session = { role: "MEMBER" };
      const result = await jwtCallback({
        token,
        user: null,
        trigger: "update",
        session,
      });
      expect(result.role).toBe("MEMBER");
      expect(result.personId).toBe("person-1");
      expect(result.mustChangePassword).toBe(false);
    });

    it("jwt callback does not update token on signIn trigger without user", async () => {
      const token: any = { id: "user-1", role: "ADMIN" };
      const session = { role: "MEMBER" };
      const result = await jwtCallback({
        token,
        user: null,
        trigger: "signIn",
        session,
      });
      expect(result.role).toBe("ADMIN");
    });

    it("jwt callback handles all user role types", async () => {
      const roles = ["ADMIN", "MEMBER", "VIEWER"] as const;

      for (const role of roles) {
        const token: any = {};
        const user = {
          id: `user-${role}`,
          email: `user-${role}@example.com`,
          name: `Test ${role}`,
          role,
          personId: null,
          mustChangePassword: false,
        };
        const result = await jwtCallback({ token, user });
        expect(result.role).toBe(role);
      }
    });
  });

  describe("session callback", () => {
    let sessionCallback: any;

    beforeEach(() => {
      sessionCallback = authOptions.callbacks?.session;
    });

    it("session callback exists and is callable", () => {
      expect(typeof sessionCallback).toBe("function");
    });

    it("session callback enriches session with token data", async () => {
      const session: any = {
        user: { email: "test@example.com" },
      };
      const token: any = {
        id: "user-1",
        role: "ADMIN",
        personId: "person-1",
        mustChangePassword: false,
      };
      const result = await sessionCallback({ session, token });
      expect(result.user.id).toBe("user-1");
      expect(result.user.role).toBe("ADMIN");
      expect(result.user.personId).toBe("person-1");
      expect(result.user.mustChangePassword).toBe(false);
    });

    it("session callback handles null token gracefully", async () => {
      const session: any = { user: { email: "test@example.com" } };
      const result = await sessionCallback({ session, token: null });
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("test@example.com");
    });

    it("session callback preserves existing session email property", async () => {
      const originalSession: any = {
        user: {
          email: "user@example.com",
          name: "Test User",
        },
      };
      const token: any = {
        id: "1",
        role: "ADMIN",
        personId: null,
        mustChangePassword: false,
      };
      const result = await sessionCallback({
        session: originalSession,
        token,
      });
      expect(result.user.email).toBe("user@example.com");
      expect(result.user.name).toBe("Test User");
    });

    it("session callback enriches with all token properties", async () => {
      const session: any = {
        user: {
          email: "test@example.com",
          id: "existing-id",
        },
      };
      const token: any = {
        id: "token-id",
        role: "VIEWER",
        personId: "person-2",
        mustChangePassword: true,
      };
      const result = await sessionCallback({ session, token });
      expect(result.user.id).toBe("token-id");
      expect(result.user.role).toBe("VIEWER");
      expect(result.user.personId).toBe("person-2");
      expect(result.user.mustChangePassword).toBe(true);
    });

    it("session callback returns session object", async () => {
      const session: any = { user: { email: "user@test.com" } };
      const token: any = {
        id: "full-user-id",
        role: "ADMIN" as const,
        personId: "person-abc",
        mustChangePassword: true,
      };
      const result = await sessionCallback({ session, token });
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result.user).toBeDefined();
    });

    it("session callback preserves session when token has null personId", async () => {
      const session: any = {
        user: {
          email: "user@example.com",
          name: "User",
        },
      };
      const token: any = {
        id: "user-id",
        role: "MEMBER",
        personId: null,
        mustChangePassword: false,
      };
      const result = await sessionCallback({ session, token });
      expect(result.user.id).toBe("user-id");
      expect(result.user.personId).toBe(null);
    });
  });
});
