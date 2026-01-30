/**
 * Backup scheduler using node-cron
 *
 * Manages scheduled backup jobs:
 * - Daily backups
 * - Weekly backups
 * - Monthly backups
 * - Dynamic reconfiguration on settings changes
 */

import cron from "node-cron";
import { loggers } from "@vamsa/lib/logger";
import { db, drizzleSchema } from "../db";
import { performBackup } from "./backup-job";
import type { ScheduledTask } from "node-cron";

const log = loggers.jobs;

// Store scheduled cron jobs
const scheduledJobs: Map<string, ScheduledTask> = new Map();

/**
 * Initialize backup scheduler based on settings from database
 */
export async function initBackupScheduler(): Promise<void> {
  try {
    // Stop any existing jobs
    stopBackupScheduler();

    const [settings] = await db
      .select()
      .from(drizzleSchema.backupSettings)
      .limit(1);
    if (!settings) {
      log.info(
        {},
        "No backup settings found, skipping scheduler initialization"
      );
      return;
    }

    // Daily backup
    if (settings.dailyEnabled) {
      const [hour, minute] = settings.dailyTime.split(":").map(Number);
      const cronExpression = `${minute} ${hour} * * *`;
      const jobKey = "daily";

      try {
        const dailyJob = cron.schedule(cronExpression, async () => {
          log.info({}, "Starting scheduled daily backup");
          try {
            await performBackup("DAILY");
          } catch (error) {
            log.withErr(error).msg("Daily backup failed");
          }
        });
        scheduledJobs.set(jobKey, dailyJob);
        log.info(
          { cron: cronExpression, job: jobKey },
          "Scheduled daily backup"
        );
      } catch (error) {
        log
          .withErr(error)
          .ctx({ job: jobKey })
          .msg("Failed to schedule daily backup");
      }
    }

    // Weekly backup
    if (settings.weeklyEnabled) {
      const [hour, minute] = settings.weeklyTime.split(":").map(Number);
      const dayOfWeek = settings.weeklyDay;
      const cronExpression = `${minute} ${hour} * * ${dayOfWeek}`;
      const jobKey = "weekly";

      try {
        const weeklyJob = cron.schedule(cronExpression, async () => {
          log.info({}, "Starting scheduled weekly backup");
          try {
            await performBackup("WEEKLY");
          } catch (error) {
            log.withErr(error).msg("Weekly backup failed");
          }
        });
        scheduledJobs.set(jobKey, weeklyJob);
        log.info(
          { cron: cronExpression, job: jobKey },
          "Scheduled weekly backup"
        );
      } catch (error) {
        log
          .withErr(error)
          .ctx({ job: jobKey })
          .msg("Failed to schedule weekly backup");
      }
    }

    // Monthly backup
    if (settings.monthlyEnabled) {
      const [hour, minute] = settings.monthlyTime.split(":").map(Number);
      const dayOfMonth = Math.min(settings.monthlyDay, 28); // Ensure valid day (1-28)
      const cronExpression = `${minute} ${hour} ${dayOfMonth} * *`;
      const jobKey = "monthly";

      try {
        const monthlyJob = cron.schedule(cronExpression, async () => {
          log.info({}, "Starting scheduled monthly backup");
          try {
            await performBackup("MONTHLY");
          } catch (error) {
            log.withErr(error).msg("Monthly backup failed");
          }
        });
        scheduledJobs.set(jobKey, monthlyJob);
        log.info(
          { cron: cronExpression, job: jobKey },
          "Scheduled monthly backup"
        );
      } catch (error) {
        log
          .withErr(error)
          .ctx({ job: jobKey })
          .msg("Failed to schedule monthly backup");
      }
    }

    log.info({ jobCount: scheduledJobs.size }, "Backup scheduler initialized");
  } catch (error) {
    log.withErr(error).msg("Failed to initialize backup scheduler");
    throw error;
  }
}

/**
 * Stop all scheduled backup jobs
 */
export function stopBackupScheduler(): void {
  for (const [jobKey, job] of scheduledJobs.entries()) {
    try {
      job.stop();
      job.destroy();
      log.info({ job: jobKey }, "Stopped scheduled backup job");
    } catch (error) {
      log.warn(
        {
          error: error instanceof Error ? error.message : String(error),
          job: jobKey,
        },
        "Error stopping backup job"
      );
    }
  }
  scheduledJobs.clear();
  log.info({}, "Backup scheduler stopped");
}

/**
 * Refresh scheduler after settings change
 * Call this when backup settings are updated via the API
 */
export async function refreshBackupScheduler(): Promise<void> {
  log.info({}, "Refreshing backup scheduler");
  try {
    await initBackupScheduler();
    log.info({}, "Backup scheduler refreshed successfully");
  } catch (error) {
    log.withErr(error).msg("Failed to refresh backup scheduler");
    throw error;
  }
}

/**
 * Get the status of the scheduler
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  jobCount: number;
  jobs: Array<{ name: string; status: string }>;
} {
  const jobs = Array.from(scheduledJobs.entries()).map(([name]) => ({
    name,
    status: "running",
  }));

  return {
    isRunning: scheduledJobs.size > 0,
    jobCount: scheduledJobs.size,
    jobs,
  };
}
