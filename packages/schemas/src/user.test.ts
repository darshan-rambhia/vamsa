/**
 * Unit Tests for User Schemas
 * Tests Zod schema validation for user management, authentication, and registration
 */
import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  claimProfileSchema,
  loginSchema,
  registerSchema,
  userCreateSchema,
  userRoleEnum,
  userUpdateSchema,
} from "./user";
import type {
  ChangePasswordInput,
  ClaimProfileInput,
  LoginInput,
  RegisterInput,
  UserCreateInput,
  UserUpdateInput,
} from "./user";

describe("userRoleEnum", () => {
  it("should accept all valid user roles", () => {
    const validRoles = ["ADMIN", "MEMBER", "VIEWER"];

    validRoles.forEach((role) => {
      const result = userRoleEnum.safeParse(role);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid user roles", () => {
    const invalidRoles = [
      "admin",
      "member",
      "viewer",
      "SUPERUSER",
      "",
      null,
      123,
    ];

    invalidRoles.forEach((role) => {
      const result = userRoleEnum.safeParse(role);
      expect(result.success).toBe(false);
    });
  });

  it("should reject lowercase role values", () => {
    const result = userRoleEnum.safeParse("admin");
    expect(result.success).toBe(false);
  });

  it("should reject mixed case role values", () => {
    const result = userRoleEnum.safeParse("Admin");
    expect(result.success).toBe(false);
  });
});

describe("userCreateSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete user creation", () => {
      const user: UserCreateInput = {
        email: "john@example.com",
        name: "John Doe",
        password: "SecurePassword123",
        personId: "person-123",
        role: "MEMBER",
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(true);
    });

    it("should validate minimal user with only required fields", () => {
      const user = {
        email: "john@example.com",
        password: "SecurePassword123",
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(true);
    });

    it("should use VIEWER as default role", () => {
      const user = {
        email: "john@example.com",
        password: "SecurePassword123",
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("VIEWER");
      }
    });

    it("should accept all valid roles", () => {
      const roles = ["ADMIN", "MEMBER", "VIEWER"];

      roles.forEach((role) => {
        const user = {
          email: "john@example.com",
          password: "SecurePassword123",
          role: role as any,
        };

        const result = userCreateSchema.safeParse(user);
        expect(result.success).toBe(true);
      });
    });

    it("should accept name as optional", () => {
      const user = {
        email: "john@example.com",
        password: "SecurePassword123",
        name: undefined,
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(true);
    });

    it("should accept personId as optional", () => {
      const user = {
        email: "john@example.com",
        password: "SecurePassword123",
        personId: undefined,
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(true);
    });
  });

  describe("Email validation", () => {
    it("should accept valid email addresses", () => {
      const validEmails = [
        "user@example.com",
        "test.user@example.co.uk",
        "user+tag@example.com",
        "123@example.com",
      ];

      validEmails.forEach((email) => {
        const user = {
          email,
          password: "SecurePassword123",
        };

        const result = userCreateSchema.safeParse(user);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid email formats", () => {
      const invalidEmails = [
        "notanemail",
        "user@",
        "@example.com",
        "user@.com",
        "user @example.com",
        "user@example",
        "",
        "user@@example.com",
      ];

      invalidEmails.forEach((email) => {
        const user = {
          email,
          password: "SecurePassword123",
        };

        const result = userCreateSchema.safeParse(user);
        expect(result.success).toBe(false);
      });
    });

    it("should reject missing email", () => {
      const user = { password: "SecurePassword123" };
      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(false);
    });

    it("should reject null email", () => {
      const user = {
        email: null,
        password: "SecurePassword123",
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(false);
    });
  });

  describe("Password validation", () => {
    it("should accept password meeting complexity requirements (12+ chars, 3 classes)", () => {
      const user = {
        email: "john@example.com",
        password: "SecurePass1!",
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(true);
    });

    it("should accept password longer than 12 characters", () => {
      const user = {
        email: "john@example.com",
        password: "VeryLongSecurePassword123456789!@#",
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(true);
    });

    it("should reject password shorter than 12 characters", () => {
      const user = {
        email: "john@example.com",
        password: "1234567",
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(false);
    });

    it("should reject password with only 2 character classes", () => {
      const user = {
        email: "john@example.com",
        password: "abcdefghijkl1", // lowercase + digit only
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const user = {
        email: "john@example.com",
        password: "",
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(false);
    });

    it("should reject missing password", () => {
      const user = { email: "john@example.com" };
      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(false);
    });

    it("should reject null password", () => {
      const user = {
        email: "john@example.com",
        password: null,
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(false);
    });

    it("should accept passwords with special characters", () => {
      const user = {
        email: "john@example.com",
        password: "P@ssw0rd!#$%^&*()",
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(true);
    });

    it("should accept passwords with unicode characters", () => {
      const user = {
        email: "john@example.com",
        password: "P@ssw0rd!üñ🔒",
      };

      const result = userCreateSchema.safeParse(user);
      expect(result.success).toBe(true);
    });
  });

  describe("Type inference", () => {
    it("should infer correct input type", () => {
      // UserCreateInput is the OUTPUT type (z.infer), so role is required
      // In practice, role has a default so the schema accepts input without it
      const user: UserCreateInput = {
        email: "test@example.com",
        password: "ValidPass123",
        role: "VIEWER",
      };

      expect(user.email).toBe("test@example.com");
    });
  });
});

describe("userUpdateSchema", () => {
  describe("Valid inputs", () => {
    it("should accept partial updates with name only", () => {
      const update: UserUpdateInput = { name: "Updated Name" };
      const result = userUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept partial updates with email only", () => {
      const update = { email: "newemail@example.com" };
      const result = userUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = userUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept all update fields", () => {
      const update = {
        name: "New Name",
        email: "new@example.com",
        personId: "person-123",
        role: "ADMIN" as const,
        isActive: true,
      };

      const result = userUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept personId as null", () => {
      const update = {
        personId: null,
      };

      const result = userUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept isActive as true", () => {
      const update = { isActive: true };
      const result = userUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept isActive as false", () => {
      const update = { isActive: false };
      const result = userUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });

  describe("Email validation in updates", () => {
    it("should validate email format in updates", () => {
      const update = { email: "invalidemail" };
      const result = userUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should accept valid email in updates", () => {
      const update = { email: "valid@example.com" };
      const result = userUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });

  describe("Role validation in updates", () => {
    it("should accept all valid roles in updates", () => {
      const roles = ["ADMIN", "MEMBER", "VIEWER"];

      roles.forEach((role) => {
        const update = { role: role as any };
        const result = userUpdateSchema.safeParse(update);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid roles in updates", () => {
      const update = { role: "INVALID" as any };
      const result = userUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct update type", () => {
      const update: UserUpdateInput = { name: "Updated" };
      expect(update.name).toBe("Updated");
    });
  });
});

describe("loginSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete login credentials", () => {
      const credentials: LoginInput = {
        email: "user@example.com",
        password: "MyPassword123",
      };

      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(true);
    });

    it("should validate with various email formats", () => {
      const emails = [
        "user@example.com",
        "test.user@example.co.uk",
        "admin+test@example.com",
      ];

      emails.forEach((email) => {
        const credentials = {
          email,
          password: "ValidPassword1",
        };

        const result = loginSchema.safeParse(credentials);
        expect(result.success).toBe(true);
      });
    });

    it("should accept password with minimum length (1 character)", () => {
      const credentials = {
        email: "user@example.com",
        password: "a",
      };

      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(true);
    });
  });

  describe("Email validation", () => {
    it("should reject invalid email format", () => {
      const credentials = {
        email: "notanemail",
        password: "ValidPassword",
      };

      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });

    it("should reject missing email", () => {
      const credentials = { password: "ValidPassword" };
      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });

    it("should reject empty email", () => {
      const credentials = {
        email: "",
        password: "ValidPassword",
      };

      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });

    it("should reject null email", () => {
      const credentials = {
        email: null,
        password: "ValidPassword",
      };

      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });
  });

  describe("Password validation", () => {
    it("should accept password with any content (minimum 1 char)", () => {
      const passwords = ["a", "pwd", "x".repeat(100)];

      passwords.forEach((password) => {
        const credentials = {
          email: "user@example.com",
          password,
        };

        const result = loginSchema.safeParse(credentials);
        expect(result.success).toBe(true);
      });
    });

    it("should reject empty password", () => {
      const credentials = {
        email: "user@example.com",
        password: "",
      };

      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });

    it("should reject missing password", () => {
      const credentials = { email: "user@example.com" };
      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });

    it("should reject null password", () => {
      const credentials = {
        email: "user@example.com",
        password: null,
      };

      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct login input type", () => {
      const credentials: LoginInput = {
        email: "user@example.com",
        password: "password",
      };

      expect(credentials.email).toBe("user@example.com");
    });
  });
});

describe("registerSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete registration data", () => {
      const registration: RegisterInput = {
        email: "newuser@example.com",
        name: "New User",
        password: "SecurePassword123",
        confirmPassword: "SecurePassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(true);
    });

    it("should validate with minimum password length (12 chars, 3 classes)", () => {
      const registration = {
        email: "user@example.com",
        name: "Test User",
        password: "SecurePass1!",
        confirmPassword: "SecurePass1!",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(true);
    });

    it("should validate with long passwords", () => {
      const longPassword =
        "VeryLongSecurePasswordWith!@#$%^&*()Characters123456789";
      const registration = {
        email: "user@example.com",
        name: "Test User",
        password: longPassword,
        confirmPassword: longPassword,
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(true);
    });
  });

  describe("Email validation", () => {
    it("should reject invalid email format", () => {
      const registration = {
        email: "notanemail",
        name: "Test User",
        password: "ValidPassword123",
        confirmPassword: "ValidPassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(false);
    });

    it("should reject missing email", () => {
      const registration = {
        name: "Test User",
        password: "ValidPassword123",
        confirmPassword: "ValidPassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(false);
    });

    it("should reject empty email", () => {
      const registration = {
        email: "",
        name: "Test User",
        password: "ValidPassword123",
        confirmPassword: "ValidPassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(false);
    });
  });

  describe("Name validation", () => {
    it("should reject missing name", () => {
      const registration = {
        email: "user@example.com",
        password: "ValidPassword123",
        confirmPassword: "ValidPassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const registration = {
        email: "user@example.com",
        name: "",
        password: "ValidPassword123",
        confirmPassword: "ValidPassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(false);
    });

    it("should accept single character name", () => {
      const registration = {
        email: "user@example.com",
        name: "A",
        password: "ValidPassword123",
        confirmPassword: "ValidPassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(true);
    });

    it("should accept long name", () => {
      const registration = {
        email: "user@example.com",
        name: "A".repeat(100),
        password: "ValidPassword123",
        confirmPassword: "ValidPassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(true);
    });
  });

  describe("Password validation", () => {
    it("should reject password shorter than 12 characters", () => {
      const registration = {
        email: "user@example.com",
        name: "Test User",
        password: "1234567",
        confirmPassword: "1234567",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(false);
    });

    it("should reject password with only 2 character classes", () => {
      const registration = {
        email: "user@example.com",
        name: "Test User",
        password: "abcdefghijkl1", // lowercase + digit only
        confirmPassword: "abcdefghijkl1",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(false);
    });

    it("should reject missing password", () => {
      const registration = {
        email: "user@example.com",
        name: "Test User",
        confirmPassword: "ValidPassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(false);
    });

    it("should accept password with special characters", () => {
      const registration = {
        email: "user@example.com",
        name: "Test User",
        password: "P@ssw0rd!#$%",
        confirmPassword: "P@ssw0rd!#$%",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(true);
    });
  });

  describe("Confirm password refinement", () => {
    it("should reject when passwords do not match", () => {
      const registration = {
        email: "user@example.com",
        name: "Test User",
        password: "ValidPassword123",
        confirmPassword: "DifferentPassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.issues[0]?.path).toContain("confirmPassword");
        expect(result.error?.issues[0]?.message).toBe("Passwords do not match");
      }
    });

    it("should accept when passwords match exactly", () => {
      const password = "MatchingPassword123!@#";
      const registration = {
        email: "user@example.com",
        name: "Test User",
        password,
        confirmPassword: password,
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(true);
    });

    it("should be case-sensitive for password matching", () => {
      const registration = {
        email: "user@example.com",
        name: "Test User",
        password: "ValidPassword123",
        confirmPassword: "validpassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(false);
    });

    it("should reject when only password is missing in mismatch", () => {
      const registration = {
        email: "user@example.com",
        name: "Test User",
        password: "",
        confirmPassword: "SomePassword123",
      };

      const result = registerSchema.safeParse(registration);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct registration input type", () => {
      const registration: RegisterInput = {
        email: "user@example.com",
        name: "Test",
        password: "ValidPass123",
        confirmPassword: "ValidPass123",
      };

      expect(registration.email).toBe("user@example.com");
    });
  });
});

describe("changePasswordSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete password change", () => {
      const passwordChange: ChangePasswordInput = {
        currentPassword: "OldPassword123",
        newPassword: "NewPassword456!",
        confirmPassword: "NewPassword456!",
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(true);
    });

    it("should validate with minimum password length (12 chars, 3 classes)", () => {
      const passwordChange = {
        currentPassword: "SomePassword",
        newPassword: "NewPass456!x",
        confirmPassword: "NewPass456!x",
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(true);
    });
  });

  describe("Current password validation", () => {
    it("should reject empty current password", () => {
      const passwordChange = {
        currentPassword: "",
        newPassword: "NewPassword456",
        confirmPassword: "NewPassword456",
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(false);
    });

    it("should reject missing current password", () => {
      const passwordChange = {
        newPassword: "NewPassword456",
        confirmPassword: "NewPassword456",
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(false);
    });

    it("should accept any non-empty current password", () => {
      const passwordChange = {
        currentPassword: "a",
        newPassword: "ValidPassword123",
        confirmPassword: "ValidPassword123",
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(true);
    });
  });

  describe("New password validation", () => {
    it("should reject new password shorter than 12 characters", () => {
      const passwordChange = {
        currentPassword: "CurrentPassword",
        newPassword: "1234567",
        confirmPassword: "1234567",
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(false);
    });

    it("should reject new password with only 2 character classes", () => {
      const passwordChange = {
        currentPassword: "CurrentPassword",
        newPassword: "abcdefghijkl1", // lowercase + digit only
        confirmPassword: "abcdefghijkl1",
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(false);
    });

    it("should reject missing new password", () => {
      const passwordChange = {
        currentPassword: "CurrentPassword",
        confirmPassword: "NewPassword456!",
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(false);
    });

    it("should accept password with special characters", () => {
      const passwordChange = {
        currentPassword: "CurrentPassword",
        newPassword: "N@w!P@ssw0rd#$%",
        confirmPassword: "N@w!P@ssw0rd#$%",
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(true);
    });
  });

  describe("Confirm password refinement", () => {
    it("should reject when new password does not match confirm", () => {
      const passwordChange = {
        currentPassword: "CurrentPassword",
        newPassword: "NewPassword456",
        confirmPassword: "DifferentPassword789",
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.issues[0]?.path).toContain("confirmPassword");
        expect(result.error?.issues[0]?.message).toBe("Passwords do not match");
      }
    });

    it("should accept when passwords match", () => {
      const password = "NewPassword456";
      const passwordChange = {
        currentPassword: "CurrentPassword",
        newPassword: password,
        confirmPassword: password,
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(true);
    });

    it("should be case-sensitive for password matching", () => {
      const passwordChange = {
        currentPassword: "CurrentPassword",
        newPassword: "NewPassword456",
        confirmPassword: "newpassword456",
      };

      const result = changePasswordSchema.safeParse(passwordChange);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct password change input type", () => {
      const passwordChange: ChangePasswordInput = {
        currentPassword: "current",
        newPassword: "NewPassword1!",
        confirmPassword: "NewPassword1!",
      };

      expect(passwordChange.currentPassword).toBe("current");
    });
  });
});

describe("claimProfileSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete profile claim", () => {
      const claim: ClaimProfileInput = {
        email: "user@example.com",
        personId: "person-123",
        password: "ClaimPassword123!",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(true);
    });

    it("should validate with minimum password length (12 chars, 3 classes)", () => {
      const claim = {
        email: "user@example.com",
        personId: "person-456",
        password: "ClaimPass1!x",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(true);
    });

    it("should validate with different person IDs", () => {
      const personIds = ["person-1", "123", "uuid-format-id", "a".repeat(50)];

      personIds.forEach((personId) => {
        const claim = {
          email: "user@example.com",
          personId,
          password: "ValidPassword123!",
        };

        const result = claimProfileSchema.safeParse(claim);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Email validation", () => {
    it("should reject invalid email format", () => {
      const claim = {
        email: "notanemail",
        personId: "person-123",
        password: "ValidPassword123",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(false);
    });

    it("should reject missing email", () => {
      const claim = {
        personId: "person-123",
        password: "ValidPassword123",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(false);
    });

    it("should reject empty email", () => {
      const claim = {
        email: "",
        personId: "person-123",
        password: "ValidPassword123",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(false);
    });
  });

  describe("Person ID validation", () => {
    it("should reject missing personId", () => {
      const claim = {
        email: "user@example.com",
        password: "ValidPassword123",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(false);
    });

    it("should reject empty personId", () => {
      const claim = {
        email: "user@example.com",
        personId: "",
        password: "ValidPassword123",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(false);
    });

    it("should reject null personId", () => {
      const claim = {
        email: "user@example.com",
        personId: null,
        password: "ValidPassword123",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(false);
    });

    it("should accept single character personId", () => {
      const claim = {
        email: "user@example.com",
        personId: "a",
        password: "ValidPassword123",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(true);
    });
  });

  describe("Password validation", () => {
    it("should reject password shorter than 12 characters", () => {
      const claim = {
        email: "user@example.com",
        personId: "person-123",
        password: "1234567",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(false);
    });

    it("should reject password with only 2 character classes", () => {
      const claim = {
        email: "user@example.com",
        personId: "person-123",
        password: "abcdefghijkl1", // lowercase + digit only
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(false);
    });

    it("should reject missing password", () => {
      const claim = {
        email: "user@example.com",
        personId: "person-123",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const claim = {
        email: "user@example.com",
        personId: "person-123",
        password: "",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(false);
    });

    it("should accept password with special characters", () => {
      const claim = {
        email: "user@example.com",
        personId: "person-123",
        password: "C!@im#P@ssw0rd$%",
      };

      const result = claimProfileSchema.safeParse(claim);
      expect(result.success).toBe(true);
    });
  });

  describe("Type inference", () => {
    it("should infer correct claim profile input type", () => {
      const claim: ClaimProfileInput = {
        email: "user@example.com",
        personId: "person-123",
        password: "ValidPass123",
      };

      expect(claim.personId).toBe("person-123");
    });
  });
});
