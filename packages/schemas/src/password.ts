import { z } from "@hono/zod-openapi";

/**
 * Password strength information
 */
export interface PasswordStrength {
  /** 0-4: 0=empty, 1=weak, 2=fair, 3=good, 4=strong */
  score: number;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasDigit: boolean;
    hasSpecial: boolean;
  };
  /** Human-readable messages for failed checks */
  feedback: Array<string>;
}

/**
 * Analyze password strength.
 * Pure function — safe to call on client or server.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const feedback: Array<string> = [];
  if (!checks.minLength) feedback.push("Must be at least 12 characters");
  if (!checks.hasUppercase) feedback.push("Add an uppercase letter");
  if (!checks.hasLowercase) feedback.push("Add a lowercase letter");
  if (!checks.hasDigit) feedback.push("Add a number");
  if (!checks.hasSpecial) feedback.push("Add a special character");

  // Count character classes present
  const classCount = [
    checks.hasUppercase,
    checks.hasLowercase,
    checks.hasDigit,
    checks.hasSpecial,
  ].filter(Boolean).length;

  let score = 0;
  if (password.length === 0) score = 0;
  else if (!checks.minLength || classCount < 2) score = 1;
  else if (classCount < 3) score = 2;
  else if (classCount === 3) score = 3;
  else score = 4; // all 4 classes

  return { score, checks, feedback };
}

/** Minimum character classes required (3 of 4) */
const MIN_CHAR_CLASSES = 3;

/**
 * Zod schema for password creation/change.
 * Requires 12+ chars and 3 of 4 character classes.
 *
 * Do NOT use for login — login should accept any password.
 */
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .superRefine((val, ctx) => {
    const { checks } = getPasswordStrength(val);
    const classCount = [
      checks.hasUppercase,
      checks.hasLowercase,
      checks.hasDigit,
      checks.hasSpecial,
    ].filter(Boolean).length;

    if (classCount < MIN_CHAR_CLASSES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Password must contain at least ${MIN_CHAR_CLASSES} of: uppercase letter, lowercase letter, number, special character`,
      });
    }
  });
