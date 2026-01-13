/**
 * Backup Scheduler Utilities
 *
 * Provides cron expression generation and schedule management
 * for automated backups.
 */

/**
 * Backup types that can be scheduled
 */
export type BackupScheduleType = "DAILY" | "WEEKLY" | "MONTHLY";

/**
 * Backup schedule configuration
 */
export interface BackupSchedule {
  type: BackupScheduleType;
  enabled: boolean;
  time: string; // HH:MM format in UTC
  day?: number; // 0-6 for weekly (Sunday=0), 1-28 for monthly
}

/**
 * Generate a cron expression for a backup schedule
 *
 * @param schedule - The backup schedule configuration
 * @returns Cron expression string (minute hour day month weekday)
 *
 * @example
 * // Daily at 2:00 AM UTC
 * generateCronExpression({ type: "DAILY", enabled: true, time: "02:00" })
 * // "0 2 * * *"
 *
 * // Weekly on Sunday at 3:00 AM UTC
 * generateCronExpression({ type: "WEEKLY", enabled: true, time: "03:00", day: 0 })
 * // "0 3 * * 0"
 *
 * // Monthly on the 1st at 4:00 AM UTC
 * generateCronExpression({ type: "MONTHLY", enabled: true, time: "04:00", day: 1 })
 * // "0 4 1 * *"
 */
export function generateCronExpression(schedule: BackupSchedule): string {
  const [hours, minutes] = schedule.time.split(":").map(Number);

  switch (schedule.type) {
    case "DAILY":
      // Every day at specified time
      return `${minutes} ${hours} * * *`;

    case "WEEKLY":
      // Every week on specified day at specified time
      const weekday = schedule.day ?? 0; // Default to Sunday
      return `${minutes} ${hours} * * ${weekday}`;

    case "MONTHLY":
      // Every month on specified day at specified time
      const monthDay = schedule.day ?? 1; // Default to 1st
      return `${minutes} ${hours} ${monthDay} * *`;

    default:
      throw new Error(`Unknown schedule type: ${schedule.type}`);
  }
}

/**
 * Parse a time string in HH:MM format
 *
 * @param time - Time string in HH:MM format
 * @returns Object with hours and minutes
 * @throws Error if format is invalid
 */
export function parseTimeString(time: string): {
  hours: number;
  minutes: number;
} {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid time format: ${time}. Expected HH:MM`);
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23) {
    throw new Error(`Invalid hours: ${hours}. Must be 0-23`);
  }
  if (minutes < 0 || minutes > 59) {
    throw new Error(`Invalid minutes: ${minutes}. Must be 0-59`);
  }

  return { hours, minutes };
}

/**
 * Format hours and minutes as HH:MM string
 */
export function formatTimeString(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Get the next scheduled run time for a backup schedule
 *
 * @param schedule - The backup schedule configuration
 * @param from - Optional starting date (defaults to now)
 * @returns Date of next scheduled run
 */
export function getNextScheduledTime(
  schedule: BackupSchedule,
  from: Date = new Date()
): Date {
  const { hours, minutes } = parseTimeString(schedule.time);
  const next = new Date(from);

  // Set the time
  next.setUTCHours(hours, minutes, 0, 0);

  // If the time has already passed today, move to next occurrence
  if (next <= from) {
    switch (schedule.type) {
      case "DAILY":
        next.setUTCDate(next.getUTCDate() + 1);
        break;

      case "WEEKLY":
        // Find next occurrence of the specified weekday
        const targetDay = schedule.day ?? 0;
        const currentDay = next.getUTCDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        next.setUTCDate(next.getUTCDate() + daysUntil);
        break;

      case "MONTHLY":
        // Move to next month
        next.setUTCMonth(next.getUTCMonth() + 1);
        next.setUTCDate(schedule.day ?? 1);
        break;
    }
  } else {
    // Adjust for weekly/monthly schedules
    switch (schedule.type) {
      case "WEEKLY":
        const targetDay = schedule.day ?? 0;
        const currentDay = next.getUTCDay();
        if (currentDay !== targetDay) {
          let daysUntil = targetDay - currentDay;
          if (daysUntil < 0) daysUntil += 7;
          next.setUTCDate(next.getUTCDate() + daysUntil);
        }
        break;

      case "MONTHLY":
        const targetDate = schedule.day ?? 1;
        if (next.getUTCDate() !== targetDate) {
          next.setUTCDate(targetDate);
          // If day is in the past, move to next month
          if (next <= from) {
            next.setUTCMonth(next.getUTCMonth() + 1);
          }
        }
        break;
    }
  }

  return next;
}

/**
 * Validate a day-of-week value (0-6)
 */
export function isValidWeekday(day: number): boolean {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

/**
 * Validate a day-of-month value (1-28)
 * We use 1-28 to ensure the date exists in all months
 */
export function isValidMonthDay(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 28;
}

/**
 * Get weekday name from day number
 */
export function getWeekdayName(day: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[day] || "Unknown";
}

/**
 * Generate a human-readable description of a backup schedule
 */
export function describeSchedule(schedule: BackupSchedule): string {
  if (!schedule.enabled) {
    return `${schedule.type.toLowerCase()} backups are disabled`;
  }

  const { hours, minutes } = parseTimeString(schedule.time);
  const timeStr = formatTimeString(hours, minutes);

  switch (schedule.type) {
    case "DAILY":
      return `Daily at ${timeStr} UTC`;

    case "WEEKLY":
      const weekday = getWeekdayName(schedule.day ?? 0);
      return `Weekly on ${weekday} at ${timeStr} UTC`;

    case "MONTHLY":
      const day = schedule.day ?? 1;
      const suffix =
        day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
      return `Monthly on the ${day}${suffix} at ${timeStr} UTC`;

    default:
      return "Unknown schedule";
  }
}

/**
 * Generate a backup filename with timestamp
 *
 * @param type - The backup type
 * @param extension - File extension (default: "zip")
 * @returns Filename string
 *
 * @example
 * generateBackupFilename("DAILY")
 * // "vamsa-backup-daily-2024-01-15T02-00-00-000Z.zip"
 */
export function generateBackupFilename(
  type: BackupScheduleType | "MANUAL",
  extension: string = "zip"
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `vamsa-backup-${type.toLowerCase()}-${timestamp}.${extension}`;
}

/**
 * Calculate retention date for a backup based on type
 *
 * @param type - Backup type
 * @param retention - Number of backups to keep
 * @returns Date before which backups should be deleted
 */
export function calculateRetentionDate(
  type: BackupScheduleType,
  retention: number
): Date {
  const now = new Date();

  switch (type) {
    case "DAILY":
      // For daily backups, retention is number of days
      now.setUTCDate(now.getUTCDate() - retention);
      break;

    case "WEEKLY":
      // For weekly backups, retention is number of weeks
      now.setUTCDate(now.getUTCDate() - retention * 7);
      break;

    case "MONTHLY":
      // For monthly backups, retention is number of months
      now.setUTCMonth(now.getUTCMonth() - retention);
      break;
  }

  return now;
}
