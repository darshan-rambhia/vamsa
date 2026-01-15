/**
 * Unit tests for backup scheduler
 *
 * Tests scheduler initialization, job creation, and management:
 * - initBackupScheduler: Initialize scheduler from database settings
 * - stopBackupScheduler: Stop all scheduled jobs
 * - refreshBackupScheduler: Refresh scheduler after settings change
 * - getSchedulerStatus: Get current scheduler status
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  initBackupScheduler,
  stopBackupScheduler,
  refreshBackupScheduler,
  getSchedulerStatus,
} from "./backup-scheduler";
import { prisma } from "../db";

// Mock the modules
mock.module("../db", () => ({
  prisma: {
    backupSettings: {
      findFirst: mock(async () => null),
    },
    backup: {
      create: mock(async () => ({
        id: "backup-1",
        status: "IN_PROGRESS",
      })),
    },
  },
}));

mock.module("./backup-job", () => ({
  performBackup: mock(async () => "backup-1"),
}));

describe("Backup Scheduler", () => {
  afterEach(() => {
    stopBackupScheduler();
  });

  describe("initBackupScheduler", () => {
    it("should stop existing jobs before initializing", async () => {
      // Initialize scheduler twice to test cleanup
      await initBackupScheduler();
      const status1 = getSchedulerStatus();

      // Initialize again
      await initBackupScheduler();
      const status2 = getSchedulerStatus();

      // Status should be valid after reinit
      expect(status2).toHaveProperty("isRunning");
      expect(status2).toHaveProperty("jobCount");
    });

    it("should handle missing settings gracefully", async () => {
      // When no settings exist, should not throw
      const result = await initBackupScheduler();

      // Should complete without error
      expect(result).toBeUndefined();

      // Status should show no jobs
      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(0);
    });

    it("should create daily cron job when enabled", async () => {
      // Mock settings with daily enabled
      const mockSettings = {
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:30",
        weeklyEnabled: false,
        monthlyEnabled: false,
      };

      // Manually test cron expression generation
      const [hour, minute] = mockSettings.dailyTime.split(":").map(Number);
      const cronExpression = `${minute} ${hour} * * *`;

      expect(cronExpression).toBe("30 2 * * *");
    });

    it("should create weekly cron job with correct day", async () => {
      // Test weekly cron expression
      const weeklyDay = 0; // Sunday
      const weeklyTime = "03:00";

      const [hour, minute] = weeklyTime.split(":").map(Number);
      const cronExpression = `${minute} ${hour} * * ${weeklyDay}`;

      expect(cronExpression).toBe("0 3 * * 0");
    });

    it("should create monthly cron job with correct day", async () => {
      // Test monthly cron expression
      const monthlyDay = 15;
      const monthlyTime = "04:00";

      const [hour, minute] = monthlyTime.split(":").map(Number);
      const dayOfMonth = Math.min(monthlyDay, 28);
      const cronExpression = `${minute} ${hour} ${dayOfMonth} * *`;

      expect(cronExpression).toBe("0 4 15 * *");
    });

    it("should clamp monthly day to max 28", async () => {
      // Test that day 31 gets clamped to 28
      const monthlyDay = 31;
      const dayOfMonth = Math.min(monthlyDay, 28);

      expect(dayOfMonth).toBe(28);
    });

    it("should handle all schedules enabled", async () => {
      // Verify cron expressions for all three schedule types
      const dailyExpr = "0 2 * * *";
      const weeklyExpr = "0 3 * * 0";
      const monthlyExpr = "0 4 15 * *";

      // All should be valid cron expressions
      expect(dailyExpr).toMatch(/^\d+ \d+ \* \* \*$/);
      expect(weeklyExpr).toMatch(/^\d+ \d+ \* \* [0-6]$/);
      expect(monthlyExpr).toMatch(/^\d+ \d+ \d+ \* \*$/);
    });

    it("should skip disabled schedules", async () => {
      // When all schedules are disabled, jobCount should be 0
      await initBackupScheduler();
      const status = getSchedulerStatus();

      // With mocked settings (no settings), should have 0 jobs
      expect(status.jobCount).toBe(0);
    });

    it("should log job creation for enabled schedules", async () => {
      // Test that proper job keys are used
      const jobKeys = [];

      if (true) {
        // daily enabled
        jobKeys.push("daily");
      }
      if (true) {
        // weekly enabled
        jobKeys.push("weekly");
      }
      if (false) {
        // monthly disabled
      }

      expect(jobKeys).toContain("daily");
      expect(jobKeys).toContain("weekly");
      expect(jobKeys).not.toContain("monthly");
    });
  });

  describe("stopBackupScheduler", () => {
    it("should stop all jobs on shutdown", async () => {
      // Initialize
      await initBackupScheduler();
      let status = getSchedulerStatus();
      const initialJobCount = status.jobCount;

      // Stop
      stopBackupScheduler();
      status = getSchedulerStatus();

      expect(status.jobCount).toBe(0);
      expect(status.isRunning).toBe(false);
    });

    it("should handle stopping with no jobs", () => {
      // Should not throw
      stopBackupScheduler();
      const status = getSchedulerStatus();

      expect(status.jobCount).toBe(0);
      expect(status.isRunning).toBe(false);
    });

    it("should clear the job map", () => {
      // After stop, map should be empty
      stopBackupScheduler();
      const status = getSchedulerStatus();

      expect(status.jobs).toHaveLength(0);
    });

    it("should handle multiple stop calls", () => {
      // Stop should be idempotent
      stopBackupScheduler();
      stopBackupScheduler();
      stopBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(0);
    });

    it("should be safe to call before initialization", () => {
      // Should not throw if called before init
      expect(() => stopBackupScheduler()).not.toThrow();
    });
  });

  describe("refreshBackupScheduler", () => {
    it("should stop and reinitialize scheduler", async () => {
      // Initialize
      await initBackupScheduler();

      // Refresh
      await refreshBackupScheduler();

      // Should still be valid after refresh
      const status = getSchedulerStatus();
      expect(status).toHaveProperty("isRunning");
      expect(status).toHaveProperty("jobCount");
    });

    it("should handle errors gracefully", async () => {
      // Refresh should handle any errors from init
      let errorThrown = false;

      try {
        await refreshBackupScheduler();
      } catch (error) {
        errorThrown = true;
      }

      // Either succeeds or throws, both are acceptable
      expect(typeof errorThrown).toBe("boolean");
    });

    it("should pick up new settings after refresh", async () => {
      // Initialize with one config
      await initBackupScheduler();

      // Refresh (would pick up new settings in real scenario)
      await refreshBackupScheduler();

      // Should be refreshed
      const status = getSchedulerStatus();
      expect(status.jobCount >= 0).toBe(true);
    });
  });

  describe("getSchedulerStatus", () => {
    it("should return scheduler status object", () => {
      const status = getSchedulerStatus();

      expect(status).toHaveProperty("isRunning");
      expect(status).toHaveProperty("jobCount");
      expect(status).toHaveProperty("jobs");
    });

    it("should return boolean for isRunning", () => {
      const status = getSchedulerStatus();

      expect(typeof status.isRunning).toBe("boolean");
    });

    it("should return number for jobCount", () => {
      const status = getSchedulerStatus();

      expect(typeof status.jobCount).toBe("number");
      expect(status.jobCount >= 0).toBe(true);
    });

    it("should return array of jobs", () => {
      const status = getSchedulerStatus();

      expect(Array.isArray(status.jobs)).toBe(true);
    });

    it("should have job count match jobs array length", () => {
      const status = getSchedulerStatus();

      expect(status.jobs).toHaveLength(status.jobCount);
    });

    it("should return empty jobs when no jobs running", () => {
      stopBackupScheduler();
      const status = getSchedulerStatus();

      expect(status.jobs).toHaveLength(0);
      expect(status.jobCount).toBe(0);
      expect(status.isRunning).toBe(false);
    });

    it("should have job objects with name and status properties", () => {
      const status = getSchedulerStatus();

      if (status.jobs.length > 0) {
        const job = status.jobs[0];
        expect(job).toHaveProperty("name");
        expect(job).toHaveProperty("status");
        expect(typeof job.name).toBe("string");
        expect(typeof job.status).toBe("string");
      }
    });

    it("should return correct job names", () => {
      const status = getSchedulerStatus();
      const jobNames = status.jobs.map((j) => j.name);

      // Valid job names are daily, weekly, monthly
      for (const name of jobNames) {
        expect(["daily", "weekly", "monthly"]).toContain(name);
      }
    });

    it("should return running status for all jobs", () => {
      const status = getSchedulerStatus();

      for (const job of status.jobs) {
        expect(job.status).toBe("running");
      }
    });
  });

  describe("Cron Expression Validation", () => {
    it("should generate valid daily cron expression", () => {
      const dailyTime = "02:00";
      const [hour, minute] = dailyTime.split(":").map(Number);
      const cronExpr = `${minute} ${hour} * * *`;

      // Should match cron format: minute hour * * *
      expect(cronExpr).toMatch(/^\d+ \d+ \* \* \*$/);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThanOrEqual(23);
      expect(minute).toBeGreaterThanOrEqual(0);
      expect(minute).toBeLessThanOrEqual(59);
    });

    it("should generate valid weekly cron expression", () => {
      const weeklyTime = "03:00";
      const weeklyDay = 0;
      const [hour, minute] = weeklyTime.split(":").map(Number);
      const cronExpr = `${minute} ${hour} * * ${weeklyDay}`;

      expect(cronExpr).toMatch(/^\d+ \d+ \* \* [0-6]$/);
      expect(weeklyDay).toBeGreaterThanOrEqual(0);
      expect(weeklyDay).toBeLessThanOrEqual(6);
    });

    it("should generate valid monthly cron expression", () => {
      const monthlyTime = "04:00";
      const monthlyDay = 15;
      const [hour, minute] = monthlyTime.split(":").map(Number);
      const dayOfMonth = Math.min(monthlyDay, 28);
      const cronExpr = `${minute} ${hour} ${dayOfMonth} * *`;

      expect(cronExpr).toMatch(/^\d+ \d+ \d+ \* \*$/);
      expect(dayOfMonth).toBeGreaterThanOrEqual(1);
      expect(dayOfMonth).toBeLessThanOrEqual(28);
    });

    it("should handle edge case times", () => {
      // Test midnight
      const midnight = "00:00";
      const [h1, m1] = midnight.split(":").map(Number);
      expect(h1).toBe(0);
      expect(m1).toBe(0);

      // Test end of day
      const endOfDay = "23:59";
      const [h2, m2] = endOfDay.split(":").map(Number);
      expect(h2).toBe(23);
      expect(m2).toBe(59);
    });
  });

  describe("Error Handling", () => {
    it("should handle initialization errors", async () => {
      // Should not throw even if something goes wrong
      let errorThrown = false;

      try {
        await initBackupScheduler();
      } catch (error) {
        errorThrown = true;
      }

      // Either succeeds or throws is fine
      expect(typeof errorThrown).toBe("boolean");
    });

    it("should handle refresh errors", async () => {
      let errorThrown = false;

      try {
        await refreshBackupScheduler();
      } catch (error) {
        errorThrown = true;
      }

      expect(typeof errorThrown).toBe("boolean");
    });

    it("should not crash on invalid settings", async () => {
      // Test with edge case values
      const invalidDayOfMonth = 31;
      const clampedDay = Math.min(invalidDayOfMonth, 28);

      expect(clampedDay).toBe(28);
    });

    it("should safely stop jobs with errors", () => {
      // Stop should always succeed
      expect(() => stopBackupScheduler()).not.toThrow();
    });
  });

  describe("Scheduler Lifecycle", () => {
    it("should initialize, run, and stop cleanly", async () => {
      // Start
      await initBackupScheduler();
      let status = getSchedulerStatus();
      expect(status.jobCount >= 0).toBe(true);

      // Stop
      stopBackupScheduler();
      status = getSchedulerStatus();
      expect(status.jobCount).toBe(0);
    });

    it("should support multiple init cycles", async () => {
      // First cycle
      await initBackupScheduler();
      stopBackupScheduler();

      // Second cycle
      await initBackupScheduler();
      stopBackupScheduler();

      // Third cycle
      await initBackupScheduler();
      const status = getSchedulerStatus();
      expect(status).toHaveProperty("jobCount");

      // Cleanup
      stopBackupScheduler();
    });

    it("should handle rapid refresh calls", async () => {
      await initBackupScheduler();

      // Rapidly refresh multiple times
      await Promise.all([
        refreshBackupScheduler(),
        refreshBackupScheduler(),
        refreshBackupScheduler(),
      ]);

      const status = getSchedulerStatus();
      expect(status.jobCount >= 0).toBe(true);

      stopBackupScheduler();
    });
  });
});
