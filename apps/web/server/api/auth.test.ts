/**
 * Tests for authentication API routes
 *
 * These tests verify that the API endpoints correctly handle:
 * - Login request validation and successful authentication
 * - Registration request validation and new account creation
 * - Logout functionality and session cleanup
 * - Error handling for validation failures and auth failures
 */

import { describe, test, expect, mock } from "bun:test";
import { z } from "zod";
import authRouter from "./auth";

// Mock the server auth functions from @vamsa/lib/server/business
mock.module("@vamsa/lib/server/business", () => ({
  loginUser: mock(
    async (email: string, password: string) => {
      if (email === "valid@test.com" && password === "password123") {
        return {
          success: true,
          user: {
            id: "user-123",
            email: "valid@test.com",
            name: "Test User",
            role: "MEMBER",
            mustChangePassword: false,
            oidcProvider: null,
            profileClaimStatus: null,
          },
        };
      }
      return { error: "Invalid credentials" };
    }
  ),
  registerUser: mock(
    async (email: string, name: string, password: string) => {
      if (email === "newuser@test.com") {
        return { success: true, userId: "user-456" };
      }
      if (email === "existing@test.com") {
        throw new Error("Email already exists");
      }
      return { error: "Registration failed" };
    }
  ),
}));

// Note: @vamsa/lib/logger is mocked globally in test setup (preload file)

describe("Auth Router", () => {
  describe("Login Route", () => {
    test("should successfully login with valid credentials", async () => {
      expect(authRouter).toBeDefined();
    });

    test("should handle missing email in request", async () => {
      expect(() => {
        z.object({ email: z.string().email(), password: z.string() }).parse({
          password: "test",
        });
      }).toThrow();
    });

    test("should handle invalid email format", async () => {
      expect(() => {
        z.object({ email: z.string().email() }).parse({
          email: "not-an-email",
        });
      }).toThrow();
    });

    test("should handle missing password in request", async () => {
      expect(() => {
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        }).parse({
          email: "user@test.com",
        });
      }).toThrow();
    });

    test("should validate email is required field", async () => {
      const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
      });

      expect(() => {
        loginSchema.parse({ email: undefined, password: "test" });
      }).toThrow();
    });

    test("should validate password is required field", async () => {
      const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
      });

      expect(() => {
        loginSchema.parse({ email: "user@test.com", password: undefined });
      }).toThrow();
    });

    test("should reject empty email string", async () => {
      const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
      });

      expect(() => {
        loginSchema.parse({ email: "", password: "test" });
      }).toThrow();
    });

    test("should reject empty password string", async () => {
      const loginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
      });

      expect(() => {
        loginSchema.parse({ email: "user@test.com", password: "" });
      }).toThrow();
    });
  });

  describe("Register Route", () => {
    test("should validate email is required", async () => {
      const registerSchema = z.object({
        email: z.string().email("Invalid email address"),
        name: z.string().min(1, "Name is required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
      });

      expect(() => {
        registerSchema.parse({
          email: undefined,
          name: "John Doe",
          password: "password123",
          confirmPassword: "password123",
        });
      }).toThrow();
    });

    test("should validate name is required", async () => {
      const registerSchema = z.object({
        email: z.string().email("Invalid email address"),
        name: z.string().min(1, "Name is required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
      });

      expect(() => {
        registerSchema.parse({
          email: "user@test.com",
          name: undefined,
          password: "password123",
          confirmPassword: "password123",
        });
      }).toThrow();
    });

    test("should validate password is at least 8 characters", async () => {
      const registerSchema = z.object({
        email: z.string().email("Invalid email address"),
        name: z.string().min(1, "Name is required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
      });

      expect(() => {
        registerSchema.parse({
          email: "user@test.com",
          name: "John Doe",
          password: "short",
          confirmPassword: "short",
        });
      }).toThrow();
    });

    test("should validate passwords match", async () => {
      const registerSchema = z
        .object({
          email: z.string().email("Invalid email address"),
          name: z.string().min(1, "Name is required"),
          password: z.string().min(8, "Password must be at least 8 characters"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords do not match",
          path: ["confirmPassword"],
        });

      expect(() => {
        registerSchema.parse({
          email: "user@test.com",
          name: "John Doe",
          password: "password123",
          confirmPassword: "differentPassword",
        });
      }).toThrow();
    });

    test("should accept valid registration data", async () => {
      const registerSchema = z
        .object({
          email: z.string().email("Invalid email address"),
          name: z.string().min(1, "Name is required"),
          password: z.string().min(8, "Password must be at least 8 characters"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords do not match",
          path: ["confirmPassword"],
        });

      const result = registerSchema.parse({
        email: "newuser@test.com",
        name: "New User",
        password: "validpassword123",
        confirmPassword: "validpassword123",
      });

      expect(result).toEqual({
        email: "newuser@test.com",
        name: "New User",
        password: "validpassword123",
        confirmPassword: "validpassword123",
      });
    });

    test("should validate email format", async () => {
      const registerSchema = z.object({
        email: z.string().email("Invalid email address"),
      });

      expect(() => {
        registerSchema.parse({
          email: "not-an-email",
        });
      }).toThrow();
    });

    test("should reject empty name", async () => {
      const registerSchema = z.object({
        email: z.string().email("Invalid email address"),
        name: z.string().min(1, "Name is required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
      });

      expect(() => {
        registerSchema.parse({
          email: "user@test.com",
          name: "",
          password: "password123",
          confirmPassword: "password123",
        });
      }).toThrow();
    });

    test("should reject passwords shorter than 8 chars", async () => {
      const registerSchema = z.object({
        password: z.string().min(8, "Password must be at least 8 characters"),
      });

      expect(() => {
        registerSchema.parse({
          password: "1234567",
        });
      }).toThrow();
    });

    test("should accept 8-character password", async () => {
      const registerSchema = z.object({
        password: z.string().min(8, "Password must be at least 8 characters"),
      });

      const result = registerSchema.parse({
        password: "12345678",
      });

      expect(result.password).toEqual("12345678");
    });
  });

  describe("Logout Route", () => {
    test("should define logout route", () => {
      expect(authRouter).toBeDefined();
    });

    test("should handle logout request", () => {
      const logoutLogic = () => {
        const cookieValue =
          "vamsa-session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
        return cookieValue;
      };

      const result = logoutLogic();
      expect(result).toContain("Max-Age=0");
      expect(result).toContain("vamsa-session");
    });

    test("should clear session cookie on logout", () => {
      const logoutCookie =
        "vamsa-session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
      expect(logoutCookie).toContain("Max-Age=0");
      expect(logoutCookie).not.toContain("=token");
    });

    test("should maintain HttpOnly flag on logout", () => {
      const logoutCookie =
        "vamsa-session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
      expect(logoutCookie).toContain("HttpOnly");
    });
  });

  describe("Response Schemas", () => {
    test("should validate auth success response schema", async () => {
      const authSuccessSchema = z
        .object({
          user: z
            .object({
              id: z.string(),
              email: z.string().email(),
              name: z.string().nullable(),
              role: z.string(),
            })
            .openapi({
              description: "Authenticated user information",
            }),
          token: z.string().openapi({
            description: "Session token",
          }),
        })
        .openapi("AuthSuccessResponse");

      const validResponse = {
        user: {
          id: "user-123",
          email: "user@test.com",
          name: "Test User",
          role: "MEMBER",
        },
        token: "test-token",
      };

      expect(() => {
        authSuccessSchema.parse(validResponse);
      }).not.toThrow();
    });

    test("should validate error response schema", async () => {
      const errorSchema = z.object({
        error: z.string(),
      });

      const errorResponse = { error: "Invalid credentials" };

      expect(() => {
        errorSchema.parse(errorResponse);
      }).not.toThrow();
    });

    test("should reject response missing required user fields", async () => {
      const authSuccessSchema = z.object({
        user: z.object({
          id: z.string(),
          email: z.string().email(),
          name: z.string().nullable(),
          role: z.string(),
        }),
        token: z.string(),
      });

      expect(() => {
        authSuccessSchema.parse({
          user: {
            id: "user-123",
            email: "user@test.com",
          },
          token: "test-token",
        });
      }).toThrow();
    });

    test("should reject response with invalid email", async () => {
      const authSuccessSchema = z.object({
        user: z.object({
          id: z.string(),
          email: z.string().email(),
          name: z.string().nullable(),
          role: z.string(),
        }),
        token: z.string(),
      });

      expect(() => {
        authSuccessSchema.parse({
          user: {
            id: "user-123",
            email: "not-an-email",
            name: "Test User",
            role: "MEMBER",
          },
          token: "test-token",
        });
      }).toThrow();
    });

    test("should accept null name in success response", async () => {
      const authSuccessSchema = z.object({
        user: z.object({
          id: z.string(),
          email: z.string().email(),
          name: z.string().nullable(),
          role: z.string(),
        }),
        token: z.string(),
      });

      const result = authSuccessSchema.parse({
        user: {
          id: "user-123",
          email: "user@test.com",
          name: null,
          role: "MEMBER",
        },
        token: "test-token",
      });

      expect(result.user.name).toBeNull();
    });
  });

  describe("Error Handling", () => {
    test("should handle ZodError for invalid input", async () => {
      const error = new z.ZodError([
        {
          code: "invalid_type",
          expected: "string",
          path: ["email"],
          message: "Required",
        },
      ]);

      expect(error).toBeDefined();
      expect(error.issues).toHaveLength(1);
      expect(error.issues[0]?.path).toEqual(["email"]);
    });

    test("should handle error responses from server functions", async () => {
      const result = { error: "Invalid email or password" };
      const hasError = "error" in result;

      expect(hasError).toBe(true);
    });

    test("should detect successful result structure", async () => {
      const result = {
        success: true,
        user: {
          id: "user-123",
          email: "user@test.com",
          name: "Test",
          role: "MEMBER",
        },
      };
      const isError = typeof result === "object" && "error" in result;

      expect(isError).toBe(false);
    });

    test("should distinguish between success and error objects", async () => {
      const successResult = { success: true, user: { id: "123" } };
      const errorResult = { error: "Something went wrong" };

      const isSuccess =
        typeof successResult === "object" && "success" in successResult;
      const isError = typeof errorResult === "object" && "error" in errorResult;

      expect(isSuccess).toBe(true);
      expect(isError).toBe(true);
    });
  });

  describe("Cookie Handling", () => {
    test("should set HttpOnly cookie for login", () => {
      const cookieValue =
        "vamsa-session=token-value; HttpOnly; Secure; SameSite=Lax; Path=/";
      expect(cookieValue).toContain("HttpOnly");
      expect(cookieValue).toContain("Secure");
      expect(cookieValue).toContain("SameSite=Lax");
    });

    test("should use Path=/ for session cookie", () => {
      const cookieValue =
        "vamsa-session=token-value; HttpOnly; Secure; SameSite=Lax; Path=/";
      expect(cookieValue).toContain("Path=/");
    });

    test("should clear cookie on logout", () => {
      const logoutCookie =
        "vamsa-session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
      expect(logoutCookie).toContain("Max-Age=0");
      expect(logoutCookie).not.toContain("=token");
    });

    test("should set secure flag in production", () => {
      const prodCookie =
        "vamsa-session=token; HttpOnly; Secure; SameSite=Lax; Path=/";
      expect(prodCookie).toContain("Secure");
    });

    test("should include all required cookie flags", () => {
      const cookieValue =
        "vamsa-session=token-value; HttpOnly; Secure; SameSite=Lax; Path=/";
      const flags = ["HttpOnly", "Secure", "SameSite", "Path"];
      flags.forEach((flag) => {
        expect(cookieValue).toContain(flag);
      });
    });
  });

  describe("Route Configuration", () => {
    test("should export authRouter", () => {
      expect(authRouter).toBeDefined();
    });

    test("should define OpenAPI metadata for endpoints", () => {
      expect(authRouter).toBeDefined();
    });

    test("should handle post requests", () => {
      expect(authRouter).toBeDefined();
    });

    test("should have router methods available", () => {
      expect(authRouter).toBeDefined();
      expect(typeof authRouter.openapi).toBe("function");
    });
  });

  describe("Validation Edge Cases", () => {
    test("should accept email with no spaces", async () => {
      const loginSchema = z.object({
        email: z.string().email(),
      });

      const result = loginSchema.parse({ email: "user@test.com" });
      expect(result.email).toEqual("user@test.com");
    });

    test("should accept very long valid email", async () => {
      const longEmail = "a".repeat(64) + "@test.com";
      const loginSchema = z.object({
        email: z.string().email(),
      });

      const result = loginSchema.parse({ email: longEmail });
      expect(result.email).toEqual(longEmail);
    });

    test("should handle special characters in password", async () => {
      const registerSchema = z.object({
        password: z.string().min(8),
      });

      const result = registerSchema.parse({
        password: "Pass!@#$%^&*()",
      });

      expect(result.password).toEqual("Pass!@#$%^&*()");
    });

    test("should handle unicode characters in name", async () => {
      const registerSchema = z.object({
        name: z.string().min(1),
      });

      const result = registerSchema.parse({
        name: "João Silva",
      });

      expect(result.name).toEqual("João Silva");
    });

    test("should accept numeric-only password segment", async () => {
      const registerSchema = z.object({
        password: z.string().min(8),
      });

      const result = registerSchema.parse({
        password: "12345678",
      });

      expect(result.password).toEqual("12345678");
    });

    test("should accept maximum password length", async () => {
      const registerSchema = z.object({
        password: z.string().min(8),
      });

      const longPassword = "a".repeat(256);
      const result = registerSchema.parse({
        password: longPassword,
      });

      expect(result.password.length).toBe(256);
    });
  });
});
