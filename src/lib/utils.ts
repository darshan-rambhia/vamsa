import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date-only string (YYYY-MM-DD) as a local date.
 * Creates a date at midnight UTC to ensure consistent date-only storage.
 * Returns null for empty/invalid input.
 */
export function parseDateString(value: string | null | undefined): Date | null {
  if (!value || value.trim() === "") return null;

  // Match YYYY-MM-DD format
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);

    const isMonthValid = m >= 1 && m <= 12;
    const isDayInRange = d >= 1 && d <= 31;
    if (!isMonthValid || !isDayInRange) {
      return null;
    }

    // Create date at midnight UTC to ensure consistent date-only storage
    const date = new Date(Date.UTC(y, m - 1, d));

    const dateWasNotWrappedByJavaScript =
      date.getUTCFullYear() === y &&
      date.getUTCMonth() === m - 1 &&
      date.getUTCDate() === d;

    if (!dateWasNotWrappedByJavaScript) {
      return null;
    }

    return date;
  }

  // Fallback: try to parse as-is (for ISO strings with time)
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format a date for display, handling timezone correctly.
 * For dates stored without time, this extracts just the date portion using UTC.
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
    timeZone: "UTC",
  });
}

/**
 * Format a date for input[type="date"] value (YYYY-MM-DD).
 * Extracts the UTC date components to avoid timezone shift.
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

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateAge(
  dateOfBirth: Date | null | undefined,
  dateOfPassing?: Date | null
): number | null {
  if (!dateOfBirth) return null;
  const endDate = dateOfPassing || new Date();

  // Use UTC components for consistent date-only calculations
  const birthYear = dateOfBirth.getUTCFullYear();
  const birthMonth = dateOfBirth.getUTCMonth();
  const birthDay = dateOfBirth.getUTCDate();

  const endYear = endDate.getUTCFullYear();
  const endMonth = endDate.getUTCMonth();
  const endDay = endDate.getUTCDate();

  let age = endYear - birthYear;
  const monthDiff = endMonth - birthMonth;

  if (monthDiff < 0 || (monthDiff === 0 && endDay < birthDay)) {
    age = age - 1;
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

/**
 * Create a date-only value at midnight UTC for consistent storage.
 * This ensures dates are stored without timezone conversion.
 */
export function createDateOnly(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Convert any date to a date-only value at midnight UTC.
 * This strips time and timezone information.
 */
export function toDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}
