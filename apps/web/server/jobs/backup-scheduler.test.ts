/**
 * Unit tests for backup scheduler
 *
 * Tests scheduler initialization, job creation, and management
 */

import { describe, it, expect, mock, afterEach, beforeEach } from "bun:test";

// Mock settings type
type MockSettings = {
  id: string;
  dailyEnabled: boolean;
  dailyTime: string;
  weeklyEnabled: boolean;
  weeklyTime: string;
  weeklyDay: number;
  monthlyEnabled: boolean;
  monthlyTime: string;
  monthlyDay: number;
} | null;

// Track mock calls
let mockSettingsResult: MockSettings = null;
const mockPerformBackup = mock(async () => "backup-1");

// Mock the modules with Drizzle-style chainable queries
mock.module("../db", () => {
  // Create chainable mock for select().from().limit()
  const createSelectChain = () => ({
    from: () => ({
      limit: () =>
        Promise.resolve(mockSettingsResult ? [mockSettingsResult] : []),
    }),
  });

  return {
    db: {
      select: createSelectChain,
    },
    drizzleSchema: {
      backupSettings: {},
    },
  };
});

mock.module("./backup-job", () => ({
  performBackup: mockPerformBackup,
}));

// Import after mocks are set up
import {
  initBackupScheduler,
  stopBackupScheduler,
  refreshBackupScheduler,
  getSchedulerStatus,
} from "./backup-scheduler";

describe("Backup Scheduler", () => {
  beforeEach(() => {
    mockSettingsResult = null;
    mockPerformBackup.mockReset();
  });

  afterEach(() => {
    stopBackupScheduler();
  });

  describe("initBackupScheduler", () => {
    it("should create no jobs when no settings exist", async () => {
      mockSettingsResult = null;

      await initBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(0);
      expect(status.isRunning).toBe(false);
    });

    it("should create daily job when daily backup is enabled", async () => {
      mockSettingsResult = {
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:30",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      };

      await initBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(1);
      expect(status.isRunning).toBe(true);
      expect(status.jobs.some((j) => j.name === "daily")).toBe(true);
    });

    it("should create weekly job when weekly backup is enabled", async () => {
      mockSettingsResult = {
        id: "settings-1",
        dailyEnabled: false,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      };

      await initBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(1);
      expect(status.jobs.some((j) => j.name === "weekly")).toBe(true);
    });

    it("should create monthly job when monthly backup is enabled", async () => {
      mockSettingsResult = {
        id: "settings-1",
        dailyEnabled: false,
        dailyTime: "02:00",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: true,
        monthlyTime: "04:00",
        monthlyDay: 15,
      };

      await initBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(1);
      expect(status.jobs.some((j) => j.name === "monthly")).toBe(true);
    });

    it("should create all jobs when all schedules are enabled", async () => {
      mockSettingsResult = {
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: true,
        monthlyTime: "04:00",
        monthlyDay: 15,
      };

      await initBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(3);
      expect(status.jobs.some((j) => j.name === "daily")).toBe(true);
      expect(status.jobs.some((j) => j.name === "weekly")).toBe(true);
      expect(status.jobs.some((j) => j.name === "monthly")).toBe(true);
    });

    it("should stop existing jobs before reinitializing", async () => {
      mockSettingsResult = {
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      };

      await initBackupScheduler();
      expect(getSchedulerStatus().jobCount).toBe(1);

      // Reinitialize - should still have 1 job, not 2
      await initBackupScheduler();
      expect(getSchedulerStatus().jobCount).toBe(1);
    });
  });

  describe("stopBackupScheduler", () => {
    it("should stop all running jobs", async () => {
      mockSettingsResult = {
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      };

      await initBackupScheduler();
      expect(getSchedulerStatus().jobCount).toBe(2);

      stopBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(0);
      expect(status.isRunning).toBe(false);
      expect(status.jobs).toHaveLength(0);
    });

    it("should be safe to call when no jobs exist", () => {
      expect(() => stopBackupScheduler()).not.toThrow();
      expect(getSchedulerStatus().jobCount).toBe(0);
    });

    it("should be idempotent (multiple calls are safe)", () => {
      stopBackupScheduler();
      stopBackupScheduler();
      stopBackupScheduler();

      expect(getSchedulerStatus().jobCount).toBe(0);
    });
  });

  describe("refreshBackupScheduler", () => {
    it("should reinitialize with current settings", async () => {
      mockSettingsResult = {
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      };

      await refreshBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(1);
      expect(status.jobs.some((j) => j.name === "daily")).toBe(true);
    });

    it("should pick up changed settings", async () => {
      // Start with daily only
      mockSettingsResult = {
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      };

      await initBackupScheduler();
      expect(getSchedulerStatus().jobCount).toBe(1);

      // Change to weekly only
      mockSettingsResult = {
        id: "settings-1",
        dailyEnabled: false,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      };

      await refreshBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(1);
      expect(status.jobs.some((j) => j.name === "weekly")).toBe(true);
      expect(status.jobs.some((j) => j.name === "daily")).toBe(false);
    });
  });

  describe("getSchedulerStatus", () => {
    it("should return correct structure", () => {
      const status = getSchedulerStatus();

      expect(status).toHaveProperty("isRunning");
      expect(status).toHaveProperty("jobCount");
      expect(status).toHaveProperty("jobs");
      expect(typeof status.isRunning).toBe("boolean");
      expect(typeof status.jobCount).toBe("number");
      expect(Array.isArray(status.jobs)).toBe(true);
    });

    it("should have job count match jobs array length", async () => {
      mockSettingsResult = {
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      };

      await initBackupScheduler();
      const status = getSchedulerStatus();

      expect(status.jobs).toHaveLength(status.jobCount);
    });

    it("should return job objects with name and status", async () => {
      mockSettingsResult = {
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      };

      await initBackupScheduler();
      const status = getSchedulerStatus();

      expect(status.jobs.length).toBeGreaterThan(0);
      const job = status.jobs[0];
      expect(job).toHaveProperty("name");
      expect(job).toHaveProperty("status");
      expect(job.name).toBe("daily");
      expect(job.status).toBe("running");
    });
  });
});
