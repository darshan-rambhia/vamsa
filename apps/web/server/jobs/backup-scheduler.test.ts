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
const mockFindFirst = mock<() => Promise<MockSettings>>(async () => null);
const mockPerformBackup = mock(async () => "backup-1");

// Mock the modules
// Note: This mock provides basic functionality for backup-scheduler tests
// but other test files that import ../db will also get this mock, so we need
// to ensure all necessary Prisma models are available
mock.module("../db", () => ({
  prisma: {
    backupSettings: {
      findFirst: mockFindFirst,
    },
    backup: {
      create: mock(async (args: any) => ({
        id: "backup-1",
        filename: args.data.filename,
        type: args.data.type,
        status: args.data.status,
        location: args.data.location,
        createdAt: new Date(),
      })),
      update: mock(async (args: any) => ({
        id: args.where.id,
        status: args.data.status,
      })),
      findMany: mock(async () => []),
    },
    person: {
      findMany: mock(async () => []),
    },
    relationship: {
      findMany: mock(async () => []),
    },
    user: {
      findMany: mock(async () => []),
      create: mock(async (args: any) => ({
        id: `user-${Date.now()}`,
        email: args.data.email,
        name: args.data.name,
        role: args.data.role,
        createdAt: new Date(),
      })),
      deleteMany: mock(async () => ({})),
    },
    event: {
      findMany: mock(async () => []),
    },
    mediaObject: {
      findMany: mock(async () => []),
    },
    calendarToken: {
      create: mock(async (args: any) => ({
        id: `token-${Date.now()}`,
        userId: args.data.userId,
        token: args.data.token,
        isActive: args.data.isActive,
        expiresAt: args.data.expiresAt,
        createdAt: new Date(),
      })),
      findMany: mock(async () => []),
      update: mock(async (args: any) => ({
        id: args.where.id,
        ...args.data,
      })),
      deleteMany: mock(async () => ({})),
    },
  },
}));

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
    mockFindFirst.mockReset();
    mockPerformBackup.mockReset();
    mockFindFirst.mockImplementation(async () => null);
  });

  afterEach(() => {
    stopBackupScheduler();
  });

  describe("initBackupScheduler", () => {
    it("should create no jobs when no settings exist", async () => {
      mockFindFirst.mockImplementation(async () => null);

      await initBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(0);
      expect(status.isRunning).toBe(false);
    });

    it("should create daily job when daily backup is enabled", async () => {
      mockFindFirst.mockImplementation(async () => ({
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:30",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      }));

      await initBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(1);
      expect(status.isRunning).toBe(true);
      expect(status.jobs.some((j) => j.name === "daily")).toBe(true);
    });

    it("should create weekly job when weekly backup is enabled", async () => {
      mockFindFirst.mockImplementation(async () => ({
        id: "settings-1",
        dailyEnabled: false,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      }));

      await initBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(1);
      expect(status.jobs.some((j) => j.name === "weekly")).toBe(true);
    });

    it("should create monthly job when monthly backup is enabled", async () => {
      mockFindFirst.mockImplementation(async () => ({
        id: "settings-1",
        dailyEnabled: false,
        dailyTime: "02:00",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: true,
        monthlyTime: "04:00",
        monthlyDay: 15,
      }));

      await initBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(1);
      expect(status.jobs.some((j) => j.name === "monthly")).toBe(true);
    });

    it("should create all jobs when all schedules are enabled", async () => {
      mockFindFirst.mockImplementation(async () => ({
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: true,
        monthlyTime: "04:00",
        monthlyDay: 15,
      }));

      await initBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(3);
      expect(status.jobs.some((j) => j.name === "daily")).toBe(true);
      expect(status.jobs.some((j) => j.name === "weekly")).toBe(true);
      expect(status.jobs.some((j) => j.name === "monthly")).toBe(true);
    });

    it("should stop existing jobs before reinitializing", async () => {
      mockFindFirst.mockImplementation(async () => ({
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      }));

      await initBackupScheduler();
      expect(getSchedulerStatus().jobCount).toBe(1);

      // Reinitialize - should still have 1 job, not 2
      await initBackupScheduler();
      expect(getSchedulerStatus().jobCount).toBe(1);
    });
  });

  describe("stopBackupScheduler", () => {
    it("should stop all running jobs", async () => {
      mockFindFirst.mockImplementation(async () => ({
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      }));

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
      mockFindFirst.mockImplementation(async () => ({
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      }));

      await refreshBackupScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBe(1);
      expect(status.jobs.some((j) => j.name === "daily")).toBe(true);
    });

    it("should pick up changed settings", async () => {
      // Start with daily only
      mockFindFirst.mockImplementation(async () => ({
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      }));

      await initBackupScheduler();
      expect(getSchedulerStatus().jobCount).toBe(1);

      // Change to weekly only
      mockFindFirst.mockImplementation(async () => ({
        id: "settings-1",
        dailyEnabled: false,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      }));

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
      mockFindFirst.mockImplementation(async () => ({
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      }));

      await initBackupScheduler();
      const status = getSchedulerStatus();

      expect(status.jobs).toHaveLength(status.jobCount);
    });

    it("should return job objects with name and status", async () => {
      mockFindFirst.mockImplementation(async () => ({
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: false,
        weeklyTime: "03:00",
        weeklyDay: 0,
        monthlyEnabled: false,
        monthlyTime: "04:00",
        monthlyDay: 1,
      }));

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
