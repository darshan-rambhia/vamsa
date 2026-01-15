/**
 * Unit tests for calendar token functionality
 * Tests: Token creation, updates, retrieval, lifecycle, rotation logic, and helpers
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";

// Note: LOG_LEVEL=error is used in test command to silence logger warnings
import { prisma } from "../../src/server/db";
import { Prisma } from "@vamsa/api";
import { addDays, subDays, differenceInDays } from "date-fns";
import crypto from "crypto";
import {
  generateSecureToken,
  rotateToken,
  revokeToken,
  enforceRotationPolicy,
} from "./token-rotation";

// --- Helpers ---

/**
 * Create a valid, non-expired, active calendar token
 */
async function createValidToken(
  userId: string,
  overrides?: Partial<Prisma.CalendarTokenUncheckedCreateInput>
) {
  return prisma.calendarToken.create({
    data: {
      userId,
      token: crypto.randomBytes(32).toString("base64url"),
      isActive: true,
      expiresAt: addDays(new Date(), 365),
      rotationPolicy: "annual",
      ...overrides,
    },
  });
}

/**
 * Create a token N days old
 */
async function createTokenWithAge(
  userId: string,
  days: number,
  overrides?: Partial<Prisma.CalendarTokenUncheckedCreateInput>
) {
  return prisma.calendarToken.create({
    data: {
      userId,
      token: crypto.randomBytes(32).toString("base64url"),
      isActive: true,
      expiresAt: addDays(new Date(), 365 - days),
      createdAt: subDays(new Date(), days),
      rotationPolicy: "annual",
      ...overrides,
    },
  });
}

/**
 * Create a test user
 */
async function createTestUser(overrides?: Partial<Prisma.UserCreateInput>) {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}-${crypto.randomUUID()}@example.com`,
      name: "Test User",
      role: "MEMBER",
      ...overrides,
    },
  });
}

/**
 * Create an admin user
 */
async function createAdminUser(overrides?: Partial<Prisma.UserCreateInput>) {
  return prisma.user.create({
    data: {
      email: `admin-${Date.now()}-${crypto.randomUUID()}@example.com`,
      name: "Admin User",
      role: "ADMIN",
      ...overrides,
    },
  });
}

/**
 * Clean up test data
 */
async function cleanupTestData(userId: string) {
  try {
    await prisma.calendarToken.deleteMany({ where: { userId } });
  } catch (_e) {
    // ignore
  }

  try {
    await prisma.user.deleteMany({ where: { id: userId } });
  } catch (_e) {
    // ignore
  }
}

// --- Tests ---

describe("Calendar Token Tests", () => {
  let testUser: any;
  let adminUser: any;

  beforeEach(async () => {
    testUser = await createTestUser();
    adminUser = await createAdminUser();
  });

  afterEach(async () => {
    if (testUser) {
      await cleanupTestData(testUser.id);
    }
    if (adminUser) {
      await cleanupTestData(adminUser.id);
    }
  });

  describe("Database Operations", () => {
    describe("Token Retrieval", () => {
      it("should retrieve only user's own tokens", async () => {
        const token1 = await createValidToken(testUser.id, { name: "Token 1" });
        const token2 = await createValidToken(testUser.id, { name: "Token 2" });

        const tokens = await prisma.calendarToken.findMany({
          where: { userId: testUser.id },
        });

        expect(tokens.length).toBe(2);
        expect(tokens.map((t: any) => t.id).sort()).toEqual(
          [token1.id, token2.id].sort()
        );
      });

      it("should not retrieve other user's tokens", async () => {
        const token1 = await createValidToken(testUser.id);
        const user2 = await createTestUser();
        const _token2 = await createValidToken(user2.id);

        const tokens = await prisma.calendarToken.findMany({
          where: { userId: testUser.id },
        });

        expect(tokens.length).toBe(1);
        expect(tokens[0].id).toBe(token1.id);

        await cleanupTestData(user2.id);
      });

      it("should include all token fields", async () => {
        const token = await createValidToken(testUser.id, {
          name: "Complete Token",
        });

        const retrieved = await prisma.calendarToken.findUnique({
          where: { id: token.id },
        });

        expect(retrieved).toHaveProperty("id");
        expect(retrieved).toHaveProperty("userId");
        expect(retrieved).toHaveProperty("token");
        expect(retrieved).toHaveProperty("name");
        expect(retrieved).toHaveProperty("isActive");
        expect(retrieved).toHaveProperty("createdAt");
        expect(retrieved).toHaveProperty("expiresAt");
        expect(retrieved).toHaveProperty("lastUsedAt");
        expect(retrieved).toHaveProperty("rotationPolicy");
      });

      it("should return empty array for user with no tokens", async () => {
        const user = await createTestUser();
        const tokens = await prisma.calendarToken.findMany({
          where: { userId: user.id },
        });

        expect(tokens.length).toBe(0);

        await cleanupTestData(user.id);
      });

      it("should include inactive tokens", async () => {
        const _token1 = await createValidToken(testUser.id, {
          isActive: true,
        });
        const _token2 = await createValidToken(testUser.id, {
          isActive: false,
        });

        const tokens = await prisma.calendarToken.findMany({
          where: { userId: testUser.id },
        });

        expect(tokens.length).toBe(2);
      });

      it("should include expired tokens", async () => {
        const _token1 = await createValidToken(testUser.id);
        const _token2 = await createValidToken(testUser.id, {
          expiresAt: new Date(Date.now() - 1000),
        });

        const tokens = await prisma.calendarToken.findMany({
          where: { userId: testUser.id },
        });

        expect(tokens.length).toBe(2);
      });
    });

    describe("Token Creation", () => {
      it("should create token with provided name", async () => {
        const token = await prisma.calendarToken.create({
          data: {
            userId: testUser.id,
            token: crypto.randomBytes(32).toString("base64url"),
            name: "iPhone Calendar",
            rotationPolicy: "annual",
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
          },
        });

        expect(token.name).toBe("iPhone Calendar");
      });

      it("should create token without name", async () => {
        const token = await prisma.calendarToken.create({
          data: {
            userId: testUser.id,
            token: crypto.randomBytes(32).toString("base64url"),
            rotationPolicy: "annual",
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
          },
        });

        expect(token.name).toBeNull();
      });

      it("should create active tokens", async () => {
        const token = await prisma.calendarToken.create({
          data: {
            userId: testUser.id,
            token: crypto.randomBytes(32).toString("base64url"),
            isActive: true,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        expect(token.isActive).toBe(true);
      });

      it("should associate token with user", async () => {
        const token = await prisma.calendarToken.create({
          data: {
            userId: testUser.id,
            token: crypto.randomBytes(32).toString("base64url"),
            isActive: true,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        expect(token.userId).toBe(testUser.id);
      });

      it("should allow multiple tokens per user", async () => {
        const _token1 = await prisma.calendarToken.create({
          data: {
            userId: testUser.id,
            token: crypto.randomBytes(32).toString("base64url"),
            isActive: true,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        const _token2 = await prisma.calendarToken.create({
          data: {
            userId: testUser.id,
            token: crypto.randomBytes(32).toString("base64url"),
            isActive: true,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        const tokens = await prisma.calendarToken.findMany({
          where: { userId: testUser.id },
        });

        expect(tokens.length).toBe(2);
      });
    });

    describe("Token Updates", () => {
      it("should update token name", async () => {
        const token = await createValidToken(testUser.id, { name: "Old Name" });

        await prisma.calendarToken.update({
          where: { id: token.id },
          data: { name: "New Name" },
        });

        const updated = await prisma.calendarToken.findUnique({
          where: { id: token.id },
        });

        expect(updated?.name).toBe("New Name");
      });

      it("should mark token as inactive", async () => {
        const token = await createValidToken(testUser.id);

        await prisma.calendarToken.update({
          where: { id: token.id },
          data: { isActive: false },
        });

        const revoked = await prisma.calendarToken.findUnique({
          where: { id: token.id },
        });

        expect(revoked?.isActive).toBe(false);
      });

      it("should update last used timestamp", async () => {
        const token = await createValidToken(testUser.id);

        const now = new Date();
        await prisma.calendarToken.update({
          where: { id: token.id },
          data: { lastUsedAt: now },
        });

        const updated = await prisma.calendarToken.findUnique({
          where: { id: token.id },
        });

        expect(updated?.lastUsedAt).toBeTruthy();
      });

      it("should preserve other fields when updating name", async () => {
        const token = await createValidToken(testUser.id, {
          name: "Original",
          rotationPolicy: "annual",
        });

        await prisma.calendarToken.update({
          where: { id: token.id },
          data: { name: "Updated" },
        });

        const updated = await prisma.calendarToken.findUnique({
          where: { id: token.id },
        });

        expect(updated?.name).toBe("Updated");
        expect(updated?.rotationPolicy).toBe("annual");
        expect(updated?.isActive).toBe(true);
      });
    });

    describe("Admin Token Queries", () => {
      it("should retrieve all tokens across users", async () => {
        const _token1 = await createValidToken(testUser.id);
        const user2 = await createTestUser();
        const _token2 = await createValidToken(user2.id);

        const allTokens = await prisma.calendarToken.findMany({
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        });

        expect(allTokens.length).toBeGreaterThanOrEqual(2);

        await cleanupTestData(user2.id);
      });

      it("should include user information with tokens", async () => {
        const token = await createValidToken(testUser.id);

        const tokens = await prisma.calendarToken.findMany({
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
          where: { id: token.id },
        });

        expect(tokens[0].user.id).toBe(testUser.id);
        expect(tokens[0].user.email).toBeTruthy();
      });

      it("should support filtering by user", async () => {
        const _token1 = await createValidToken(testUser.id);
        const user2 = await createTestUser();
        const _token2 = await createValidToken(user2.id);

        const userTokens = await prisma.calendarToken.findMany({
          where: { userId: testUser.id },
        });

        expect(userTokens.every((t: any) => t.userId === testUser.id)).toBe(
          true
        );

        await cleanupTestData(user2.id);
      });

      it("should support filtering by status", async () => {
        const _activeToken = await createValidToken(testUser.id);
        const _inactiveToken = await createValidToken(testUser.id, {
          isActive: false,
        });

        const active = await prisma.calendarToken.findMany({
          where: { userId: testUser.id, isActive: true },
        });

        expect(active.every((t: any) => t.isActive === true)).toBe(true);
        expect(active.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe("Token Lifecycle", () => {
      it("should support token rotation pattern", async () => {
        const token1 = await createValidToken(testUser.id);

        const token2 = await prisma.calendarToken.create({
          data: {
            userId: testUser.id,
            token: crypto.randomBytes(32).toString("base64url"),
            rotatedFrom: token1.id,
            rotatedAt: new Date(),
            isActive: true,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

        expect(token2.rotatedFrom).toBe(token1.id);
      });

      it("should allow multiple tokens with different policies", async () => {
        const _token1 = await createValidToken(testUser.id, {
          rotationPolicy: "on_password_change",
        });
        const _token2 = await createValidToken(testUser.id, {
          rotationPolicy: "annual",
        });
        const _token3 = await createValidToken(testUser.id, {
          rotationPolicy: "manual",
        });

        const tokens = await prisma.calendarToken.findMany({
          where: { userId: testUser.id },
        });

        const policies = tokens.map((t: any) => t.rotationPolicy);
        expect(policies).toContain("on_password_change");
        expect(policies).toContain("annual");
        expect(policies).toContain("manual");
      });
    });
  });

  describe("Rotation Logic", () => {
    describe("generateSecureToken", () => {
      it("should generate unique tokens", () => {
        const token1 = generateSecureToken();
        const token2 = generateSecureToken();

        expect(token1).not.toBe(token2);
      });

      it("should generate base64url-encoded tokens", () => {
        const token = generateSecureToken();

        // Base64url characters only: A-Z, a-z, 0-9, -, _
        const base64urlRegex = /^[A-Za-z0-9_-]+$/;
        expect(base64urlRegex.test(token)).toBe(true);
      });

      it("should generate tokens of consistent length", () => {
        const token1 = generateSecureToken();
        const token2 = generateSecureToken();
        const token3 = generateSecureToken();

        expect(token1.length).toBe(token2.length);
        expect(token2.length).toBe(token3.length);
      });

      it("should generate cryptographically random tokens", () => {
        const tokens = Array.from({ length: 100 }, () => generateSecureToken());

        // All tokens should be unique
        const uniqueTokens = new Set(tokens);
        expect(uniqueTokens.size).toBe(100);
      });

      it("should generate tokens with sufficient entropy", () => {
        const token = generateSecureToken();

        // 32 bytes = 256 bits of entropy
        // Base64url encoding: 32 bytes = ~43 characters
        expect(token.length).toBeGreaterThanOrEqual(40);
      });
    });

    describe("rotateToken", () => {
      it("should create new token with same settings", async () => {
        const oldToken = await createValidToken(testUser.id, {
          name: "Test Token",
          rotationPolicy: "annual",
        });

        const newToken = await rotateToken(oldToken.id);

        expect(newToken.name).toBe("Test Token");
        expect(newToken.rotationPolicy).toBe("annual");
        expect(newToken.userId).toBe(oldToken.userId);
      });

      it("should preserve token name on rotation", async () => {
        const oldToken = await createValidToken(testUser.id, {
          name: "iPhone Calendar",
        });

        const newToken = await rotateToken(oldToken.id);

        expect(newToken.name).toBe("iPhone Calendar");
      });

      it("should preserve token policy on rotation", async () => {
        const oldToken = await createValidToken(testUser.id, {
          rotationPolicy: "on_password_change",
        });

        const newToken = await rotateToken(oldToken.id);

        expect(newToken.rotationPolicy).toBe("on_password_change");
      });

      it("should mark new token as active", async () => {
        const oldToken = await createValidToken(testUser.id);

        const newToken = await rotateToken(oldToken.id);

        expect(newToken.isActive).toBe(true);
      });

      it("should set new token expiration to 1 year", async () => {
        const oldToken = await createValidToken(testUser.id);

        const newToken = await rotateToken(oldToken.id);

        const daysUntilExpiry = differenceInDays(
          newToken.expiresAt,
          new Date()
        );

        // Should be approximately 365 days (allow some drift)
        expect(daysUntilExpiry).toBeGreaterThanOrEqual(360);
        expect(daysUntilExpiry).toBeLessThanOrEqual(366);
      });

      it("should set rotatedFrom reference", async () => {
        const oldToken = await createValidToken(testUser.id);

        const newToken = await rotateToken(oldToken.id);

        expect(newToken.rotatedFrom).toBe(oldToken.id);
      });

      it("should set rotatedAt timestamp", async () => {
        const oldToken = await createValidToken(testUser.id);

        const beforeRotation = new Date();
        const newToken = await rotateToken(oldToken.id);
        const afterRotation = new Date();

        expect(newToken.rotatedAt).toBeTruthy();
        expect(newToken.rotatedAt! >= beforeRotation).toBe(true);
        expect(newToken.rotatedAt! <= afterRotation).toBe(true);
      });

      it("should set 30-day grace period on old token", async () => {
        const oldToken = await createValidToken(testUser.id);

        await rotateToken(oldToken.id);

        const updated = await prisma.calendarToken.findUnique({
          where: { id: oldToken.id },
        });

        const daysUntilExpiry = differenceInDays(
          updated!.expiresAt,
          new Date()
        );

        // Should be approximately 30 days
        expect(daysUntilExpiry).toBeGreaterThanOrEqual(29);
        expect(daysUntilExpiry).toBeLessThanOrEqual(31);
      });

      it("should keep old token active during grace period", async () => {
        const oldToken = await createValidToken(testUser.id);

        await rotateToken(oldToken.id);

        const updated = await prisma.calendarToken.findUnique({
          where: { id: oldToken.id },
        });

        expect(updated?.isActive).toBe(true);
      });

      it("should mark old token with (rotated) suffix", async () => {
        const oldToken = await createValidToken(testUser.id, {
          name: "iPhone Calendar",
        });

        await rotateToken(oldToken.id);

        const updated = await prisma.calendarToken.findUnique({
          where: { id: oldToken.id },
        });

        expect(updated?.name).toContain("rotated");
      });

      it("should create audit trail via rotatedFrom field", async () => {
        const token1 = await createValidToken(testUser.id);
        const token2 = await rotateToken(token1.id);
        const token3 = await rotateToken(token2.id);

        const t3 = await prisma.calendarToken.findUnique({
          where: { id: token3.id },
        });

        expect(t3?.rotatedFrom).toBe(token2.id);

        const t2 = await prisma.calendarToken.findUnique({
          where: { id: token2.id },
        });

        expect(t2?.rotatedFrom).toBe(token1.id);
      });

      it("should generate new unique token", async () => {
        const oldToken = await createValidToken(testUser.id);

        const newToken = await rotateToken(oldToken.id);

        expect(newToken.token).not.toBe(oldToken.token);
      });

      it("should preserve scopes on rotation", async () => {
        const oldToken = await createValidToken(testUser.id);

        const newToken = await rotateToken(oldToken.id);

        expect(newToken.scopes).toEqual(oldToken.scopes);
      });
    });

    describe("revokeToken", () => {
      it("should immediately expire token", async () => {
        const token = await createValidToken(testUser.id);

        await revokeToken(token.id);

        const revoked = await prisma.calendarToken.findUnique({
          where: { id: token.id },
        });

        // Check if expiration is now or in the past (allow small drift)
        expect(revoked?.expiresAt.getTime()).toBeLessThanOrEqual(
          new Date().getTime() + 1000
        );
      });

      it("should mark token as inactive", async () => {
        const token = await createValidToken(testUser.id);

        await revokeToken(token.id);

        const revoked = await prisma.calendarToken.findUnique({
          where: { id: token.id },
        });

        expect(revoked?.isActive).toBe(false);
      });
    });

    describe("enforceRotationPolicy", () => {
      it("should auto-rotate old annual tokens", async () => {
        const oldToken = await createTokenWithAge(testUser.id, 400, {
          rotationPolicy: "annual",
        });

        await enforceRotationPolicy(testUser.id, "annual_check");

        const rotated = await prisma.calendarToken.findFirst({
          where: { rotatedFrom: oldToken.id },
        });

        expect(rotated).toBeTruthy();
        expect(rotated?.isActive).toBe(true);
      });

      it("should not rotate recent annual tokens", async () => {
        const recentToken = await createTokenWithAge(testUser.id, 100, {
          rotationPolicy: "annual",
        });

        await enforceRotationPolicy(testUser.id, "annual_check");

        const rotated = await prisma.calendarToken.findFirst({
          where: { rotatedFrom: recentToken.id },
        });

        expect(rotated).toBeNull();
      });

      it("should rotate tokens on password change", async () => {
        const token = await createValidToken(testUser.id, {
          rotationPolicy: "on_password_change",
        });

        await enforceRotationPolicy(testUser.id, "password_change");

        const rotated = await prisma.calendarToken.findFirst({
          where: { rotatedFrom: token.id },
        });

        expect(rotated).toBeTruthy();
      });

      it("should not rotate manual tokens automatically", async () => {
        const token = await createTokenWithAge(testUser.id, 400, {
          rotationPolicy: "manual",
        });

        await enforceRotationPolicy(testUser.id, "annual_check");
        await enforceRotationPolicy(testUser.id, "password_change");

        const rotated = await prisma.calendarToken.findFirst({
          where: { rotatedFrom: token.id },
        });

        expect(rotated).toBeNull();
      });
    });
  });
});
