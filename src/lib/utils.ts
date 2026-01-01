import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date-only string (YYYY-MM-DD) as a local date.
 * Avoids timezone issues by parsing as noon local time.
 * Returns null for empty/invalid input.
 */
export function parseDateString(value: string | null | undefined): Date | null {
  if (!value || value.trim() === "") return null;

  // Match YYYY-MM-DD format
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    // Create date at noon local time to avoid day boundary issues
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      12,
      0,
      0
    );
  }

  // Fallback: try to parse as-is (for ISO strings with time)
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format a date for display, handling timezone correctly.
 * For dates stored without time, this extracts just the date portion.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";

  let d: Date;
  if (typeof date === "string") {
    // If it's a date-only string, parse it correctly
    const parsed = parseDateString(date);
    if (!parsed) return "";
    d = parsed;
  } else {
    d = date;
  }

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date for input[type="date"] value (YYYY-MM-DD).
 * Extracts the local date components to avoid timezone shift.
 */
export function formatDateForInput(
  date: Date | string | null | undefined
): string {
  if (!date) return "";

  let d: Date;
  if (typeof date === "string") {
    const parsed = parseDateString(date);
    if (!parsed) return "";
    d = parsed;
  } else {
    d = date;
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateAge(
  dateOfBirth: Date | null | undefined,
  dateOfPassing?: Date | null
): number | null {
  if (!dateOfBirth) return null;
  const endDate = dateOfPassing || new Date();
  const age = endDate.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = endDate.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && endDate.getDate() < dateOfBirth.getDate())
  ) {
    return age - 1;
  }
  return age;
}

export function generateRandomPassword(length: number = 16): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
