import { describe, it, expect } from "bun:test";
import { loginSchema, registerSchema, changePasswordSchema } from "./user";

describe("loginSchema", () => {
  it("validates valid login data", () => {
    const validData = {
      email: "user@example.com",
      password: "password123",
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("requires email", () => {
    const invalidData = {
      password: "password123",
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("requires password", () => {
    const invalidData = {
      email: "user@example.com",
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("validates email format", () => {
    const invalidData = {
      email: "not-an-email",
      password: "password123",
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("requires password to be non-empty", () => {
    const invalidData = {
      email: "user@example.com",
      password: "",
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("validates valid registration data", () => {
    const validData = {
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      confirmPassword: "password123",
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("requires name", () => {
    const invalidData = {
      email: "john@example.com",
      password: "password123",
      confirmPassword: "password123",
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("requires passwords to match", () => {
    const invalidData = {
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      confirmPassword: "different123",
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("validates email format", () => {
    const invalidData = {
      name: "John Doe",
      email: "invalid-email",
      password: "password123",
      confirmPassword: "password123",
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("validates valid password change data", () => {
    const validData = {
      currentPassword: "oldpassword123",
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    };

    const result = changePasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("requires current password", () => {
    const invalidData = {
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    };

    const result = changePasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("requires new password to be at least 8 characters", () => {
    const invalidData = {
      currentPassword: "oldpassword123",
      newPassword: "short",
      confirmPassword: "short",
    };

    const result = changePasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("requires passwords to match", () => {
    const invalidData = {
      currentPassword: "oldpassword123",
      newPassword: "newpassword123",
      confirmPassword: "different123",
    };

    const result = changePasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("confirmPassword");
    }
  });
});
