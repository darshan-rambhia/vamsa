import { describe, test, expect } from "bun:test";
import { toDateOnly, parseDateString, formatDateForInput } from "@/lib/utils";

describe("Date handling for Person actions", () => {
  test("toDateOnly converts dates to UTC midnight", () => {
    // Test with a date that has time components
    const dateWithTime = new Date("2023-05-15T14:30:00.000Z");
    const dateOnly = toDateOnly(dateWithTime);

    expect(dateOnly.getUTCFullYear()).toBe(2023);
    expect(dateOnly.getUTCMonth()).toBe(4); // May is month 4 (0-indexed)
    expect(dateOnly.getUTCDate()).toBe(15);
    expect(dateOnly.getUTCHours()).toBe(0);
    expect(dateOnly.getUTCMinutes()).toBe(0);
    expect(dateOnly.getUTCSeconds()).toBe(0);
    expect(dateOnly.getUTCMilliseconds()).toBe(0);
  });

  test("parseDateString handles YYYY-MM-DD format correctly", () => {
    const dateString = "1990-12-25";
    const parsed = parseDateString(dateString);

    expect(parsed).not.toBeNull();
    expect(parsed!.getUTCFullYear()).toBe(1990);
    expect(parsed!.getUTCMonth()).toBe(11); // December is month 11 (0-indexed)
    expect(parsed!.getUTCDate()).toBe(25);
    expect(parsed!.getUTCHours()).toBe(0);
    expect(parsed!.getUTCMinutes()).toBe(0);
    expect(parsed!.getUTCSeconds()).toBe(0);
  });

  test("parseDateString returns null for invalid dates", () => {
    expect(parseDateString("")).toBeNull();
    expect(parseDateString(null)).toBeNull();
    expect(parseDateString(undefined)).toBeNull();
    expect(parseDateString("invalid-date")).toBeNull();
    expect(parseDateString("2023-13-01")).toBeNull(); // Invalid month
    expect(parseDateString("2023-02-30")).toBeNull(); // Invalid day
  });

  test("formatDateForInput converts dates back to YYYY-MM-DD", () => {
    const date = new Date(Date.UTC(1985, 6, 4)); // July 4, 1985
    const formatted = formatDateForInput(date);

    expect(formatted).toBe("1985-07-04");
  });

  test("date handling preserves date across parse and format cycle", () => {
    const originalDateString = "1975-08-15";
    const parsed = parseDateString(originalDateString);
    const dateOnly = toDateOnly(parsed!);
    const formatted = formatDateForInput(dateOnly);

    expect(formatted).toBe(originalDateString);
  });

  test("date handling works with edge cases", () => {
    // Leap year
    const leapYear = parseDateString("2000-02-29");
    expect(leapYear).not.toBeNull();
    expect(formatDateForInput(leapYear!)).toBe("2000-02-29");

    // Year boundaries
    const newYear = parseDateString("2023-01-01");
    expect(newYear).not.toBeNull();
    expect(formatDateForInput(newYear!)).toBe("2023-01-01");

    const endYear = parseDateString("2023-12-31");
    expect(endYear).not.toBeNull();
    expect(formatDateForInput(endYear!)).toBe("2023-12-31");
  });

  test("toDateOnly handles timezone edge cases", () => {
    // Test with a date that would shift across timezone boundaries
    const dateNearMidnight = new Date("2023-05-15T23:59:59.999Z");
    const dateOnly = toDateOnly(dateNearMidnight);

    // Should still be May 15th in UTC
    expect(dateOnly.getUTCFullYear()).toBe(2023);
    expect(dateOnly.getUTCMonth()).toBe(4); // May
    expect(dateOnly.getUTCDate()).toBe(15);
    expect(dateOnly.getUTCHours()).toBe(0);
  });
});
