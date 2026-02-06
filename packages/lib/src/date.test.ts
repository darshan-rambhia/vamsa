/**
 * Unit Tests for Date Utilities
 * Tests all date parsing, formatting, and calculation functions
 */
import { describe, expect, test } from "vitest";
import {
  calculateAge,
  createDateOnly,
  formatDate,
  formatDateForInput,
  parseDateString,
  toDateOnly,
} from "./date";

describe("parseDateString", () => {
  describe("valid dates", () => {
    test("parses YYYY-MM-DD format", () => {
      const result = parseDateString("2023-06-15");
      expect(result).not.toBeNull();
      expect(result?.getUTCFullYear()).toBe(2023);
      expect(result?.getUTCMonth()).toBe(5); // 0-indexed
      expect(result?.getUTCDate()).toBe(15);
    });

    test("parses date at beginning of year", () => {
      const result = parseDateString("2023-01-01");
      expect(result).not.toBeNull();
      expect(result?.getUTCFullYear()).toBe(2023);
      expect(result?.getUTCMonth()).toBe(0);
      expect(result?.getUTCDate()).toBe(1);
    });

    test("parses date at end of year", () => {
      const result = parseDateString("2023-12-31");
      expect(result).not.toBeNull();
      expect(result?.getUTCFullYear()).toBe(2023);
      expect(result?.getUTCMonth()).toBe(11);
      expect(result?.getUTCDate()).toBe(31);
    });

    test("parses leap year date", () => {
      const result = parseDateString("2024-02-29");
      expect(result).not.toBeNull();
      expect(result?.getUTCFullYear()).toBe(2024);
      expect(result?.getUTCMonth()).toBe(1);
      expect(result?.getUTCDate()).toBe(29);
    });

    test("parses ISO string with time", () => {
      const result = parseDateString("2023-06-15T12:30:00Z");
      expect(result).not.toBeNull();
      expect(result?.getUTCFullYear()).toBe(2023);
    });
  });

  describe("invalid dates", () => {
    test("returns null for empty string", () => {
      expect(parseDateString("")).toBeNull();
    });

    test("returns null for null", () => {
      expect(parseDateString(null)).toBeNull();
    });

    test("returns null for undefined", () => {
      expect(parseDateString(undefined)).toBeNull();
    });

    test("returns null for whitespace only", () => {
      expect(parseDateString("   ")).toBeNull();
    });

    test("returns null for invalid month (0)", () => {
      expect(parseDateString("2023-00-15")).toBeNull();
    });

    test("returns null for invalid month (13)", () => {
      expect(parseDateString("2023-13-15")).toBeNull();
    });

    test("returns null for invalid day (0)", () => {
      expect(parseDateString("2023-06-00")).toBeNull();
    });

    test("returns null for invalid day (32)", () => {
      expect(parseDateString("2023-06-32")).toBeNull();
    });

    test("returns null for Feb 29 on non-leap year", () => {
      expect(parseDateString("2023-02-29")).toBeNull();
    });

    test("returns null for invalid format", () => {
      expect(parseDateString("15/06/2023")).toBeNull();
    });

    test("returns null for random string", () => {
      expect(parseDateString("not a date")).toBeNull();
    });
  });

  describe("edge cases", () => {
    test("handles dates far in the past", () => {
      const result = parseDateString("1850-03-15");
      expect(result).not.toBeNull();
      expect(result?.getUTCFullYear()).toBe(1850);
    });

    test("handles dates in the future", () => {
      const result = parseDateString("2100-12-25");
      expect(result).not.toBeNull();
      expect(result?.getUTCFullYear()).toBe(2100);
    });
  });
});

describe("formatDate", () => {
  test("formats Date object", () => {
    const date = new Date(Date.UTC(2023, 5, 15)); // June 15, 2023
    const result = formatDate(date);
    expect(result).toBe("June 15, 2023");
  });

  test("formats date string", () => {
    const result = formatDate("2023-06-15");
    expect(result).toBe("June 15, 2023");
  });

  test("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  test("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
  });

  test("returns empty string for invalid date string", () => {
    expect(formatDate("invalid")).toBe("");
  });

  test("handles different months", () => {
    expect(formatDate("2023-01-01")).toBe("January 1, 2023");
    expect(formatDate("2023-07-04")).toBe("July 4, 2023");
    expect(formatDate("2023-12-25")).toBe("December 25, 2023");
  });
});

describe("formatDateForInput", () => {
  test("formats Date object to YYYY-MM-DD", () => {
    const date = new Date(Date.UTC(2023, 5, 15));
    const result = formatDateForInput(date);
    expect(result).toBe("2023-06-15");
  });

  test("formats date string to YYYY-MM-DD", () => {
    const result = formatDateForInput("2023-06-15");
    expect(result).toBe("2023-06-15");
  });

  test("pads month and day with zeros", () => {
    const date = new Date(Date.UTC(2023, 0, 5)); // Jan 5
    const result = formatDateForInput(date);
    expect(result).toBe("2023-01-05");
  });

  test("returns empty string for null", () => {
    expect(formatDateForInput(null)).toBe("");
  });

  test("returns empty string for undefined", () => {
    expect(formatDateForInput(undefined)).toBe("");
  });

  test("returns empty string for invalid string", () => {
    expect(formatDateForInput("not a date")).toBe("");
  });
});

describe("calculateAge", () => {
  test("calculates age correctly", () => {
    const dob = new Date(Date.UTC(1990, 0, 15)); // Jan 15, 1990
    const referenceDate = new Date(Date.UTC(2023, 5, 15)); // June 15, 2023
    const age = calculateAge(dob, referenceDate);
    expect(age).toBe(33);
  });

  test("returns null for null date of birth", () => {
    expect(calculateAge(null)).toBeNull();
  });

  test("returns null for undefined date of birth", () => {
    expect(calculateAge(undefined)).toBeNull();
  });

  test("handles birthday not yet reached this year", () => {
    const dob = new Date(Date.UTC(1990, 11, 25)); // Dec 25, 1990
    const referenceDate = new Date(Date.UTC(2023, 5, 15)); // June 15, 2023
    const age = calculateAge(dob, referenceDate);
    expect(age).toBe(32); // Birthday hasn't happened yet
  });

  test("handles birthday exactly on reference date", () => {
    const dob = new Date(Date.UTC(1990, 5, 15)); // June 15, 1990
    const referenceDate = new Date(Date.UTC(2023, 5, 15)); // June 15, 2023
    const age = calculateAge(dob, referenceDate);
    expect(age).toBe(33); // Birthday is today
  });

  test("calculates age at death (dateOfPassing)", () => {
    const dob = new Date(Date.UTC(1950, 0, 1)); // Jan 1, 1950
    const dop = new Date(Date.UTC(2020, 6, 15)); // July 15, 2020
    const age = calculateAge(dob, dop);
    expect(age).toBe(70);
  });

  test("handles very young age", () => {
    const dob = new Date(Date.UTC(2023, 0, 1));
    const referenceDate = new Date(Date.UTC(2023, 5, 15));
    const age = calculateAge(dob, referenceDate);
    expect(age).toBe(0);
  });

  test("handles century boundaries", () => {
    const dob = new Date(Date.UTC(1899, 11, 31)); // Dec 31, 1899
    const referenceDate = new Date(Date.UTC(2000, 0, 1)); // Jan 1, 2000
    const age = calculateAge(dob, referenceDate);
    expect(age).toBe(100);
  });
});

describe("createDateOnly", () => {
  test("creates date at midnight UTC", () => {
    const date = createDateOnly(2023, 6, 15);
    expect(date.getUTCFullYear()).toBe(2023);
    expect(date.getUTCMonth()).toBe(5); // 0-indexed
    expect(date.getUTCDate()).toBe(15);
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(0);
  });

  test("handles month 1-based input", () => {
    const date = createDateOnly(2023, 1, 1); // January
    expect(date.getUTCMonth()).toBe(0);
  });

  test("handles month 12", () => {
    const date = createDateOnly(2023, 12, 31); // December
    expect(date.getUTCMonth()).toBe(11);
  });
});

describe("toDateOnly", () => {
  test("strips time from date", () => {
    const original = new Date("2023-06-15T14:30:45.123Z");
    const result = toDateOnly(original);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  test("preserves date components", () => {
    const original = new Date("2023-06-15T23:59:59.999Z");
    const result = toDateOnly(original);
    expect(result.getUTCFullYear()).toBe(2023);
    expect(result.getUTCMonth()).toBe(5);
    expect(result.getUTCDate()).toBe(15);
  });

  test("handles already midnight date", () => {
    const original = new Date(Date.UTC(2023, 5, 15));
    const result = toDateOnly(original);
    expect(result.getTime()).toBe(original.getTime());
  });
});
