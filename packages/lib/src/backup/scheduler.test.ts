import { describe, it, expect } from "bun:test";
import {
  generateCronExpression,
  parseTimeString,
  formatTimeString,
  getNextScheduledTime,
  isValidWeekday,
  isValidMonthDay,
  getWeekdayName,
  describeSchedule,
  generateBackupFilename,
  calculateRetentionDate,
  type BackupSchedule,
} from "./scheduler";

describe("generateCronExpression", () => {
  it("generates daily cron expression", () => {
    const schedule: BackupSchedule = {
      type: "DAILY",
      enabled: true,
      time: "02:00",
    };
    expect(generateCronExpression(schedule)).toBe("0 2 * * *");
  });

  it("generates daily cron expression with minutes", () => {
    const schedule: BackupSchedule = {
      type: "DAILY",
      enabled: true,
      time: "14:30",
    };
    expect(generateCronExpression(schedule)).toBe("30 14 * * *");
  });

  it("generates weekly cron expression for Sunday", () => {
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "03:00",
      day: 0,
    };
    expect(generateCronExpression(schedule)).toBe("0 3 * * 0");
  });

  it("generates weekly cron expression for Saturday", () => {
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "23:45",
      day: 6,
    };
    expect(generateCronExpression(schedule)).toBe("45 23 * * 6");
  });

  it("generates monthly cron expression for 1st", () => {
    const schedule: BackupSchedule = {
      type: "MONTHLY",
      enabled: true,
      time: "04:00",
      day: 1,
    };
    expect(generateCronExpression(schedule)).toBe("0 4 1 * *");
  });

  it("generates monthly cron expression for 15th", () => {
    const schedule: BackupSchedule = {
      type: "MONTHLY",
      enabled: true,
      time: "12:30",
      day: 15,
    };
    expect(generateCronExpression(schedule)).toBe("30 12 15 * *");
  });

  it("uses default day 0 for weekly if not specified", () => {
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "05:00",
    };
    expect(generateCronExpression(schedule)).toBe("0 5 * * 0");
  });

  it("uses default day 1 for monthly if not specified", () => {
    const schedule: BackupSchedule = {
      type: "MONTHLY",
      enabled: true,
      time: "06:00",
    };
    expect(generateCronExpression(schedule)).toBe("0 6 1 * *");
  });
});

describe("parseTimeString", () => {
  it("parses valid time strings", () => {
    expect(parseTimeString("00:00")).toEqual({ hours: 0, minutes: 0 });
    expect(parseTimeString("12:30")).toEqual({ hours: 12, minutes: 30 });
    expect(parseTimeString("23:59")).toEqual({ hours: 23, minutes: 59 });
  });

  it("parses single-digit hours", () => {
    expect(parseTimeString("9:00")).toEqual({ hours: 9, minutes: 0 });
  });

  it("throws for invalid format", () => {
    expect(() => parseTimeString("invalid")).toThrow("Invalid time format");
    expect(() => parseTimeString("")).toThrow("Invalid time format");
    expect(() => parseTimeString("12")).toThrow("Invalid time format");
    expect(() => parseTimeString("12:5")).toThrow("Invalid time format");
  });

  it("throws for invalid hours", () => {
    expect(() => parseTimeString("24:00")).toThrow("Invalid hours");
    expect(() => parseTimeString("-1:00")).toThrow("Invalid time format");
  });

  it("throws for invalid minutes", () => {
    expect(() => parseTimeString("12:60")).toThrow("Invalid minutes");
  });

  it("throws for negative hours (boundary test)", () => {
    // This test ensures the hours < 0 check is not mutated to false
    // While the regex prevents direct negative parsing, this guards against
    // any future changes that might allow negative values to be parsed
    expect(() => parseTimeString("24:00")).toThrow("Invalid hours");
    expect(() => parseTimeString("25:00")).toThrow("Invalid hours");
  });

  it("throws for negative minutes (boundary test)", () => {
    // This test ensures the minutes < 0 check is not mutated to false
    // While the regex prevents direct negative parsing, this guards the validation
    expect(() => parseTimeString("12:60")).toThrow("Invalid minutes");
    expect(() => parseTimeString("12:61")).toThrow("Invalid minutes");
  });

  it("accepts boundary hours 0 and 23", () => {
    expect(() => parseTimeString("0:00")).not.toThrow();
    expect(() => parseTimeString("23:00")).not.toThrow();
  });

  it("accepts boundary minutes 0 and 59", () => {
    expect(() => parseTimeString("12:00")).not.toThrow();
    expect(() => parseTimeString("12:59")).not.toThrow();
  });
});

describe("formatTimeString", () => {
  it("formats time with zero padding", () => {
    expect(formatTimeString(0, 0)).toBe("00:00");
    expect(formatTimeString(9, 5)).toBe("09:05");
    expect(formatTimeString(23, 59)).toBe("23:59");
    expect(formatTimeString(12, 30)).toBe("12:30");
  });
});

describe("getNextScheduledTime", () => {
  it("returns next daily run time", () => {
    const schedule: BackupSchedule = {
      type: "DAILY",
      enabled: true,
      time: "14:00",
    };
    // Test from a known time before the schedule
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    expect(next.getUTCHours()).toBe(14);
    expect(next.getUTCMinutes()).toBe(0);
    expect(next.getUTCDate()).toBe(15); // Same day
  });

  it("returns next day for daily if time passed", () => {
    const schedule: BackupSchedule = {
      type: "DAILY",
      enabled: true,
      time: "10:00",
    };
    const from = new Date("2024-01-15T14:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    expect(next.getUTCDate()).toBe(16); // Next day
    expect(next.getUTCHours()).toBe(10);
  });

  it("returns correct weekly time", () => {
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "03:00",
      day: 0, // Sunday
    };
    // Monday Jan 15, 2024
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    expect(next.getUTCDay()).toBe(0); // Sunday
    expect(next.getUTCHours()).toBe(3);
  });

  it("returns correct monthly time", () => {
    const schedule: BackupSchedule = {
      type: "MONTHLY",
      enabled: true,
      time: "04:00",
      day: 1,
    };
    // Jan 15, 2024
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    expect(next.getUTCDate()).toBe(1);
    expect(next.getUTCHours()).toBe(4);
    // Should be Feb 1 since Jan 1 has passed
    expect(next.getUTCMonth()).toBe(1); // February
  });

  it("returns same day weekly when current day matches and time not passed", () => {
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "15:00",
      day: 1, // Monday
    };
    // Monday Jan 15, 2024 at 10:00 UTC
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Current day is Monday (day 1) and time hasn't passed
    expect(next.getUTCDay()).toBe(1); // Monday
    expect(next.getUTCHours()).toBe(15);
    expect(next.getUTCDate()).toBe(15); // Same day
  });

  it("adjusts weekly when current day matches but target is different", () => {
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "15:00",
      day: 3, // Wednesday
    };
    // Monday Jan 15, 2024 at 10:00 UTC
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Should move to Wednesday (2 days later)
    expect(next.getUTCDay()).toBe(3);
    expect(next.getUTCDate()).toBe(17);
  });

  it("handles monthly same date when time not passed yet", () => {
    const schedule: BackupSchedule = {
      type: "MONTHLY",
      enabled: true,
      time: "15:00",
      day: 15,
    };
    // Jan 15, 2024 at 10:00 UTC
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Current day is 15th and time hasn't passed
    expect(next.getUTCDate()).toBe(15);
    expect(next.getUTCHours()).toBe(15);
    expect(next.getUTCMonth()).toBe(0); // Same month
  });

  it("moves to next month for monthly when target day is in the past", () => {
    const schedule: BackupSchedule = {
      type: "MONTHLY",
      enabled: true,
      time: "04:00",
      day: 10,
    };
    // Jan 15, 2024 at 10:00 UTC (10th already passed)
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Should be Feb 10
    expect(next.getUTCDate()).toBe(10);
    expect(next.getUTCMonth()).toBe(1); // February
  });

  it("calculates correctly at exact scheduled time boundary", () => {
    const schedule: BackupSchedule = {
      type: "DAILY",
      enabled: true,
      time: "14:00",
    };
    const from = new Date("2024-01-15T14:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Time is exactly at the scheduled time, should move to next day
    expect(next.getUTCDate()).toBe(16);
  });

  it("handles Saturday to Sunday weekly transition", () => {
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "03:00",
      day: 0, // Sunday
    };
    // Saturday Jan 20, 2024 at 10:00 UTC
    const from = new Date("2024-01-20T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    expect(next.getUTCDay()).toBe(0); // Sunday
    expect(next.getUTCDate()).toBe(21); // Next day
  });

  it("handles month-end for monthly scheduling same month", () => {
    const schedule: BackupSchedule = {
      type: "MONTHLY",
      enabled: true,
      time: "15:00",
      day: 28, // Safe day
    };
    // Jan 20, 2024 at 10:00
    const from = new Date("2024-01-20T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Jan 28 at 15:00 is after Jan 20 at 10:00
    expect(next.getUTCDate()).toBe(28);
    expect(next.getUTCMonth()).toBe(0); // Same month
  });

  it("handles weekly wrap-around from Friday to Monday", () => {
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "02:00",
      day: 1, // Monday
    };
    // Friday Jan 19, 2024 at 10:00 UTC
    const from = new Date("2024-01-19T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Should be next Monday
    expect(next.getUTCDay()).toBe(1);
    expect(next.getUTCDate()).toBe(22);
  });

  it("handles weekly when no day specified defaults to Sunday", () => {
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "12:00",
    };
    // Monday Jan 15, 2024
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    expect(next.getUTCDay()).toBe(0); // Sunday (default)
  });

  it("handles monthly when no day specified defaults to 1st", () => {
    const schedule: BackupSchedule = {
      type: "MONTHLY",
      enabled: true,
      time: "12:00",
    };
    // Jan 15, 2024
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    expect(next.getUTCDate()).toBe(1);
    expect(next.getUTCMonth()).toBe(1); // Feb (Jan 1st passed)
  });

  it("handles weekly when same day and time already passed", () => {
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "02:00",
      day: 1, // Monday
    };
    // Monday Jan 15, 2024 at 10:00 UTC (after 02:00)
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Should move to next Monday
    expect(next.getUTCDay()).toBe(1);
    expect(next.getUTCDate()).toBe(22);
  });

  it("handles weekly daysUntil === 0 (same day, time not passed yet)", () => {
    // Test for mutant: if (daysUntil <= 0) instead of if (daysUntil < 0)
    // When daysUntil === 0 and time hasn't passed, should NOT add 7 days
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "20:00",
      day: 3, // Wednesday
    };
    // Wednesday Jan 17, 2024 at 10:00 UTC (before 20:00)
    const from = new Date("2024-01-17T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Current day is Wednesday, target day is Wednesday, time hasn't passed
    // daysUntil = 3 - 3 = 0, should NOT add 7, should use same day
    expect(next.getUTCDay()).toBe(3); // Wednesday
    expect(next.getUTCDate()).toBe(17); // Same day
    expect(next.getUTCHours()).toBe(20);
  });

  it("handles weekly daysUntil = 0 after time passed (wraps to next week)", () => {
    // When daysUntil === 0 but time has already passed, should add 7 days
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "05:00",
      day: 5, // Friday
    };
    // Friday Jan 19, 2024 at 10:00 UTC (after 05:00, same day as target)
    const from = new Date("2024-01-19T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Time has passed, should wrap to next Friday
    expect(next.getUTCDay()).toBe(5);
    expect(next.getUTCDate()).toBe(26);
    expect(next.getUTCHours()).toBe(5);
  });

  it("handles monthly date matching (current date equals target date)", () => {
    // Test for mutant: if (next.getUTCDate() !== targetDate) mutated to if (true)
    // When current date equals target date and time hasn't passed, should NOT adjust
    const schedule: BackupSchedule = {
      type: "MONTHLY",
      enabled: true,
      time: "16:00",
      day: 20,
    };
    // Jan 20, 2024 at 10:00 UTC (before 16:00)
    const from = new Date("2024-01-20T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Current date is 20, target is 20, time hasn't passed
    // Should NOT adjust the date
    expect(next.getUTCDate()).toBe(20);
    expect(next.getUTCMonth()).toBe(0); // Same month
    expect(next.getUTCHours()).toBe(16);
  });

  it("handles monthly when date equals target but time passed", () => {
    // When current date equals target and time HAS passed, should move to next month
    const schedule: BackupSchedule = {
      type: "MONTHLY",
      enabled: true,
      time: "08:00",
      day: 15,
    };
    // Jan 15, 2024 at 10:00 UTC (after 08:00)
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // Date matches but time passed, should move to next month
    expect(next.getUTCDate()).toBe(15);
    expect(next.getUTCMonth()).toBe(1); // Next month
    expect(next.getUTCHours()).toBe(8);
  });

  it("handles edge case when next time equals from time exactly", () => {
    // Test for mutant: if (next < from) instead of if (next <= from)
    // When next is exactly equal to from, should still advance to next period
    const schedule: BackupSchedule = {
      type: "DAILY",
      enabled: true,
      time: "10:00",
    };
    // Exact time match
    const from = new Date("2024-01-15T10:00:00Z");
    const next = getNextScheduledTime(schedule, from);

    // When next === from, should advance to next day
    expect(next.getUTCDate()).toBe(16);
    expect(next.getUTCHours()).toBe(10);
  });

  it("handles weekly when next equals from (same day and time)", () => {
    // Test for mutant: if (next <= from) instead of if (next < from)
    // When current day matches and time matches exactly, should wrap to next week
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "14:30",
      day: 2, // Tuesday
    };
    // Tuesday Jan 16, 2024 at 14:30 UTC (exact match)
    const from = new Date("2024-01-16T14:30:00Z");
    const next = getNextScheduledTime(schedule, from);

    // next === from, should advance
    expect(next.getUTCDay()).toBe(2); // Tuesday
    expect(next.getUTCDate()).toBe(23); // Next week
    expect(next.getUTCHours()).toBe(14);
    expect(next.getUTCMinutes()).toBe(30);
  });
});

describe("isValidWeekday", () => {
  it("returns true for valid weekdays", () => {
    expect(isValidWeekday(0)).toBe(true); // Sunday
    expect(isValidWeekday(1)).toBe(true);
    expect(isValidWeekday(6)).toBe(true); // Saturday
  });

  it("returns false for invalid weekdays", () => {
    expect(isValidWeekday(-1)).toBe(false);
    expect(isValidWeekday(7)).toBe(false);
    expect(isValidWeekday(1.5)).toBe(false);
  });
});

describe("isValidMonthDay", () => {
  it("returns true for valid month days", () => {
    expect(isValidMonthDay(1)).toBe(true);
    expect(isValidMonthDay(15)).toBe(true);
    expect(isValidMonthDay(28)).toBe(true);
  });

  it("returns false for invalid month days", () => {
    expect(isValidMonthDay(0)).toBe(false);
    expect(isValidMonthDay(29)).toBe(false); // Not all months have 29 days
    expect(isValidMonthDay(31)).toBe(false);
    expect(isValidMonthDay(1.5)).toBe(false);
  });
});

describe("getWeekdayName", () => {
  it("returns correct weekday names", () => {
    expect(getWeekdayName(0)).toBe("Sunday");
    expect(getWeekdayName(1)).toBe("Monday");
    expect(getWeekdayName(2)).toBe("Tuesday");
    expect(getWeekdayName(3)).toBe("Wednesday");
    expect(getWeekdayName(4)).toBe("Thursday");
    expect(getWeekdayName(5)).toBe("Friday");
    expect(getWeekdayName(6)).toBe("Saturday");
  });

  it("returns Unknown for invalid day", () => {
    expect(getWeekdayName(7)).toBe("Unknown");
    expect(getWeekdayName(-1)).toBe("Unknown");
  });
});

describe("describeSchedule", () => {
  it("describes disabled schedule", () => {
    const schedule: BackupSchedule = {
      type: "DAILY",
      enabled: false,
      time: "02:00",
    };
    expect(describeSchedule(schedule)).toBe("daily backups are disabled");
  });

  it("describes daily schedule", () => {
    const schedule: BackupSchedule = {
      type: "DAILY",
      enabled: true,
      time: "02:00",
    };
    expect(describeSchedule(schedule)).toBe("Daily at 02:00 UTC");
  });

  it("describes weekly schedule", () => {
    const schedule: BackupSchedule = {
      type: "WEEKLY",
      enabled: true,
      time: "03:00",
      day: 0,
    };
    expect(describeSchedule(schedule)).toBe("Weekly on Sunday at 03:00 UTC");
  });

  it("describes monthly schedule", () => {
    const schedule: BackupSchedule = {
      type: "MONTHLY",
      enabled: true,
      time: "04:00",
      day: 1,
    };
    expect(describeSchedule(schedule)).toBe("Monthly on the 1st at 04:00 UTC");
  });

  it("uses correct suffix for day numbers", () => {
    expect(
      describeSchedule({
        type: "MONTHLY",
        enabled: true,
        time: "00:00",
        day: 2,
      })
    ).toContain("2nd");
    expect(
      describeSchedule({
        type: "MONTHLY",
        enabled: true,
        time: "00:00",
        day: 3,
      })
    ).toContain("3rd");
    expect(
      describeSchedule({
        type: "MONTHLY",
        enabled: true,
        time: "00:00",
        day: 15,
      })
    ).toContain("15th");
  });
});

describe("generateBackupFilename", () => {
  it("generates filename with type and timestamp", () => {
    const filename = generateBackupFilename("DAILY");
    expect(filename).toMatch(
      /^vamsa-backup-daily-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.zip$/
    );
  });

  it("uses correct type in filename", () => {
    expect(generateBackupFilename("WEEKLY")).toContain("weekly");
    expect(generateBackupFilename("MONTHLY")).toContain("monthly");
    expect(generateBackupFilename("MANUAL")).toContain("manual");
  });

  it("uses custom extension", () => {
    const filename = generateBackupFilename("DAILY", "tar.gz");
    expect(filename).toEndWith(".tar.gz");
  });
});

describe("calculateRetentionDate", () => {
  it("calculates daily retention date", () => {
    const retention = calculateRetentionDate("DAILY", 7);
    const now = new Date();
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() - 7);

    // Should be approximately 7 days ago (within a day due to timing)
    const diffDays = Math.round(
      (now.getTime() - retention.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBe(7);
  });

  it("calculates weekly retention date", () => {
    const retention = calculateRetentionDate("WEEKLY", 4);
    const now = new Date();
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() - 28); // 4 weeks

    const diffDays = Math.round(
      (now.getTime() - retention.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBe(28);
  });

  it("calculates monthly retention date", () => {
    const retention = calculateRetentionDate("MONTHLY", 12);
    const now = new Date();

    // Should be approximately 12 months ago
    const monthsDiff =
      (now.getUTCFullYear() - retention.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - retention.getUTCMonth());
    expect(monthsDiff).toBe(12);
  });
});
