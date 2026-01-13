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
