import { describe, it, expect, afterEach, setSystemTime } from "bun:test";
import {
  cn,
  parseDateString,
  formatDate,
  formatDateForInput,
  calculateAge,
  generateRandomPassword,
  getInitials,
  createDateOnly,
  toDateOnly,
} from "./utils";

describe("cn", () => {
  it("merges class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("handles array of classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles tailwind merge", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});

describe("parseDateString", () => {
  it("returns null for empty string", () => {
    expect(parseDateString("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseDateString(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseDateString(undefined)).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(parseDateString("   ")).toBeNull();
  });

  it("parses YYYY-MM-DD format correctly", () => {
    const result = parseDateString("2024-06-15");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getUTCFullYear()).toBe(2024);
    expect(result?.getUTCMonth()).toBe(5);
    expect(result?.getUTCDate()).toBe(15);
    expect(result?.getUTCHours()).toBe(0);
  });

  it("parses ISO string with time", () => {
    const isoString = "2024-06-15T10:30:00Z";
    const result = parseDateString(isoString);
    expect(result).toBeInstanceOf(Date);
    expect(result?.getUTCFullYear()).toBe(2024);
  });

  it("returns null for invalid date string", () => {
    expect(parseDateString("invalid-date")).toBeNull();
  });

  it("returns null for malformed YYYY-MM-DD", () => {
    expect(parseDateString("2024-13-45")).toBeNull();
  });

  it("returns null for wrapped dates like Feb 30", () => {
    expect(parseDateString("2024-02-30")).toBeNull();
  });

  it("returns null for wrapped dates like Apr 31", () => {
    expect(parseDateString("2024-04-31")).toBeNull();
  });
});

describe("formatDate", () => {
  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
  });

  it("formats Date object correctly", () => {
    const date = new Date(Date.UTC(2024, 5, 15));
    const result = formatDate(date);
    expect(result).toBe("June 15, 2024");
  });

  it("formats YYYY-MM-DD string correctly", () => {
    const result = formatDate("2024-06-15");
    expect(result).toBe("June 15, 2024");
  });

  it("returns empty string for invalid date string", () => {
    expect(formatDate("invalid")).toBe("");
  });
});

describe("formatDateForInput", () => {
  it("returns empty string for null", () => {
    expect(formatDateForInput(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDateForInput(undefined)).toBe("");
  });

  it("formats Date object as YYYY-MM-DD", () => {
    const date = new Date(Date.UTC(2024, 5, 15));
    expect(formatDateForInput(date)).toBe("2024-06-15");
  });

  it("formats date with single-digit month and day correctly", () => {
    const date = new Date(Date.UTC(2024, 0, 5));
    expect(formatDateForInput(date)).toBe("2024-01-05");
  });

  it("formats string date correctly", () => {
    expect(formatDateForInput("2024-06-15")).toBe("2024-06-15");
  });

  it("returns empty string for invalid date string", () => {
    expect(formatDateForInput("invalid")).toBe("");
  });
});

describe("calculateAge", () => {
  afterEach(() => {
    setSystemTime();
  });

  it("returns null for null dateOfBirth", () => {
    expect(calculateAge(null)).toBeNull();
  });

  it("returns null for undefined dateOfBirth", () => {
    expect(calculateAge(undefined)).toBeNull();
  });

  it("calculates age correctly", () => {
    setSystemTime(new Date(Date.UTC(2024, 5, 15)));
    const dob = new Date(Date.UTC(1990, 5, 15));
    expect(calculateAge(dob)).toBe(34);
  });

  it("calculates age when birthday hasn't occurred this year", () => {
    setSystemTime(new Date(Date.UTC(2024, 5, 14)));
    const dob = new Date(Date.UTC(1990, 5, 15));
    expect(calculateAge(dob)).toBe(33);
  });

  it("calculates age with dateOfPassing", () => {
    const dob = new Date(Date.UTC(1990, 5, 15));
    const dop = new Date(Date.UTC(2020, 5, 15));
    expect(calculateAge(dob, dop)).toBe(30);
  });

  it("calculates age when passing occurred before birthday in year", () => {
    const dob = new Date(Date.UTC(1990, 5, 15));
    const dop = new Date(Date.UTC(2020, 5, 14));
    expect(calculateAge(dob, dop)).toBe(29);
  });

  it("handles same month but earlier day", () => {
    setSystemTime(new Date(Date.UTC(2024, 5, 10)));
    const dob = new Date(Date.UTC(1990, 5, 15));
    expect(calculateAge(dob)).toBe(33);
  });
});

describe("generateRandomPassword", () => {
  it("generates password with default length", () => {
    const password = generateRandomPassword();
    expect(password).toHaveLength(16);
  });

  it("generates password with custom length", () => {
    const password = generateRandomPassword(24);
    expect(password).toHaveLength(24);
  });

  it("generates password with valid characters", () => {
    const password = generateRandomPassword();
    const validChars = /^[a-zA-Z0-9!@#$%^&*]+$/;
    expect(password).toMatch(validChars);
  });

  it("generates different passwords each time", () => {
    const password1 = generateRandomPassword();
    const password2 = generateRandomPassword();
    expect(password1).not.toBe(password2);
  });
});

describe("getInitials", () => {
  it("returns initials in uppercase", () => {
    expect(getInitials("John", "Doe")).toBe("JD");
  });

  it("handles lowercase names", () => {
    expect(getInitials("john", "doe")).toBe("JD");
  });

  it("handles single character names", () => {
    expect(getInitials("A", "B")).toBe("AB");
  });

  it("handles names with special characters", () => {
    expect(getInitials("José", "María")).toBe("JM");
  });
});

describe("createDateOnly", () => {
  it("creates date at midnight UTC", () => {
    const date = createDateOnly(2024, 6, 15);
    expect(date.getUTCFullYear()).toBe(2024);
    expect(date.getUTCMonth()).toBe(5); // 0-based
    expect(date.getUTCDate()).toBe(15);
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(0);
  });

  it("handles single digit month and day", () => {
    const date = createDateOnly(2024, 1, 5);
    expect(date.getUTCFullYear()).toBe(2024);
    expect(date.getUTCMonth()).toBe(0);
    expect(date.getUTCDate()).toBe(5);
  });
});

describe("toDateOnly", () => {
  it("converts date with time to date-only at midnight UTC", () => {
    const dateWithTime = new Date("2024-06-15T14:30:45.123Z");
    const dateOnly = toDateOnly(dateWithTime);
    expect(dateOnly.getUTCFullYear()).toBe(2024);
    expect(dateOnly.getUTCMonth()).toBe(5);
    expect(dateOnly.getUTCDate()).toBe(15);
    expect(dateOnly.getUTCHours()).toBe(0);
    expect(dateOnly.getUTCMinutes()).toBe(0);
    expect(dateOnly.getUTCSeconds()).toBe(0);
  });

  it("preserves date-only values", () => {
    const dateOnly = new Date(Date.UTC(2024, 5, 15));
    const result = toDateOnly(dateOnly);
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(5);
    expect(result.getUTCDate()).toBe(15);
    expect(result.getUTCHours()).toBe(0);
  });
});
