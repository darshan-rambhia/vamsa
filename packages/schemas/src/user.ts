import { z } from "@hono/zod-openapi";
import { passwordSchema } from "./password";

export const userRoleEnum = z.enum(["ADMIN", "MEMBER", "VIEWER"]);

export const userCreateSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  password: passwordSchema,
  personId: z.string().optional(),
  role: userRoleEnum.default("VIEWER"),
});

export const userUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  personId: z.string().optional().nullable(),
  role: userRoleEnum.optional(),
  isActive: z.boolean().optional(),
});

export const loginSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  })
  .openapi({
    description: "Login credentials",
  });

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    name: z.string().min(1, "Name is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .openapi({
    description: "Registration data",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const claimProfileSchema = z.object({
  email: z.string().email("Invalid email address"),
  personId: z.string().min(1, "Please select your profile"),
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type UserRole = z.infer<typeof userRoleEnum>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ClaimProfileInput = z.infer<typeof claimProfileSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
